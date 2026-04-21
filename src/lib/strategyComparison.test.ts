import { describe, expect, it } from 'vitest'
import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import { BUILT_IN_SCENARIOS } from './scenarioBuilder'
import { compareStrategies } from './strategyComparison'

const baseline = (): CampaignSimulationBaseline => ({
  source: 'campaign_simulation_baseline_v1',
  as_of_ms: 0,
  turnout_phase: 'election_day',
  conversion: {
    tracked_voters: 500,
    supporters: 200,
    committed: 80,
    ballot_recorded: 10,
    supporter_rate: 0.4,
    committed_rate: 0.16,
  },
  gotv: {
    total_sites: 5,
    mean_coverage_pct: 60,
    red_site_count: 0,
    orange_site_count: 1,
  },
  programs: { active_event_count: 4 },
  finance: { total_donations: 1, total_expenses: 1, net: 0 },
  volunteers: { roster_count: 30, active_pipeline_count: 10, data_loaded: true },
  data_gaps: [],
})

describe('compareStrategies', () => {
  it('includes baseline row and ranks scenarios', () => {
    const cmp = compareStrategies(baseline(), BUILT_IN_SCENARIOS)
    expect(cmp.rows.length).toBe(BUILT_IN_SCENARIOS.length)
    expect(cmp.baseline_readiness).toBeGreaterThanOrEqual(0)
    expect(cmp.recommendation_line.length).toBeGreaterThan(10)
  })
})
