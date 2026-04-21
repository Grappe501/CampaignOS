/**
 * Named scenarios + variable presets for the simulation engine.
 */

import {
  clampScenarioVariables,
  type ScenarioInputVariables,
  type StrategyScenario,
} from './simulationDomain'

const baseVars = (v: Partial<ScenarioInputVariables>): ScenarioInputVariables =>
  clampScenarioVariables({
    volunteer_capacity_delta: v.volunteer_capacity_delta ?? 0,
    program_event_pace_delta: v.program_event_pace_delta ?? 0,
    field_vs_media_budget_shift: v.field_vs_media_budget_shift ?? 0,
    gotv_coverage_lift_pct_points: v.gotv_coverage_lift_pct_points ?? 0,
    county_focus_id: v.county_focus_id ?? null,
  })

export const BUILT_IN_SCENARIOS: readonly StrategyScenario[] = [
  {
    id: 'baseline',
    label: 'Baseline (snapshot)',
    description: 'No lever changes — reproduces current readiness index.',
    variables: baseVars({}),
  },
  {
    id: 'volunteer_surge_20',
    label: 'Volunteer capacity +20%',
    description: 'Assume one-fifth more roster capacity for contact work.',
    variables: baseVars({ volunteer_capacity_delta: 0.2 }),
  },
  {
    id: 'events_double_county',
    label: 'Program pace +50%',
    description: 'More canvasses/visibility weekends at current quality.',
    variables: baseVars({ program_event_pace_delta: 0.5 }),
  },
  {
    id: 'field_over_media',
    label: 'Shift spend: field > media',
    description: 'Reallocate share toward field ops vs paid media (envelope model).',
    variables: baseVars({ field_vs_media_budget_shift: 0.35 }),
  },
  {
    id: 'gotv_coverage_push',
    label: 'GOTV coverage +10 pts',
    description: 'Close more shift gaps at polling places (upper bound capped in engine).',
    variables: baseVars({ gotv_coverage_lift_pct_points: 10 }),
  },
]

export function scenarioById(id: string): StrategyScenario | undefined {
  return BUILT_IN_SCENARIOS.find((s) => s.id === id)
}

export function customScenario(
  id: string,
  label: string,
  variables: ScenarioInputVariables,
): StrategyScenario {
  return {
    id,
    label,
    description: 'Custom lever mix',
    variables: clampScenarioVariables(variables),
  }
}
