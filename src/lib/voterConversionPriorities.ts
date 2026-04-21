/**
 * Geography + countdown-aware priority lines (explainable, deterministic).
 */

import type { GotvTurnoutPhase } from './gotvDomain'
import type { VoterConversionCountyRollupRow } from './voterConversionDb'
import { buildVoterConversionProgramMetrics } from './voterConversionMetrics'

export function buildVoterConversionPriorityLines(
  rollups: readonly VoterConversionCountyRollupRow[],
  phase: GotvTurnoutPhase,
): string[] {
  const lines: string[] = []
  const m = buildVoterConversionProgramMetrics(rollups)
  if (m.tracked_voters === 0) {
    lines.push('No DB-backed conversion state yet — log contacts from Power5 or field capture.')
    return lines
  }

  const weakBallot = [...rollups]
    .map((r) => ({
      county: r.county || 'Unknown',
      gap: r.committed > 0 ? r.committed - r.ballot_recorded : 0,
    }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)

  if (weakBallot.length && ['early_vote_launch', 'early_vote_sustain', 'pre_election_96h', 'pre_election_48h', 'election_day'].includes(phase)) {
    lines.push(
      `Ballot-plan gap pressure (${phase.replace(/_/g, ' ')}): ${weakBallot.map((w) => `${w.county} Δ${w.gap}`).join('; ')}`,
    )
  }

  const chaseHeavy = [...rollups].filter((r) => r.needs_chase > 0).sort((a, b) => b.needs_chase - a.needs_chase)[0]
  if (chaseHeavy && chaseHeavy.needs_chase >= 3) {
    lines.push(`${chaseHeavy.county || 'County TBD'}: ${chaseHeavy.needs_chase} voters in reminder/chase queues — surge relational or direct follow-up.`)
  }

  const rel = sumRelationalLinked(rollups)
  if (rel > 0 && phase !== 'post_election_review') {
    lines.push(`${rel} voters relationally queued — activate strongest connectors before countdown tightens.`)
  }

  if (m.supporter_to_commitment_rate != null && m.supporter_to_commitment_rate < 25 && m.supporters >= 5) {
    lines.push('Supporter → commitment conversion is soft — tighten commitment asks on next touches.')
  }

  if (!lines.length) {
    lines.push('Conversion funnel stable — keep logging dispositions so chase stays deterministic.')
  }
  return lines.slice(0, 6)
}

function sumRelationalLinked(rows: readonly VoterConversionCountyRollupRow[]): number {
  return rows.reduce((a, r) => a + r.relational_linked, 0)
}
