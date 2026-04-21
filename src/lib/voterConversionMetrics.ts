/**
 * Conversion rates and funnel math from leadership rollups (deterministic).
 */

import type { VoterConversionCountyRollupRow } from './voterConversionDb'
import { sumRollupField } from './voterConversionSelectors'

export type VoterConversionProgramMetrics = {
  tracked_voters: number
  supporters: number
  committed: number
  ballot_recorded: number
  contacted_to_supporter_rate: number | null
  supporter_to_commitment_rate: number | null
  commitment_to_ballot_rate: number | null
}

export function buildVoterConversionProgramMetrics(
  rows: readonly VoterConversionCountyRollupRow[],
): VoterConversionProgramMetrics {
  const tracked_voters = sumRollupField(rows, 'tracked_voters')
  const supporters = sumRollupField(rows, 'supporters')
  const committed = sumRollupField(rows, 'committed')
  const ballot_recorded = sumRollupField(rows, 'ballot_recorded')
  const contacted_to_supporter_rate =
    tracked_voters > 0 ? Math.round((supporters / tracked_voters) * 1000) / 10 : null
  const supporter_to_commitment_rate =
    supporters > 0 ? Math.round((committed / supporters) * 1000) / 10 : null
  const commitment_to_ballot_rate =
    committed > 0 ? Math.round((ballot_recorded / committed) * 1000) / 10 : null
  return {
    tracked_voters,
    supporters,
    committed,
    ballot_recorded,
    contacted_to_supporter_rate,
    supporter_to_commitment_rate,
    commitment_to_ballot_rate,
  }
}
