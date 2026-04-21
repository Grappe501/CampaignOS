/**
 * Volunteer Throughput Engine — canonical lifecycle model.
 * Maps existing Supabase-backed enums (`volunteerCommandDomain`, `volunteerOpportunityDomain`)
 * into a unified throughput vocabulary without changing DB CHECK constraints.
 */

import type {
  AssignmentStatus,
  VolunteerActiveStatus,
  VolunteerOnboardingStatus,
} from './volunteerCommandDomain'
import type { OpportunityClaimState } from './volunteerOpportunityDomain'

/** End-to-end stages used for grouping, analytics, and Agent Jones (subset map to DB rows). */
export const VOLUNTEER_THROUGHPUT_STAGES = [
  'discovered',
  'invited',
  'interested',
  'opted_in',
  'eligible',
  'recommended',
  'claimed',
  'assigned',
  'reminded',
  'engaged',
  'completed',
  'followed_up',
  'dropped',
  'no_show',
  'cooling_off',
] as const

export type VolunteerThroughputStage = (typeof VOLUNTEER_THROUGHPUT_STAGES)[number]

export type ThroughputStageGroup = 'intake' | 'matching' | 'execution' | 'outcome' | 'inactive'

const GROUP_BY_STAGE: Record<VolunteerThroughputStage, ThroughputStageGroup> = {
  discovered: 'intake',
  invited: 'intake',
  interested: 'intake',
  opted_in: 'intake',
  eligible: 'matching',
  recommended: 'matching',
  claimed: 'matching',
  assigned: 'execution',
  reminded: 'execution',
  engaged: 'execution',
  completed: 'outcome',
  followed_up: 'outcome',
  dropped: 'inactive',
  no_show: 'inactive',
  cooling_off: 'inactive',
}

export function throughputStageGroup(stage: VolunteerThroughputStage): ThroughputStageGroup {
  return GROUP_BY_STAGE[stage]
}

export function throughputStageLabel(stage: VolunteerThroughputStage): string {
  const labels: Record<VolunteerThroughputStage, string> = {
    discovered: 'Discovered',
    invited: 'Invited',
    interested: 'Interested',
    opted_in: 'Applied / opted in',
    eligible: 'Eligible',
    recommended: 'Recommended',
    claimed: 'Claimed / accepted',
    assigned: 'Assigned',
    reminded: 'Reminder sent',
    engaged: 'Checked in / engaged',
    completed: 'Completed',
    followed_up: 'Followed up',
    dropped: 'Dropped / declined',
    no_show: 'No-show',
    cooling_off: 'Cooling off / unavailable',
  }
  return labels[stage]
}

/** Non-punitive operational attention for coordinators. */
export type ThroughputAttentionSeverity = 'none' | 'info' | 'watch' | 'urgent'

export function throughputAttentionForStage(stage: VolunteerThroughputStage): ThroughputAttentionSeverity {
  switch (stage) {
    case 'no_show':
    case 'dropped':
      return 'watch'
    case 'reminded':
    case 'engaged':
      return 'info'
    case 'cooling_off':
      return 'watch'
    case 'claimed':
    case 'assigned':
    case 'recommended':
      return 'info'
    default:
      return 'none'
  }
}

/** Primary UI / deep-link hints (existing routes). */
export function throughputRouteHint(stage: VolunteerThroughputStage): { path: string; label: string } {
  switch (stage) {
    case 'discovered':
    case 'invited':
    case 'interested':
    case 'opted_in':
      return { path: '/volunteers/command', label: 'Review intake queue' }
    case 'eligible':
    case 'recommended':
      return { path: '/volunteers/opportunities', label: 'Open marketplace' }
    case 'claimed':
    case 'assigned':
    case 'reminded':
    case 'engaged':
      return { path: '/volunteers/command', label: 'Assignments & reminders' }
    case 'completed':
    case 'followed_up':
      return { path: '/volunteers/me', label: 'Volunteer history' }
    case 'dropped':
    case 'no_show':
    case 'cooling_off':
      return { path: '/volunteers/command', label: 'Coordinator follow-up' }
    default:
      return { path: '/volunteers/command', label: 'Volunteer command' }
  }
}

/**
 * Directed graph of allowed canonical transitions (operational guidance; enforcement lives in services/RLS).
 * Terminal-ish stages have empty or self-loops avoided by omission from keys.
 */
export const ALLOWED_THROUGHPUT_TRANSITIONS: Readonly<
  Record<VolunteerThroughputStage, readonly VolunteerThroughputStage[]>
> = {
  discovered: ['invited', 'interested', 'opted_in', 'dropped'],
  invited: ['interested', 'opted_in', 'dropped', 'cooling_off'],
  interested: ['opted_in', 'eligible', 'dropped', 'cooling_off'],
  opted_in: ['eligible', 'recommended', 'dropped'],
  eligible: ['recommended', 'claimed', 'assigned', 'dropped'],
  recommended: ['claimed', 'eligible', 'dropped'],
  claimed: ['assigned', 'reminded', 'dropped', 'no_show'],
  assigned: ['reminded', 'engaged', 'completed', 'dropped', 'no_show', 'cooling_off'],
  reminded: ['engaged', 'completed', 'no_show', 'dropped'],
  engaged: ['completed', 'no_show'],
  completed: ['followed_up'],
  followed_up: ['interested', 'eligible', 'cooling_off'],
  dropped: ['interested', 'opted_in'],
  no_show: ['followed_up', 'cooling_off', 'dropped'],
  cooling_off: ['interested', 'eligible'],
}

export function canTransitionThroughput(from: VolunteerThroughputStage, to: VolunteerThroughputStage): boolean {
  if (from === to) return true
  const next = ALLOWED_THROUGHPUT_TRANSITIONS[from]
  return next.includes(to)
}

/** Map legacy onboarding + active flags into canonical stage (one primary label per profile). */
export function mapOnboardingToThroughputStage(
  onboarding: VolunteerOnboardingStatus,
  active: VolunteerActiveStatus,
): VolunteerThroughputStage {
  if (active === 'inactive') return 'dropped'
  if (active === 'paused') return 'cooling_off'
  switch (onboarding) {
    case 'new':
      return 'discovered'
    case 'contacted':
      return 'invited'
    case 'onboarding':
      return 'interested'
    case 'ready':
      return 'eligible'
    case 'active':
      return 'eligible'
    case 'paused':
      return 'cooling_off'
    case 'inactive':
      return 'dropped'
    default:
      return 'discovered'
  }
}

/** Map assignment row state into throughput vocabulary. */
export function mapAssignmentToThroughputStage(
  status: AssignmentStatus,
  opts?: { noShow?: boolean; checkedIn?: boolean },
): VolunteerThroughputStage {
  const noShow = Boolean(opts?.noShow)
  const checkedIn = Boolean(opts?.checkedIn)
  if (noShow) return 'no_show'
  if (checkedIn && (status === 'in_progress' || status === 'completed')) return 'engaged'
  switch (status) {
    case 'open':
      return 'eligible'
    case 'assigned':
      return 'assigned'
    case 'claimed':
      return 'claimed'
    case 'in_progress':
      return 'engaged'
    case 'completed':
      return 'completed'
    case 'declined':
      return 'dropped'
    case 'missed':
      return 'no_show'
    case 'canceled':
      return 'dropped'
    default:
      return 'assigned'
  }
}

/**
 * Marketplace claim eligibility state → throughput (does not encode claim/assignment facts;
 * combine with opportunity + assignment records for full picture).
 */
export function mapOpportunityClaimToThroughputHint(claim: OpportunityClaimState): VolunteerThroughputStage {
  switch (claim) {
    case 'eligible':
      return 'eligible'
    case 'blocked_onboarding':
      return 'interested'
    case 'blocked_training':
      return 'opted_in'
    case 'blocked_load':
      return 'cooling_off'
    case 'blocked_no_self_claim':
      return 'eligible'
    case 'blocked_role':
    case 'blocked_other':
      return 'eligible'
    default:
      return 'eligible'
  }
}
