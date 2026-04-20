/**
 * Log engagement events (RLS: volunteer self + coordinator).
 */

import { supabase } from './supabaseClient'
import type { VolunteerEngagementEventType } from './volunteerRecommendationSchemas'

export async function logVolunteerEngagementEvent(input: {
  volunteerId: string
  opportunityId?: string | null
  eventType: VolunteerEngagementEventType
  eventValue?: number | null
  metadataJson?: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('volunteer_engagement_events').insert({
    volunteer_id: input.volunteerId,
    opportunity_id: input.opportunityId ?? null,
    event_type: input.eventType,
    event_value: input.eventValue ?? null,
    metadata_json: input.metadataJson ?? {},
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function fetchEngagementEventsForVolunteer(
  volunteerId: string,
  sinceIso?: string,
): Promise<
  Array<{
    event_type: string
    opportunity_id: string | null
    created_at: string
    metadata_json: Record<string, unknown>
  }>
> {
  let q = supabase
    .from('volunteer_engagement_events')
    .select('event_type, opportunity_id, created_at, metadata_json')
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (sinceIso) q = q.gte('created_at', sinceIso)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as Array<{
    event_type: string
    opportunity_id: string | null
    created_at: string
    metadata_json: Record<string, unknown>
  }>
}
