/**
 * Compare baseline vs one or more scenarios (deterministic).
 */

import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import type { ScenarioInputVariables, SimulationRunResult, StrategyScenario } from './simulationDomain'
import { runSimulation } from './simulationEngine'
import { simulationConfidence } from './simulationRisk'

const ZERO: ScenarioInputVariables = {
  volunteer_capacity_delta: 0,
  program_event_pace_delta: 0,
  field_vs_media_budget_shift: 0,
  gotv_coverage_lift_pct_points: 0,
  county_focus_id: null,
}

export type StrategyComparisonRow = {
  scenario_id: string
  label: string
  readiness_index: number
  readiness_delta: number
  volunteer_capacity_index: number
  supporter_rate_delta_pp: number
  confidence: SimulationRunResult['confidence']
}

export function compareStrategies(
  baseline: CampaignSimulationBaseline,
  scenarios: readonly StrategyScenario[],
): {
  baseline_readiness: number
  rows: StrategyComparisonRow[]
  recommendation_line: string
} {
  const baselineReadiness = runSimulation(baseline, ZERO).turnout_readiness_index

  const rows: StrategyComparisonRow[] = scenarios.map((s) => {
    const out = runSimulation(baseline, s.variables)
    const conf = simulationConfidence(baseline)
    return {
      scenario_id: s.id,
      label: s.label,
      readiness_index: out.turnout_readiness_index,
      readiness_delta: Math.round((out.turnout_readiness_index - baselineReadiness) * 10) / 10,
      volunteer_capacity_index: out.volunteer_capacity_index,
      supporter_rate_delta_pp: out.projected_supporter_rate_delta_pp,
      confidence: conf,
    }
  })

  const best = [...rows].sort((a, b) => b.readiness_index - a.readiness_index)[0]
  const recommendation_line = best
    ? `Highest readiness index in this table: “${best.label}” (${best.readiness_index}, Δ vs baseline ${best.readiness_delta >= 0 ? '+' : ''}${best.readiness_delta}) — confirm against finance and field reality.`
    : 'No scenarios to compare.'

  return {
    baseline_readiness: baselineReadiness,
    rows,
    recommendation_line,
  }
}
