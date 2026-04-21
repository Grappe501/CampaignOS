/**
 * Canonical Event → Outcome Loop model (lifecycle, health, routes).
 * Keeps rules out of React components; pairs with DB tables + selectors.
 */

import { campaignEventRecordPath } from './campaignEventSystem'

/** Ordered operational stages for outcome closure (DB CHECK aligned). */
export const EVENT_OUTCOME_STAGES = [
  'planned',
  'promoted',
  'staffed',
  'ready',
  'executed',
  'attendance_captured',
  'followup_generated',
  'followup_in_progress',
  'converted',
  'closed_with_learnings',
  'incomplete_recovery',
] as const

export type EventOutcomeStage = (typeof EVENT_OUTCOME_STAGES)[number]

export type EventOutcomeEffectivenessReasonCode =
  | 'high_turnout_weak_followup'
  | 'small_event_high_volunteer_yield'
  | 'strong_turnout_low_contact_capture'
  | 'staffing_shortage_reduced_yield'
  | 'format_outperformed_peer'
  | 'strong_commitments_next_steps'
  | 'missing_attendance_truth'
  | 'open_followup_backlog'
  | 'no_learning_capture'

const STAGE_INDEX: Record<EventOutcomeStage, number> = EVENT_OUTCOME_STAGES.reduce(
  (acc, s, i) => {
    acc[s] = i
    return acc
  },
  {} as Record<EventOutcomeStage, number>,
)

export function parseOutcomeStage(raw: string | null | undefined): EventOutcomeStage | null {
  const s = String(raw ?? '').trim() as EventOutcomeStage
  return STAGE_INDEX[s] !== undefined ? s : null
}

export function outcomeStageLabel(stage: EventOutcomeStage | null): string {
  if (!stage) return 'Not set'
  const map: Record<EventOutcomeStage, string> = {
    planned: 'Planned',
    promoted: 'Promoted',
    staffed: 'Staffed',
    ready: 'Ready',
    executed: 'Executed',
    attendance_captured: 'Attendance captured',
    followup_generated: 'Follow-up generated',
    followup_in_progress: 'Follow-up in progress',
    converted: 'Converted / activated',
    closed_with_learnings: 'Closed with learnings',
    incomplete_recovery: 'Incomplete — needs recovery',
  }
  return map[stage]
}

/** Row shape for `campaign_event_outcomes` (subset used in app). */
export type CampaignEventOutcomeRow = {
  event_id: string
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
}

export type EventOutcomeRiskFlag =
  | 'missing_attendance'
  | 'missing_followup_queue'
  | 'followup_stalled'
  | 'no_learning'
  | 'low_closure_vs_expected_audience'
  | 'outcome_stage_incomplete'

export type EventOutcomeHealth = {
  completeness_0_100: number
  flags: EventOutcomeRiskFlag[]
  stage: EventOutcomeStage | null
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Closure quality from operational signals (deterministic; advisory).
 */
export function computeEventOutcomeHealth(input: {
  recordExpectedAudience: number | null
  attendanceCheckins: number
  outcomeRow: CampaignEventOutcomeRow | null
  followupsTotal: number
  followupsOpen: number
  learningCaptureFilled: boolean
  eventEnded: boolean
}): EventOutcomeHealth {
  const flags: EventOutcomeRiskFlag[] = []
  let score = 100

  const attendance = Math.max(0, input.attendanceCheckins)
  const expected = input.recordExpectedAudience

  if (input.eventEnded && attendance === 0 && (expected == null || expected > 0)) {
    flags.push('missing_attendance')
    score -= 28
  }

  if (input.eventEnded && input.followupsTotal === 0) {
    flags.push('missing_followup_queue')
    score -= 18
  }

  if (input.eventEnded && input.followupsOpen >= 3) {
    flags.push('followup_stalled')
    score -= 12
  }

  if (input.eventEnded && !input.learningCaptureFilled) {
    flags.push('no_learning')
    score -= 10
  }

  if (
    expected != null &&
    expected > 0 &&
    attendance > 0 &&
    attendance < Math.ceil(expected * 0.35)
  ) {
    flags.push('low_closure_vs_expected_audience')
    score -= 8
  }

  const stage = input.outcomeRow?.outcome_stage ?? null
  if (input.eventEnded && stage === 'incomplete_recovery') {
    flags.push('outcome_stage_incomplete')
    score -= 15
  }

  return {
    completeness_0_100: clamp100(score),
    flags: flags,
    stage,
  }
}

export function deriveEffectivenessHints(input: {
  health: EventOutcomeHealth
  attendanceCheckins: number
  volunteerLeadsFromCheckin: number
  followupsOpen: number
  followupsTotal: number
  conversationCount: number | null
  volunteerOutcomeOnRecord: number | null
}): EventOutcomeEffectivenessReasonCode[] {
  const hints: EventOutcomeEffectivenessReasonCode[] = []
  if (input.health.flags.includes('missing_attendance')) hints.push('missing_attendance_truth')
  if (input.followupsTotal > 0 && input.followupsOpen / Math.max(1, input.followupsTotal) > 0.5) {
    hints.push('high_turnout_weak_followup')
  }
  if (
    input.attendanceCheckins > 0 &&
    input.attendanceCheckins < 15 &&
    (input.volunteerOutcomeOnRecord ?? 0) >= 2
  ) {
    hints.push('small_event_high_volunteer_yield')
  }
  if (input.attendanceCheckins >= 10 && (input.conversationCount ?? 0) === 0) {
    hints.push('strong_turnout_low_contact_capture')
  }
  if (input.health.flags.includes('followup_stalled')) hints.push('open_followup_backlog')
  if (input.health.flags.includes('no_learning')) hints.push('no_learning_capture')
  if ((input.volunteerLeadsFromCheckin ?? 0) >= 3 && (input.volunteerOutcomeOnRecord ?? 0) >= 1) {
    hints.push('strong_commitments_next_steps')
  }
  return hints
}

export function eventOutcomeRouteHints(eventId: string): {
  recordOutcomes: string
  checkIn: string
  analytics: string
} {
  const base = campaignEventRecordPath(eventId)
  return {
    recordOutcomes: `${base}#event-outcomes`,
    checkIn: `/events/check-in/${eventId}`,
    analytics: '/events/analytics',
  }
}
