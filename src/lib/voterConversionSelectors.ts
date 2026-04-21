/**
 * Pure selectors over conversion state rows / rollups.
 */

import type { VoterConversionCountyRollupRow, VoterConversionStateRow } from './voterConversionDb'
import { chaseBucketForState } from './voterChaseEngine'

export function statesNeedingRelationalFollowup(rows: readonly VoterConversionStateRow[]): VoterConversionStateRow[] {
  return [...rows].filter(
    (r) => r.lifecycle_stage === 'relationally_linked' || r.chase_sequence_state === 'relational_queued',
  )
}

export function statesWithCommitmentBacklog(rows: readonly VoterConversionStateRow[]): VoterConversionStateRow[] {
  return [...rows].filter(
    (r) => r.lifecycle_stage === 'supporter' && (r.commitment_status === 'none' || r.commitment_status === 'asked'),
  )
}

export function statesWithBallotGap(rows: readonly VoterConversionStateRow[]): VoterConversionStateRow[] {
  return [...rows].filter(
    (r) => r.commitment_status === 'secured' && r.ballot_plan_status !== 'recorded' && r.ballot_plan_status !== 'waived',
  )
}

export function topChaseStates(rows: readonly VoterConversionStateRow[], limit = 12): VoterConversionStateRow[] {
  const scored = [...rows].map((r) => ({
    r,
    w:
      chaseBucketForState(r) === 'high_touch_chase'
        ? 4
        : chaseBucketForState(r) === 'ballot_plan_followup'
          ? 3
          : chaseBucketForState(r) === 'commitment_ask_now'
            ? 2
            : 1,
  }))
  return scored
    .filter((x) => x.w > 1)
    .sort((a, b) => b.w - a.w)
    .slice(0, limit)
    .map((x) => x.r)
}

export function sumRollupField(
  rows: readonly VoterConversionCountyRollupRow[],
  key: keyof Pick<
    VoterConversionCountyRollupRow,
    | 'tracked_voters'
    | 'supporters'
    | 'committed'
    | 'ballot_recorded'
    | 'needs_chase'
    | 'relational_linked'
    | 'commitment_ask_pending'
  >,
): number {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0)
}
