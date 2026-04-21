import { describe, expect, it } from 'vitest'
import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import { runSimulation, computeVolunteerCapacityIndex } from './simulationEngine'

const minimalBaseline = (): CampaignSimulationBaseline => ({
  source: 'campaign_simulation_baseline_v1',
  as_of_ms: 0,
  turnout_phase: 'early_vote_sustain',
  conversion: {
    tracked_voters: 1000,
    supporters: 400,
    committed: 120,
    ballot_recorded: 30,
    supporter_rate: 0.4,
    committed_rate: 0.12,
  },
  gotv: {
    total_sites: 10,
    mean_coverage_pct: 70,
    red_site_count: 1,
    orange_site_count: 2,
  },
  programs: { active_event_count: 8 },
  finance: { total_donations: 100_000, total_expenses: 80_000, net: 20_000 },
  volunteers: { roster_count: 50, active_pipeline_count: 20, data_loaded: true },
  data_gaps: [],
})

describe('runSimulation', () => {
  it('baseline levers yield zero volunteer capacity delta', () => {
    const b = minimalBaseline()
    const out = runSimulation(b, {
      volunteer_capacity_delta: 0,
      program_event_pace_delta: 0,
      field_vs_media_budget_shift: 0,
      gotv_coverage_lift_pct_points: 0,
      county_focus_id: null,
    })
    expect(out.volunteer_capacity_index_delta).toBe(0)
  })

  it('increases readiness when GOTV coverage lift positive', () => {
    const b = minimalBaseline()
    const base = runSimulation(b, {
      volunteer_capacity_delta: 0,
      program_event_pace_delta: 0,
      field_vs_media_budget_shift: 0,
      gotv_coverage_lift_pct_points: 0,
      county_focus_id: null,
    })
    const lifted = runSimulation(b, {
      volunteer_capacity_delta: 0,
      program_event_pace_delta: 0,
      field_vs_media_budget_shift: 0,
      gotv_coverage_lift_pct_points: 15,
      county_focus_id: null,
    })
    expect(lifted.turnout_readiness_index).toBeGreaterThan(base.turnout_readiness_index)
  })
})

describe('computeVolunteerCapacityIndex', () => {
  it('scales with volunteer delta', () => {
    const b = minimalBaseline()
    const a = computeVolunteerCapacityIndex(b, 0)
    const up = computeVolunteerCapacityIndex(b, 0.2)
    expect(up).toBeGreaterThan(a)
  })
})
