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
import {
  parseOutcomeStage,
  type CampaignEventOutcomeRow,
  type EventOutcomeStage,
} from './eventOutcomeDomain'

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

  const q = supabase
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

type FollowupTypeSeed =
  | 'thank_you'
  | 'volunteer'
  | 'donor'
  | 'issue'
  | 'host'
  | 'county_intel'

export async function seedDefaultFollowUpsIfEmpty(eventId: string, eventEndAtIso: string): Promise<void> {
  const { data: existing } = await supabase
    .from('campaign_event_followups')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)

  if (existing?.length) return

  const end = new Date(eventEndAtIso)
  if (Number.isNaN(end.getTime())) return

  const mk = (type: FollowupTypeSeed, hours: number, title: string) => ({
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

  await upsertCampaignEventOutcomePartial(eventId, {
    outcome_stage: 'executed',
  })
  await seedDefaultFollowUpsIfEmpty(eventId, endAtIso)
  await upsertCampaignEventOutcomePartial(eventId, {
    outcome_stage: 'followup_generated',
    first_followup_at: new Date().toISOString(),
  })
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null
}

function mapCampaignEventOutcomeRow(row: Record<string, unknown> | null): CampaignEventOutcomeRow | null {
  if (!row) return null
  const eid = row.event_id != null ? String(row.event_id) : ''
  if (!eid) return null
  const stageRaw = row.outcome_stage != null ? String(row.outcome_stage) : null
  return {
    event_id: eid,
    attendance_count: numOrNull(row.attendance_count),
    lead_count: numOrNull(row.lead_count),
    volunteer_signup_count: numOrNull(row.volunteer_signup_count),
    donor_followup_count: numOrNull(row.donor_followup_count),
    supporter_followup_count: numOrNull(row.supporter_followup_count),
    media_handoff_needed:
      row.media_handoff_needed === true || row.media_handoff_needed === false
        ? Boolean(row.media_handoff_needed)
        : null,
    debrief_notes: row.debrief_notes != null ? String(row.debrief_notes) : null,
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
    conversation_count: numOrNull(row.conversation_count),
    volunteer_assignments_created: numOrNull(row.volunteer_assignments_created),
    contacts_influenced_count: numOrNull(row.contacts_influenced_count),
    pledges_or_donations_count: numOrNull(row.pledges_or_donations_count),
    conversation_summary: row.conversation_summary != null ? String(row.conversation_summary) : null,
    outcome_stage: parseOutcomeStage(stageRaw),
    closure_recovery_notes:
      row.closure_recovery_notes != null ? String(row.closure_recovery_notes) : null,
    first_followup_at: row.first_followup_at != null ? String(row.first_followup_at) : null,
  }
}

export async function fetchCampaignEventOutcome(eventId: string): Promise<CampaignEventOutcomeRow | null> {
  const { data, error } = await supabase
    .from('campaign_event_outcomes')
    .select(
      [
        'event_id',
        'attendance_count',
        'lead_count',
        'volunteer_signup_count',
        'donor_followup_count',
        'supporter_followup_count',
        'media_handoff_needed',
        'debrief_notes',
        'completed_at',
        'conversation_count',
        'volunteer_assignments_created',
        'contacts_influenced_count',
        'pledges_or_donations_count',
        'conversation_summary',
        'outcome_stage',
        'closure_recovery_notes',
        'first_followup_at',
      ].join(','),
    )
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) return null
  return mapCampaignEventOutcomeRow(data as unknown as Record<string, unknown> | null)
}

export type CampaignEventOutcomePatch = Partial<{
  attendance_count: number | null
  lead_count: number | null
  volunteer_signup_count: number | null
  donor_followup_count: number | null
  supporter_followup_count: number | null
  media_handoff_needed: boolean | null
  debrief_notes: string | null
  completed_at: string | null
  conversation_count: number | null
  volunteer_assignments_created: number | null
  contacts_influenced_count: number | null
  pledges_or_donations_count: number | null
  conversation_summary: string | null
  outcome_stage: EventOutcomeStage | null
  closure_recovery_notes: string | null
  first_followup_at: string | null
}>

export async function upsertCampaignEventOutcomePartial(
  eventId: string,
  patch: CampaignEventOutcomePatch,
): Promise<{ error: Error | null }> {
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) row[k] = v
  }
  const { data: existing, error: selErr } = await supabase
    .from('campaign_event_outcomes')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle()
  if (selErr) return { error: new Error(selErr.message) }
  if (!existing) {
    const { error } = await supabase.from('campaign_event_outcomes').insert({ event_id: eventId, ...row })
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }
  if (Object.keys(row).length === 0) return { error: null }
  const { error } = await supabase.from('campaign_event_outcomes').update(row).eq('event_id', eventId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchEventLearningCaptureFromDb(eventId: string): Promise<{
  payload: Record<string, unknown>
  updated_at: string
} | null> {
  const { data, error } = await supabase
    .from('campaign_event_learning_capture')
    .select('payload,updated_at')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error || !data) return null
  const payload = data.payload as Record<string, unknown> | null
  if (!payload || typeof payload !== 'object') return null
  return { payload, updated_at: String((data as { updated_at?: string }).updated_at ?? '') }
}

export async function upsertEventLearningCaptureDb(
  eventId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('campaign_event_learning_capture').upsert(
    { event_id: eventId, payload },
    { onConflict: 'event_id' },
  )
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
