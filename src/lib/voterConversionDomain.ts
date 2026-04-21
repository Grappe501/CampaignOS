/**
 * Canonical voter conversion / relational turnout domain (aligned with
 * voter_conversion_* tables and fold rules in migration 20260430380000).
 */

export const VOTER_CONTACT_METHODS = [
  'face_to_face',
  'phone_call',
  'zoom',
  'social_media',
  'text',
  'other',
  'unknown',
] as const
export type VoterContactMethod = (typeof VOTER_CONTACT_METHODS)[number]

export const VOTER_CONVERSION_DISPOSITIONS = [
  'no_answer',
  'wrong_contact',
  'supporter',
  'persuadable',
  'opposed',
  'volunteer_interest',
  'event_invite_candidate',
  'needs_relational_followup',
  'commitment_asked',
  'commitment_secured',
  'ballot_plan_needed',
  'ballot_plan_recorded',
  'chase_later',
  'do_not_contact',
  'not_target',
  'engaged_neutral',
] as const
export type VoterConversionDisposition = (typeof VOTER_CONVERSION_DISPOSITIONS)[number]

export const VOTER_SUPPORT_SIGNALS = [
  'lean_support',
  'firm_support',
  'unknown',
  'soft_oppose',
  'firm_oppose',
] as const
export type VoterSupportSignal = (typeof VOTER_SUPPORT_SIGNALS)[number]

export const VOTER_LIFECYCLE_STAGES = [
  'unknown',
  'identified',
  'contacted',
  'engaged',
  'leaning_support',
  'supporter',
  'persuadable',
  'opposed',
  'relationally_linked',
  'commitment_requested',
  'committed_to_vote',
  'needs_chase',
  'ballot_plan_recorded',
  'turnout_risk',
  'unreachable',
  'do_not_contact',
  'inactive_cooldown',
] as const
export type VoterLifecycleStage = (typeof VOTER_LIFECYCLE_STAGES)[number]

export const VOTER_COMMITMENT_STATUS = ['none', 'asked', 'secured', 'declined'] as const
export type VoterCommitmentStatus = (typeof VOTER_COMMITMENT_STATUS)[number]

export const VOTER_BALLOT_PLAN_STATUS = ['unknown', 'needed', 'recorded', 'waived'] as const
export type VoterBallotPlanStatus = (typeof VOTER_BALLOT_PLAN_STATUS)[number]

export const VOTER_CHASE_SEQUENCE_STATES = [
  'none',
  'reminder_queued',
  'relational_queued',
  'commitment_ask_pending',
  'ballot_plan_pending',
  'reminder_sequence_queued',
  'chase_needed',
  'high_risk_commitment',
] as const
export type VoterChaseSequenceState = (typeof VOTER_CHASE_SEQUENCE_STATES)[number]

export const VOTER_TURNOUT_RISK = ['low', 'medium', 'high'] as const
export type VoterTurnoutRisk = (typeof VOTER_TURNOUT_RISK)[number]

/** Operational groupings for UI / briefings. */
export const VOTER_STAGE_GROUPS = {
  pre_contact: ['unknown', 'identified'] satisfies VoterLifecycleStage[],
  active_organizing: [
    'contacted',
    'engaged',
    'leaning_support',
    'relationally_linked',
  ] satisfies VoterLifecycleStage[],
  support: ['supporter', 'persuadable', 'opposed'] satisfies VoterLifecycleStage[],
  turnout_pipe: [
    'commitment_requested',
    'committed_to_vote',
    'needs_chase',
    'ballot_plan_recorded',
    'turnout_risk',
  ] satisfies VoterLifecycleStage[],
  terminal: ['unreachable', 'do_not_contact', 'inactive_cooldown'] satisfies VoterLifecycleStage[],
} as const

export const VOTER_DISPOSITION_LABELS: Record<VoterConversionDisposition, string> = {
  no_answer: 'No answer',
  wrong_contact: 'Wrong contact',
  supporter: 'Supporter',
  persuadable: 'Persuadable',
  opposed: 'Opposed / not with us',
  volunteer_interest: 'Volunteer interest',
  event_invite_candidate: 'Event invite candidate',
  needs_relational_followup: 'Needs relational follow-up',
  commitment_asked: 'Asked for vote commitment',
  commitment_secured: 'Commitment secured',
  ballot_plan_needed: 'Ballot plan needed',
  ballot_plan_recorded: 'Ballot plan recorded',
  chase_later: 'Chase later',
  do_not_contact: 'Do not contact',
  not_target: 'Not a target',
  engaged_neutral: 'Engaged (neutral)',
}

export const VOTER_LIFECYCLE_LABELS: Record<VoterLifecycleStage, string> = {
  unknown: 'Unknown',
  identified: 'Identified',
  contacted: 'Contacted',
  engaged: 'Engaged',
  leaning_support: 'Leaning support',
  supporter: 'Supporter',
  persuadable: 'Persuadable',
  opposed: 'Opposed',
  relationally_linked: 'Relationally linked',
  commitment_requested: 'Commitment requested',
  committed_to_vote: 'Committed to vote',
  needs_chase: 'Needs chase',
  ballot_plan_recorded: 'Ballot plan recorded',
  turnout_risk: 'Turnout risk',
  unreachable: 'Unreachable',
  do_not_contact: 'Do not contact',
  inactive_cooldown: 'Inactive / cooling off',
}

export const VOTER_CHASE_LABELS: Record<VoterChaseSequenceState, string> = {
  none: 'No chase queued',
  reminder_queued: 'Reminder queued',
  relational_queued: 'Relational follow-up queued',
  commitment_ask_pending: 'Commitment ask pending',
  ballot_plan_pending: 'Ballot plan follow-up',
  reminder_sequence_queued: 'Reminder sequence queued',
  chase_needed: 'Chase needed',
  high_risk_commitment: 'High-risk commitment',
}

export function lifecycleStageGroup(stage: VoterLifecycleStage): keyof typeof VOTER_STAGE_GROUPS | 'other' {
  for (const [key, list] of Object.entries(VOTER_STAGE_GROUPS) as [
    keyof typeof VOTER_STAGE_GROUPS,
    readonly VoterLifecycleStage[],
  ][]) {
    if (list.includes(stage)) return key
  }
  return 'other'
}

export function isTerminalLifecycle(stage: VoterLifecycleStage): boolean {
  return (VOTER_STAGE_GROUPS.terminal as readonly string[]).includes(stage)
}

/** Deterministic chase severity 0–100 from stored chase + lifecycle (client may scale by GOTV phase). */
export function baseChasePriorityScore(input: {
  chase: VoterChaseSequenceState
  lifecycle: VoterLifecycleStage
  commitment: VoterCommitmentStatus
  ballot: VoterBallotPlanStatus
}): number {
  let s = 0
  if (input.chase === 'high_risk_commitment') s += 40
  if (input.chase === 'chase_needed') s += 35
  if (input.chase === 'ballot_plan_pending') s += 30
  if (input.chase === 'commitment_ask_pending') s += 28
  if (input.chase === 'reminder_sequence_queued') s += 22
  if (input.chase === 'relational_queued') s += 20
  if (input.chase === 'reminder_queued') s += 15
  if (input.lifecycle === 'committed_to_vote' && input.ballot !== 'recorded') s += 25
  if (input.lifecycle === 'supporter' && input.commitment === 'none') s += 18
  if (input.lifecycle === 'relationally_linked') s += 12
  return Math.min(100, s)
}
