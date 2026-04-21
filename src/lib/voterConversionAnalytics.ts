/**
 * Leadership-facing analytics strings (bounded, no PII).
 */

import type { VoterConversionCountyRollupRow } from './voterConversionDb'
import { buildVoterConversionProgramMetrics } from './voterConversionMetrics'

export function voterConversionLeadershipHeadline(rows: readonly VoterConversionCountyRollupRow[]): string {
  const m = buildVoterConversionProgramMetrics(rows)
  if (!m.tracked_voters) return 'Turnout conversion: waiting for first logged contacts.'
  const c2s = m.contacted_to_supporter_rate != null ? `${m.contacted_to_supporter_rate}% contacted→supporter` : 'contacted→supporter n/a'
  const s2c = m.supporter_to_commitment_rate != null ? `${m.supporter_to_commitment_rate}% supporter→commitment` : 'supporter→commitment n/a'
  const c2b = m.commitment_to_ballot_rate != null ? `${m.commitment_to_ballot_rate}% commitment→ballot plan` : 'commitment→ballot n/a'
  return `Tracked ${m.tracked_voters} · ${c2s} · ${s2c} · ${c2b}`
}

export function weakestCountyForCommitments(rows: readonly VoterConversionCountyRollupRow[]): string | null {
  const ranked = [...rows]
    .filter((r) => r.tracked_voters > 0)
    .map((r) => ({
      county: r.county || 'Unknown',
      rate: r.tracked_voters > 0 ? r.committed / r.tracked_voters : 0,
    }))
    .sort((a, b) => a.rate - b.rate)
  return ranked[0] ? `${ranked[0].county} (commit density low vs tracked)` : null
}
