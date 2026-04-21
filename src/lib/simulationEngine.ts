/**
 * Deterministic simulation — outputs are **indices and deltas**, not predicted vote totals.
 *
 * Grounding:
 * - Turnout readiness blends GOTV coverage, critical sites, and committed voter share.
 * - Volunteer capacity scales roster + pipeline with stated elasticity.
 * - Conversion delta ties to volunteer + event levers with capped elasticity (no compounding fantasy).
 */

import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import type { ScenarioInputVariables, SimulationOutputs } from './simulationDomain'

const ELASTICITY_VOL_TO_SUPPORTER_PP = 0.06
const ELASTICITY_EVENT_TO_SUPPORTER_PP = 0.04
const ELASTICITY_FIELD_SHIFT_TO_READINESS = 4
const COVERAGE_WEIGHT = 0.45
const RED_PENALTY = 6
const ORANGE_PENALTY = 2
const COMMITTED_WEIGHT = 40

function baselineTurnoutReadinessIndex(b: CampaignSimulationBaseline): number {
  const cov = Math.max(0, Math.min(100, b.gotv.mean_coverage_pct))
  const red = b.gotv.red_site_count
  const orange = b.gotv.orange_site_count
  const committedRate = b.conversion.committed_rate ?? 0
  const idx = cov * COVERAGE_WEIGHT + committedRate * COMMITTED_WEIGHT - red * RED_PENALTY - orange * ORANGE_PENALTY
  return Math.max(0, Math.min(100, Math.round(idx * 10) / 10))
}

export function computeVolunteerCapacityIndex(b: CampaignSimulationBaseline, volDelta: number): number {
  const baseRoster = Math.max(0, b.volunteers.roster_count)
  const basePipe = Math.max(0, b.volunteers.active_pipeline_count)
  const effective = baseRoster + basePipe * 0.35
  const scaled = effective * (1 + volDelta)
  const denom = Math.max(1, effective)
  return Math.round((scaled / denom) * 1000) / 10
}

export function runSimulation(
  baseline: CampaignSimulationBaseline,
  variables: ScenarioInputVariables,
): SimulationOutputs {
  const baseIdx = baselineTurnoutReadinessIndex(baseline)
  const volIdx = computeVolunteerCapacityIndex(baseline, variables.volunteer_capacity_delta)
  const baseVolIdx = computeVolunteerCapacityIndex(baseline, 0)

  const coverageAdj = Math.max(
    -20,
    Math.min(20, variables.gotv_coverage_lift_pct_points * 0.35),
  )
  const fieldShiftAdj = variables.field_vs_media_budget_shift * ELASTICITY_FIELD_SHIFT_TO_READINESS

  const eventBoost = variables.program_event_pace_delta * 5
  const readinessDelta =
    coverageAdj +
    fieldShiftAdj +
    eventBoost +
    variables.volunteer_capacity_delta * 8 -
    Math.max(0, variables.volunteer_capacity_delta - 0.5) * 2

  const nextIdx = Math.max(0, Math.min(100, Math.round((baseIdx + readinessDelta) * 10) / 10))

  const projectedSupporterDeltaPp =
    Math.round(
      (variables.volunteer_capacity_delta * ELASTICITY_VOL_TO_SUPPORTER_PP +
        variables.program_event_pace_delta * ELASTICITY_EVENT_TO_SUPPORTER_PP) *
        1000,
    ) / 10

  const geoLine = variables.county_focus_id
    ? `Scenario emphasizes county “${variables.county_focus_id}” in narrative only — still aggregate model.`
    : `Geography: ${baseline.gotv.total_sites} GOTV site(s), ${baseline.programs.active_event_count} active program event(s).`

  const accounting_lines: string[] = [
    `Baseline readiness ${baseIdx} from coverage ${baseline.gotv.mean_coverage_pct}%, red/orange sites ${baseline.gotv.red_site_count}/${baseline.gotv.orange_site_count}, committed rate ${((baseline.conversion.committed_rate ?? 0) * 100).toFixed(1)}%.`,
    `Volunteer capacity index ${volIdx} vs baseline ${baseVolIdx} (Δ roster assumption ${(variables.volunteer_capacity_delta * 100).toFixed(0)}%).`,
    `Lever adjustments applied: coverage lift ${variables.gotv_coverage_lift_pct_points} pts (scaled), field/media shift ${(variables.field_vs_media_budget_shift * 100).toFixed(0)}%, event pace ${(variables.program_event_pace_delta * 100).toFixed(0)}%.`,
    'Projection is an index for tradeoff discussion — not a ballot or turnout percentage forecast.',
  ]

  return {
    turnout_readiness_index: nextIdx,
    turnout_readiness_index_delta: Math.round((nextIdx - baseIdx) * 10) / 10,
    volunteer_capacity_index: volIdx,
    volunteer_capacity_index_delta: Math.round((volIdx - baseVolIdx) * 10) / 10,
    projected_supporter_rate_delta_pp: projectedSupporterDeltaPp,
    geographic_emphasis_line: geoLine,
    accounting_lines,
  }
}
