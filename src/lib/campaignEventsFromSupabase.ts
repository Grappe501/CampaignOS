/**
 * Live campaign event queries and mutations (replaces dev fixture queue source).
 */

import { supabase } from './supabaseClient'
import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { mapCampaignEventRowToCalendarRecord } from './campaignEventRowMapper'
import {
  buildVolunteerEventSubmissionPayload,
  createEventFromTemplate,
} from './campaignEventDomainServices'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { seedEventTasksIfEmpty } from './campaignEventTasksDb'
import { recomputeAndPersistEventReadiness } from './campaignEventReadinessPersistence'
import { CAMPAIGN_EVENT_LIST_SELECT } from './campaignEventsColumns'

export { CAMPAIGN_EVENT_LIST_SELECT }

const EVENT_SELECT = CAMPAIGN_EVENT_LIST_SELECT

export type FetchCampaignEventsResult = {
  events: CampaignCalendarEventRecord[]
  error: Error | null
}

export async function fetchCampaignEventsForCampaign(campaignId = 'default'): Promise<FetchCampaignEventsResult> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select(EVENT_SELECT)
    .eq('campaign_id', campaignId)
    .order('start_at', { ascending: true })

  if (error) {
    return { events: [], error: new Error(error.message) }
  }

  return {
    events: (data ?? []).map((r) =>
      mapCampaignEventRowToCalendarRecord(r as unknown as Record<string, unknown>),
    ),
    error: null,
  }
}

export async function fetchCountyEvents(countyId: string): Promise<FetchCampaignEventsResult> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select(EVENT_SELECT)
    .eq('county_id', countyId)
    .order('start_at', { ascending: true })

  if (error) {
    return { events: [], error: new Error(error.message) }
  }

  return {
    events: (data ?? []).map((r) =>
      mapCampaignEventRowToCalendarRecord(r as unknown as Record<string, unknown>),
    ),
    error: null,
  }
}

export async function fetchCampaignEventById(eventId: string): Promise<{
  event: CampaignCalendarEventRecord | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle()

  if (error) {
    return { event: null, error: new Error(error.message) }
  }
  if (!data) {
    return { event: null, error: null }
  }

  return {
    event: mapCampaignEventRowToCalendarRecord(data as unknown as Record<string, unknown>),
    error: null,
  }
}

export async function insertCampaignEventFromTemplate(input: {
  templateKey: CampaignEventTypeKey
  payload: ReturnType<typeof createEventFromTemplate>
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('campaign_events')
    .insert(input.payload)
    .select('id,start_at,event_type')
    .single()

  if (error) {
    return { id: null, error: new Error(error.message) }
  }

  const row = data as { id: string; start_at: string; event_type: string }
  try {
    await seedEventTasksIfEmpty(row.id, input.templateKey, row.start_at)
    const { data: fullRow } = await supabase
      .from('campaign_events')
      .select(EVENT_SELECT)
      .eq('id', row.id)
      .single()
    if (fullRow) {
      await recomputeAndPersistEventReadiness(row.id, {
        eventType: input.templateKey,
        row: fullRow as unknown as Record<string, unknown>,
      })
    }
  } catch (e) {
    return {
      id: row.id,
      error: e instanceof Error ? e : new Error('Event saved but workflow seed failed'),
    }
  }

  return { id: row.id, error: null }
}

export async function insertVolunteerEventSubmission(input: {
  templateKey: CampaignEventTypeKey
  payload: ReturnType<typeof buildVolunteerEventSubmissionPayload>
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('campaign_events')
    .insert(input.payload)
    .select('id')
    .single()

  if (error) {
    return { id: null, error: new Error(error.message) }
  }
  const row = data as { id: string }
  return { id: row.id, error: null }
}

export async function approveCampaignEventRequestRpc(
  eventId: string,
  notes?: string | null,
  conditions?: string | null,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('approve_campaign_event_request', {
    p_event_id: eventId,
    p_notes: notes ?? null,
    p_conditions: conditions != null && String(conditions).trim() !== '' ? conditions : null,
  })
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function rejectCampaignEventRequestRpc(
  eventId: string,
  notes?: string | null,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('reject_campaign_event_request', {
    p_event_id: eventId,
    p_notes: notes ?? null,
  })
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export type CheckInAttendeeInput = {
  displayName: string
  contactId?: string | null
  walkIn?: boolean
  flags: Record<string, boolean>
}

export async function insertEventAttendance(
  eventId: string,
  input: CheckInAttendeeInput,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('campaign_event_attendance').insert({
    event_id: eventId,
    contact_id: input.contactId ?? null,
    display_name: input.displayName.trim(),
    walk_in: Boolean(input.walkIn),
    flags: input.flags,
  })

  if (error) return { error: new Error(error.message) }

  try {
    const { data: fullRow, error: rowErr } = await supabase
      .from('campaign_events')
      .select(EVENT_SELECT)
      .eq('id', eventId)
      .single()
    if (rowErr || !fullRow || typeof fullRow !== 'object') return { error: null }
    const row = fullRow as unknown as Record<string, unknown>
    const et = String(row.event_type ?? '')
    if (isCampaignEventTypeKey(et)) {
      await recomputeAndPersistEventReadiness(eventId, {
        eventType: et,
        row,
      })
    }
  } catch {
    /* readiness is best-effort after check-in */
  }

  return { error: null }
}

export async function fetchEventAttendanceCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('campaign_event_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (error) return 0
  return count ?? 0
}

export type EventAttendanceAggregates = {
  totalCount: number
  issueFlagsRaised: number
  volunteerInterestFlags: number
}

export async function fetchEventAttendanceAggregates(
  eventId: string,
): Promise<EventAttendanceAggregates> {
  const { data, error } = await supabase
    .from('campaign_event_attendance')
    .select('flags')
    .eq('event_id', eventId)

  if (error || !data?.length) {
    return { totalCount: 0, issueFlagsRaised: 0, volunteerInterestFlags: 0 }
  }

  let issueFlagsRaised = 0
  let volunteerInterestFlags = 0
  for (const row of data) {
    const f = row.flags as Record<string, boolean> | null
    if (f?.issueConcern) issueFlagsRaised += 1
    if (f?.volunteerInterest) volunteerInterestFlags += 1
  }
  return {
    totalCount: data.length,
    issueFlagsRaised,
    volunteerInterestFlags,
  }
}

export async function fetchRecentEventHistoryForArea(
  countyId: string | null,
  precinctId: string | null,
  excludeEventId: string,
  limit = 5,
): Promise<readonly string[]> {
  if (!countyId) return []

  let q = supabase
    .from('campaign_events')
    .select('title,start_at,precinct_id')
    .eq('county_id', countyId)
    .neq('id', excludeEventId)
    .order('start_at', { ascending: false })
    .limit(limit * 2)

  const { data, error } = await q
  if (error || !data?.length) return []

  const rows = [...data]
  const withPrecinct = precinctId
    ? rows.filter((r) => (r as { precinct_id?: string | null }).precinct_id === precinctId)
    : rows
  const pick = (withPrecinct.length ? withPrecinct : rows).slice(0, limit)
  return pick.map((r) => {
    const t = String((r as { title?: string }).title ?? 'Event')
    const s = (r as { start_at?: string }).start_at
    const d = s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
    return d ? `${t} (${d})` : t
  })
}

export async function fetchEventFollowups(eventId: string) {
  const { data, error } = await supabase
    .from('campaign_event_followups')
    .select('id,followup_type,assigned_to,due_at,status,notes,completed_at')
    .eq('event_id', eventId)
    .order('due_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

const FOLLOWUP_TYPE_DB = [
  'thank_you',
  'volunteer',
  'donor',
  'issue',
  'host',
  'county_intel',
] as const

export async function seedDefaultFollowUpsIfEmpty(eventId: string, eventEndAtIso: string): Promise<void> {
  const { data: existing } = await supabase
    .from('campaign_event_followups')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)

  if (existing?.length) return

  const end = new Date(eventEndAtIso)
  if (Number.isNaN(end.getTime())) return

  const mk = (type: (typeof FOLLOWUP_TYPE_DB)[number], hours: number, title: string) => ({
    event_id: eventId,
    followup_type: type,
    due_at: new Date(end.getTime() + hours * 3600 * 1000).toISOString(),
    status: 'pending' as const,
    notes: title,
  })

  const rows = [
    mk('thank_you', 24, 'Thank-you to attendees'),
    mk('volunteer', 48, 'Volunteer callback'),
    mk('donor', 48, 'Donor prospect follow-up'),
    mk('issue', 72, 'Route issue themes'),
    mk('host', 24, 'Host debrief'),
    mk('county_intel', 72, 'County intelligence review'),
  ]

  const { error } = await supabase.from('campaign_event_followups').insert(rows)
  if (error) throw error
}

export async function markEventCompletedAndFollowUps(eventId: string, endAtIso: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_events')
    .update({
      operational_status: 'completed',
      status: 'completed',
    })
    .eq('id', eventId)

  if (error) throw error
  await seedDefaultFollowUpsIfEmpty(eventId, endAtIso)
}
