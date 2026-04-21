/**
 * Deterministic chase buckets from conversion state (single-row helpers).
 */

import type { VoterChaseSequenceState, VoterLifecycleStage } from './voterConversionDomain'
import type { VoterConversionStateRow } from './voterConversionDb'
import { needsBallotPlanCapture } from './voterBallotPlan'
import { needsCommitmentAsk } from './voterCommitmentService'

export type ChaseBucket =
  | 'commitment_ask_now'
  | 'ballot_plan_followup'
  | 'relational_intervention'
  | 'reminder_sequence'
  | 'high_touch_chase'
  | 'none'

export function chaseBucketForState(row: VoterConversionStateRow): ChaseBucket {
  if (row.chase_sequence_state === 'relational_queued' || row.lifecycle_stage === 'relationally_linked') {
    return 'relational_intervention'
  }
  if (row.chase_sequence_state === 'high_risk_commitment') return 'high_touch_chase'
  if (
    needsBallotPlanCapture({
      lifecycle: row.lifecycle_stage,
      ballot: row.ballot_plan_status,
      commitment: row.commitment_status,
    })
  ) {
    return 'ballot_plan_followup'
  }
  if (
    needsCommitmentAsk({ lifecycle: row.lifecycle_stage, commitment: row.commitment_status })
  ) {
    return 'commitment_ask_now'
  }
  if (
    row.chase_sequence_state === 'reminder_sequence_queued' ||
    row.chase_sequence_state === 'reminder_queued'
  ) {
    return 'reminder_sequence'
  }
  if (row.chase_sequence_state === 'chase_needed') return 'high_touch_chase'
  return 'none'
}

export function explainChaseBucket(
  bucket: ChaseBucket,
  chase: VoterChaseSequenceState,
  lifecycle: VoterLifecycleStage,
): string {
  switch (bucket) {
    case 'commitment_ask_now':
      return `Supporter energy without commitment — ask now (${lifecycle}).`
    case 'ballot_plan_followup':
      return 'Commitment on file; close ballot plan before GOTV compression.'
    case 'relational_intervention':
      return 'Relational pathway active — route through trusted connector.'
    case 'reminder_sequence':
      return `Reminder posture (${chase}).`
    case 'high_touch_chase':
      return 'High-touch chase — priority follow-up.'
    default:
      return 'No automated chase bucket; record next contact.'
  }
}
