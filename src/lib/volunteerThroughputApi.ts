/**
 * Supabase I/O for `volunteer_throughput_events` (append-only audit / funnel log).
 */

import { supabase } from './supabaseClient'
import type { VolunteerThroughputStage } from './volunteerThroughputDomain'

export type VolunteerThroughputEventRow = {
  id: string
  campaignId: string
  volunteerId: string | null
  throughputStage: VolunteerThroughputStage | string
  eventKind: 'lifecycle' | 'reminder' | 'assignment' | 'opportunity' | 'coordination' | 'system'
  assignmentId: string | null
  opportunityId: string | null
  actorProfileId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

function mapRow(row: Record<string, unknown>): VolunteerThroughputEventRow {
  return {
    id: String(row.id ?? ''),
    campaignId: String(row.campaign_id ?? 'default'),
    volunteerId: row.volunteer_id != null ? String(row.volunteer_id) : null,
    throughputStage: String(row.throughput_stage ?? ''),
    eventKind: String(row.event_kind ?? 'system') as VolunteerThroughputEventRow['eventKind'],
    assignmentId: row.assignment_id != null ? String(row.assignment_id) : null,
    opportunityId: row.opportunity_id != null ? String(row.opportunity_id) : null,
    actorProfileId: row.actor_profile_id != null ? String(row.actor_profile_id) : null,
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at ?? ''),
  }
}

export async function insertVolunteerThroughputEvent(input: {
  campaignId?: string
  volunteerId: string | null
  throughputStage: VolunteerThroughputStage | string
  eventKind: VolunteerThroughputEventRow['eventKind']
  assignmentId?: string | null
  opportunityId?: string | null
  actorProfileId?: string | null
  payload?: Record<string, unknown>
}): Promise<{ row: VolunteerThroughputEventRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteer_throughput_events')
    .insert({
      campaign_id: input.campaignId ?? 'default',
      volunteer_id: input.volunteerId,
      throughput_stage: input.throughputStage,
      event_kind: input.eventKind,
      assignment_id: input.assignmentId ?? null,
      opportunity_id: input.opportunityId ?? null,
      actor_profile_id: input.actorProfileId ?? null,
      payload: input.payload ?? {},
    })
    .select('*')
    .maybeSingle()

  if (error) return { row: null, error: new Error(error.message) }
  if (!data || typeof data !== 'object') return { row: null, error: null }
  return { row: mapRow(data as Record<string, unknown>), error: null }
}

export async function fetchVolunteerThroughputEventsForCampaign(
  campaignId: string,
  limit = 200,
): Promise<VolunteerThroughputEventRow[]> {
  const { data, error } = await supabase
    .from('volunteer_throughput_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !Array.isArray(data)) return []
  return data.map((r) => mapRow(r as Record<string, unknown>))
}
