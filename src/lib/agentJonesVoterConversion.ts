/**
 * Bounded voter conversion / relational turnout digest for Agent Jones (advisory).
 */

import type { GotvTurnoutPhase } from './gotvDomain'
import type { VoterConversionCountyRollupRow } from './voterConversionDb'
import { buildVoterConversionPriorityLines } from './voterConversionPriorities'
import { buildVoterConversionProgramMetrics } from './voterConversionMetrics'
import { weakestCountyForCommitments } from './voterConversionAnalytics'

export type AgentJonesVoterConversionSnapshot = {
  source: 'voter_conversion_command_v1'
  generated_at_ms: number
  turnout_phase: GotvTurnoutPhase | string
  phase_priorities: string[]
  totals: {
    tracked_voters: number
    supporters: number
    committed: number
    ballot_recorded: number
    needs_chase: number
    relational_linked: number
    commitment_ask_pending: number
  }
  rates: {
    contacted_to_supporter_pct: number | null
    supporter_to_commitment_pct: number | null
    commitment_to_ballot_pct: number | null
  }
  top_county_hints: string[]
  operational_lines: string[]
}

export function buildAgentJonesVoterConversionSnapshot(input: {
  generatedAtMs: number
  phase: GotvTurnoutPhase | string
  phasePriorities: string[]
  rollups: VoterConversionCountyRollupRow[]
}): AgentJonesVoterConversionSnapshot | null {
  const m = buildVoterConversionProgramMetrics(input.rollups)
  const needs_chase = input.rollups.reduce((a, r) => a + r.needs_chase, 0)
  const relational_linked = input.rollups.reduce((a, r) => a + r.relational_linked, 0)
  const commitment_ask_pending = input.rollups.reduce((a, r) => a + r.commitment_ask_pending, 0)

  const topCounty = [...input.rollups]
    .filter((r) => r.county)
    .sort((a, b) => b.needs_chase - a.needs_chase)
    .slice(0, 3)
    .map((r) => `${r.county}: chase ${r.needs_chase}, commitments ${r.committed}, ballots ${r.ballot_recorded}`)

  const weak = weakestCountyForCommitments(input.rollups)
  const top_county_hints = weak && !topCounty.length ? [weak] : topCounty

  const operational_lines = buildVoterConversionPriorityLines(input.rollups, input.phase as GotvTurnoutPhase)

  if (m.tracked_voters === 0 && operational_lines.length === 1) {
    return {
      source: 'voter_conversion_command_v1',
      generated_at_ms: input.generatedAtMs,
      turnout_phase: input.phase,
      phase_priorities: input.phasePriorities.slice(0, 6),
      totals: {
        tracked_voters: 0,
        supporters: 0,
        committed: 0,
        ballot_recorded: 0,
        needs_chase: 0,
        relational_linked: 0,
        commitment_ask_pending: 0,
      },
      rates: {
        contacted_to_supporter_pct: null,
        supporter_to_commitment_pct: null,
        commitment_to_ballot_pct: null,
      },
      top_county_hints: [],
      operational_lines,
    }
  }

  return {
    source: 'voter_conversion_command_v1',
    generated_at_ms: input.generatedAtMs,
    turnout_phase: input.phase,
    phase_priorities: input.phasePriorities.slice(0, 6),
    totals: {
      tracked_voters: m.tracked_voters,
      supporters: m.supporters,
      committed: m.committed,
      ballot_recorded: m.ballot_recorded,
      needs_chase,
      relational_linked,
      commitment_ask_pending,
    },
    rates: {
      contacted_to_supporter_pct: m.contacted_to_supporter_rate,
      supporter_to_commitment_pct: m.supporter_to_commitment_rate,
      commitment_to_ballot_pct: m.commitment_to_ballot_rate,
    },
    top_county_hints,
    operational_lines,
  }
}
