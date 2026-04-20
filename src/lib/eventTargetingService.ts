/**
 * Event audience targeting — models and recommendation adapters (data-source agnostic).
 */

import { supabase } from './supabaseClient'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import type { EventObjective } from './campaignEventDomain'

export type AudienceFocus = 'persuasion' | 'turnout' | 'recruitment' | 'fundraising' | 'listening'

export type EventTargetingProfile = {
  eventType: CampaignEventTypeKey
  objective: EventObjective | null
  audienceFocus: AudienceFocus
  geographyRadiusMiles: number | null
  voterUniverseKey: string | null
  volunteerUniverseKey: string | null
  segmentTags: string[]
  notes: string | null
}

export type InviteRecommendation = {
  contactId: string
  displayLabel: string
  reason: string
  relationshipScore: number
}

export type HostCandidateRecommendation = {
  profileId: string
  displayLabel: string
  reason: string
}

export type AttendanceBandEstimate = {
  low: number
  high: number
  basis: string
}

export type EventTargetUniverseEntry = {
  id: string
  label: string
  kind: 'placeholder' | 'record'
}

/**
 * Adapter for audience / invite universes. Returns placeholder rows until voter-file tables exist;
 * extend with real Supabase queries without changing card props.
 */
export async function getEventTargetUniverse(eventId: string): Promise<EventTargetUniverseEntry[]> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select('id,title,county_id')
    .eq('id', eventId)
    .maybeSingle()

  if (error || !data) {
    return [
      {
        id: `event:${eventId}:placeholder`,
        label: 'Target universe — connect voter file or CRM segment',
        kind: 'placeholder',
      },
    ]
  }

  const title = String((data as { title?: string }).title ?? 'This event')
  const county = (data as { county_id?: string | null }).county_id
  return [
    {
      id: `event:${eventId}:geo`,
      label: county ? `${title} · county ${county}` : `${title} · geography TBD`,
      kind: 'record',
    },
  ]
}

/** Stub: replace with voter-file / CRM queries. */
export function recommendInviteList(_profile: EventTargetingProfile): InviteRecommendation[] {
  void _profile
  return []
}

export function recommendVolunteerProspects(_profile: EventTargetingProfile): InviteRecommendation[] {
  void _profile
  return []
}

export function recommendHostCandidates(_profile: EventTargetingProfile): HostCandidateRecommendation[] {
  void _profile
  return []
}

export function estimateAttendanceBand(
  profile: EventTargetingProfile,
  expectedAudienceHint: number | null,
): AttendanceBandEstimate {
  const base = expectedAudienceHint ?? 25
  return {
    low: Math.max(5, Math.floor(base * 0.4)),
    high: Math.ceil(base * 1.4),
    basis: 'Heuristic from expected audience hint and event focus until historical data is wired.',
  }
}
