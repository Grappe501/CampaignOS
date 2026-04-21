import { describe, expect, it } from 'vitest'
import type { CampaignSimulationBaseline } from './campaignSimulationBaseline'
import { listRiskFactors, simulationConfidence, sensitivityVolunteerOnePercent } from './simulationRisk'

const thin = (): CampaignSimulationBaseline => ({
  source: 'campaign_simulation_baseline_v1',
  as_of_ms: 0,
  turnout_phase: 'post_election_review',
  conversion: {
    tracked_voters: 40,
    supporters: 10,
    committed: 2,
    ballot_recorded: 0,
    supporter_rate: 0.25,
    committed_rate: 0.05,
  },
  gotv: { total_sites: 0, mean_coverage_pct: 0, red_site_count: 0, orange_site_count: 0 },
  programs: { active_event_count: 0 },
  finance: { total_donations: 0, total_expenses: 0, net: 0 },
  volunteers: { roster_count: 0, active_pipeline_count: 0, data_loaded: false },
  data_gaps: ['voter_conversion_rollups_empty', 'gotv_sites_sparse', 'finance_summary_missing'],
})

describe('simulationConfidence', () => {
  it('returns insufficient_data when gaps heavy', () => {
    const b = thin()
    expect(simulationConfidence(b)).toBe('insufficient_data')
  })
})

describe('listRiskFactors', () => {
  it('flags GOTV sparse', () => {
    const ids = listRiskFactors(thin()).map((r) => r.id)
    expect(ids).toContain('gotv_sparse')
  })
})

describe('sensitivityVolunteerOnePercent', () => {
  it('returns finite delta', () => {
    const b = thin()
    const s = sensitivityVolunteerOnePercent(b)
    expect(Number.isFinite(s.readiness_delta)).toBe(true)
  })
})
