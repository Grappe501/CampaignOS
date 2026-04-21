/**
 * Confidence & sensitivity — honest degradation when inputs are thin.
 */

import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import type { SimulationConfidenceLevel } from './simulationDomain'
import { runSimulation } from './simulationEngine'

export function simulationConfidence(baseline: CampaignSimulationBaseline): SimulationConfidenceLevel {
  const gaps = baseline.data_gaps.length
  const tracked = baseline.conversion.tracked_voters
  if (gaps >= 3 || tracked < 50) return 'insufficient_data'
  if (gaps >= 2 || tracked < 200) return 'low'
  if (gaps >= 1) return 'medium'
  return 'high'
}

export type SimulationRiskFactor = {
  id: string
  severity: 'watch' | 'elevated'
  line: string
}

export function listRiskFactors(baseline: CampaignSimulationBaseline): SimulationRiskFactor[] {
  const out: SimulationRiskFactor[] = []
  if (baseline.data_gaps.includes('gotv_sites_sparse')) {
    out.push({
      id: 'gotv_sparse',
      severity: 'elevated',
      line: 'GOTV site snapshot is thin — readiness index is mostly conversion + assumptions.',
    })
  }
  if (baseline.data_gaps.includes('volunteer_roster_not_loaded_for_route')) {
    out.push({
      id: 'vol_unloaded',
      severity: 'watch',
      line: 'Volunteer roster not loaded in this session — capacity index may understate reality.',
    })
  }
  if (baseline.gotv.red_site_count >= 3) {
    out.push({
      id: 'red_sites',
      severity: 'elevated',
      line: 'Multiple critical polling sites — real-world variance dominates small model deltas.',
    })
  }
  if (baseline.finance.net < 0 && baseline.finance.total_expenses > 0) {
    out.push({
      id: 'net_negative',
      severity: 'watch',
      line: 'Net burn in finance snapshot — scale scenarios may bump against cash constraints (not modeled here).',
    })
  }
  return out.slice(0, 6)
}

/** One-at-a-time sensitivity: bump volunteer lever +1% and report readiness delta. */
export function sensitivityVolunteerOnePercent(
  baseline: CampaignSimulationBaseline,
): { readiness_delta: number } {
  const zero = {
    volunteer_capacity_delta: 0,
    program_event_pace_delta: 0,
    field_vs_media_budget_shift: 0,
    gotv_coverage_lift_pct_points: 0,
    county_focus_id: null as string | null,
  }
  const base = runSimulation(baseline, zero)
  const bumped = runSimulation(baseline, { ...zero, volunteer_capacity_delta: 0.01 })
  return {
    readiness_delta: Math.round((bumped.turnout_readiness_index - base.turnout_readiness_index) * 100) / 100,
  }
}
