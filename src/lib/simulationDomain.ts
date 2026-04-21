/**
 * Campaign simulation & strategy — domain types (grounded projections only; no invented voter file).
 */

import type { GotvTurnoutPhase } from './gotvDomain'

export const SIMULATION_CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'insufficient_data'] as const
export type SimulationConfidenceLevel = (typeof SIMULATION_CONFIDENCE_LEVELS)[number]

/** Levers operators can adjust — all relative to baseline snapshot. */
export type ScenarioInputVariables = {
  /** e.g. 0.2 = +20% volunteer capacity assumption */
  volunteer_capacity_delta: number
  /** e.g. 0.5 = +50% program event pace */
  program_event_pace_delta: number
  /** Shift share of envelope from media → field (−1…1). Positive = more field, less media. */
  field_vs_media_budget_shift: number
  /** Additive points to assumed GOTV coverage % (cap in engine). */
  gotv_coverage_lift_pct_points: number
  /** Optional: emphasize one county id in geographic readout (no microtargeting claims). */
  county_focus_id: string | null
}

export type ScenarioConstraints = {
  max_volunteer_delta: number
  max_event_delta: number
  max_budget_shift: number
  max_coverage_lift_points: number
}

export const DEFAULT_SCENARIO_CONSTRAINTS: ScenarioConstraints = {
  max_volunteer_delta: 1.0,
  max_event_delta: 1.0,
  max_budget_shift: 0.85,
  max_coverage_lift_points: 25,
}

export type StrategyScenario = {
  id: string
  label: string
  description: string
  variables: ScenarioInputVariables
}

/** Outputs are directional indices / deltas vs baseline, not ballot totals. */
export type SimulationOutputs = {
  /** 0–100 composite from coverage + conversion + volunteer scale (see engine docstring). */
  turnout_readiness_index: number
  turnout_readiness_index_delta: number
  /** Relative contact-capacity score (baseline = 100). */
  volunteer_capacity_index: number
  volunteer_capacity_index_delta: number
  /** Estimated supporter-rate delta in percentage points (−100…100 scale, typically small). */
  projected_supporter_rate_delta_pp: number
  /** Plain-language geographic emphasis line. */
  geographic_emphasis_line: string
  /** Audit lines — how the model used baseline data. */
  accounting_lines: string[]
}

export type SimulationRunResult = {
  scenario_id: string
  scenario_label: string
  outputs: SimulationOutputs
  confidence: SimulationConfidenceLevel
  phase: GotvTurnoutPhase
}

export function clampScenarioVariables(
  v: ScenarioInputVariables,
  c: ScenarioConstraints = DEFAULT_SCENARIO_CONSTRAINTS,
): ScenarioInputVariables {
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
  return {
    volunteer_capacity_delta: clamp(v.volunteer_capacity_delta, -c.max_volunteer_delta, c.max_volunteer_delta),
    program_event_pace_delta: clamp(v.program_event_pace_delta, -c.max_event_delta, c.max_event_delta),
    field_vs_media_budget_shift: clamp(v.field_vs_media_budget_shift, -c.max_budget_shift, c.max_budget_shift),
    gotv_coverage_lift_pct_points: clamp(
      v.gotv_coverage_lift_pct_points,
      -c.max_coverage_lift_points,
      c.max_coverage_lift_points,
    ),
    county_focus_id: v.county_focus_id?.trim() ? v.county_focus_id.trim().slice(0, 120) : null,
  }
}
