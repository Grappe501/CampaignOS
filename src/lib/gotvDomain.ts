/**
 * Canonical polling place / GOTV domain — turnout command layer.
 */

import { CAMPAIGN_ELECTION_CLOCK, getPollCloseUtcMs } from './campaignClock'

export const GOTV_SITE_KINDS = ['early_vote', 'election_day', 'polling_place', 'staging'] as const
export type GotvSiteKind = (typeof GOTV_SITE_KINDS)[number]

export const GOTV_SITE_STATUS = ['active', 'inactive', 'closed'] as const
export type GotvSiteStatus = (typeof GOTV_SITE_STATUS)[number]

export const GOTV_SHIFT_STATUS = ['open', 'filled', 'canceled'] as const
export type GotvShiftStatus = (typeof GOTV_SHIFT_STATUS)[number]

export const GOTV_ASSIGNMENT_STATUS = [
  'invited',
  'confirmed',
  'checked_in',
  'no_show',
  'released',
] as const
export type GotvAssignmentStatus = (typeof GOTV_ASSIGNMENT_STATUS)[number]

/** Countdown / operational phases (deterministic engine). */
export const GOTV_TURNOUT_PHASES = [
  'pre_early_vote_ramp',
  'early_vote_launch',
  'early_vote_sustain',
  'pre_election_96h',
  'pre_election_48h',
  'election_day',
  'post_close_wrap',
  'post_election_review',
] as const
export type GotvTurnoutPhase = (typeof GOTV_TURNOUT_PHASES)[number]

export const GOTV_READINESS_BANDS = ['green', 'yellow', 'orange', 'red'] as const
export type GotvReadinessBand = (typeof GOTV_READINESS_BANDS)[number]

export const GOTV_INTERVENTION_KINDS = [
  'fill_site',
  'assign_captain',
  'replacement_workflow',
  'escalate_county',
  'escalate_leadership',
  'reminder_wave',
  'rapid_action_route',
  'recovery_task',
] as const
export type GotvInterventionKind = (typeof GOTV_INTERVENTION_KINDS)[number]

export const GOTV_INCIDENT_KINDS = [
  'site_short_staffed',
  'captain_absent',
  'no_show_cluster',
  'routing_confusion',
  'supply_logistics',
  'comms_breakdown',
  'escalated_county',
  'escalated_leadership',
  'other',
] as const
export type GotvIncidentKind = (typeof GOTV_INCIDENT_KINDS)[number]

export const GOTV_INCIDENT_SEVERITY = ['info', 'watch', 'high', 'critical'] as const
export type GotvIncidentSeverity = (typeof GOTV_INCIDENT_SEVERITY)[number]

export const GOTV_INCIDENT_STATUS = ['open', 'owned', 'resolved', 'escalated'] as const
export type GotvIncidentStatus = (typeof GOTV_INCIDENT_STATUS)[number]

/**
 * Jurisdiction calendar anchors (UTC ms). Tune per campaign / state law.
 * Early vote window is illustrative for 2026 general — replace with official dates.
 */
export const GOTV_ELECTION_CALENDAR = {
  timeZone: CAMPAIGN_ELECTION_CLOCK.timeZone,
  pollsCloseUtcMs: getPollCloseUtcMs(),
  /** Early vote start (UTC): ~Sep 25, 2026 13:00 UTC ≈ 8:00 CT */
  earlyVoteStartUtcMs: Date.UTC(2026, 8, 25, 13, 0, 0, 0),
  /** Early vote end (UTC): Nov 3, 2026 05:00 UTC ≈ Nov 2, 2026 11pm CT (before election day) */
  earlyVoteEndUtcMs: Date.UTC(2026, 10, 3, 5, 0, 0, 0),
  /** First 96h of early vote treated as “launch” intensity */
  earlyVoteLaunchHours: 96,
} as const

export type GotvPollingPlaceRow = {
  id: string
  campaign_id: string
  site_kind: GotvSiteKind
  label: string
  address_line: string | null
  county_id: string | null
  precinct_id: string | null
  city: string | null
  zone_key: string | null
  importance: number
  status: GotvSiteStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type GotvSiteShiftRow = {
  id: string
  site_id: string
  role_slug: string
  shift_start: string
  shift_end: string
  slots_needed: number
  notes: string | null
  status: GotvShiftStatus
  created_at: string
  updated_at: string
}

export type GotvSiteAssignmentRow = {
  id: string
  shift_id: string
  campaign_profile_id: string
  assignment_status: GotvAssignmentStatus
  confirmed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type GotvIncidentRow = {
  id: string
  campaign_id: string
  site_id: string
  incident_kind: string
  severity: GotvIncidentSeverity
  status: GotvIncidentStatus
  owner_profile_id: string | null
  message: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Route helpers (internal navigation). */
export const GOTV_ROUTES = {
  county_ops: '/events/county-ops',
  neighborhood_hub: '/events/neighborhood',
  volunteer_command: '/volunteers/command',
  coordinator_desk: '/events',
  war_room: '/events/war-room',
  leadership: '/events/leadership',
} as const

export function gotvCountyOpsAnchor(countyId: string | null): string {
  const base = GOTV_ROUTES.county_ops
  if (!countyId?.trim()) return `${base}#gotv-command`
  return `${base}?county=${encodeURIComponent(countyId)}#gotv-command`
}
