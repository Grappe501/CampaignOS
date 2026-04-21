/**
 * Bounded simulation digest for Agent Jones — advisory; cannot replace live metrics.
 */

import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import type { StrategyScenario } from './simulationDomain'
import { compareStrategies } from './strategyComparison'
import { listRiskFactors, sensitivityVolunteerOnePercent } from './simulationRisk'

export type AgentJonesSimulationCommandSnapshot = {
  source: 'simulation_command_v1'
  generated_at_ms: number
  turnout_phase: string
  baseline_summary: {
    tracked_voters: number
    gotv_sites: number
    mean_coverage_pct: number
    active_events: number
    volunteer_roster: number
  }
  data_gaps: string[]
  comparison: {
    baseline_readiness: number
    scenario_labels: string[]
    top_scenario_label: string | null
    top_readiness: number | null
    recommendation_line: string
  }
  sensitivity: { volunteer_1pct_readiness_delta: number }
  risk_lines: string[]
  discipline_reminders: string[]
}

export function buildAgentJonesSimulationCommandSnapshot(input: {
  generatedAtMs: number
  baseline: CampaignSimulationBaseline
  scenarios: readonly StrategyScenario[]
}): AgentJonesSimulationCommandSnapshot {
  const cmp = compareStrategies(input.baseline, input.scenarios)
  const top = [...cmp.rows].sort((a, b) => b.readiness_index - a.readiness_index)[0]
  const sens = sensitivityVolunteerOnePercent(input.baseline)
  const risks = listRiskFactors(input.baseline)

  return {
    source: 'simulation_command_v1',
    generated_at_ms: input.generatedAtMs,
    turnout_phase: input.baseline.turnout_phase,
    baseline_summary: {
      tracked_voters: input.baseline.conversion.tracked_voters,
      gotv_sites: input.baseline.gotv.total_sites,
      mean_coverage_pct: input.baseline.gotv.mean_coverage_pct,
      active_events: input.baseline.programs.active_event_count,
      volunteer_roster: input.baseline.volunteers.roster_count,
    },
    data_gaps: [...input.baseline.data_gaps],
    comparison: {
      baseline_readiness: cmp.baseline_readiness,
      scenario_labels: cmp.rows.map((r) => r.label),
      top_scenario_label: top ? top.label : null,
      top_readiness: top ? top.readiness_index : null,
      recommendation_line: cmp.recommendation_line,
    },
    sensitivity: { volunteer_1pct_readiness_delta: sens.readiness_delta },
    risk_lines: risks.map((r) => r.line).slice(0, 5),
    discipline_reminders: [
      'Agent Jones does not invent turnout percentages or county-level vote math.',
      'Simulations are index models from visible CampaignOS aggregates — reconcile to field and finance.',
    ],
  }
}
