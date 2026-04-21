/**
 * Aggregates visible command metrics into a single baseline for simulations.
 */

import type { GotvProgramAnalytics } from './gotvAnalytics'
import type { FinanceLeadershipSummaryRow } from './financeDb'
import type { VoterConversionCountyRollupRow } from './voterConversionDb'
import type { GotvTurnoutPhase } from './gotvDomain'

export type CampaignSimulationBaseline = {
  source: 'campaign_simulation_baseline_v1'
  as_of_ms: number
  turnout_phase: GotvTurnoutPhase
  conversion: {
    tracked_voters: number
    supporters: number
    committed: number
    ballot_recorded: number
    supporter_rate: number | null
    committed_rate: number | null
  }
  gotv: {
    total_sites: number
    mean_coverage_pct: number
    red_site_count: number
    orange_site_count: number
  }
  programs: {
    active_event_count: number
  }
  finance: {
    total_donations: number
    total_expenses: number
    net: number
  }
  volunteers: {
    roster_count: number
    active_pipeline_count: number
    data_loaded: boolean
  }
  data_gaps: string[]
}

export function buildCampaignSimulationBaseline(input: {
  asOfMs: number
  phase: GotvTurnoutPhase
  voterRollups: readonly VoterConversionCountyRollupRow[]
  gotvAnalytics: GotvProgramAnalytics | null
  financeSummary: FinanceLeadershipSummaryRow | null
  activeProgramEventCount: number
  volunteerRosterCount: number
  volunteerActivePipelineCount: number
  volunteersLoaded: boolean
}): CampaignSimulationBaseline {
  let tracked = 0
  let supporters = 0
  let committed = 0
  let ballot = 0
  for (const r of input.voterRollups) {
    tracked += r.tracked_voters
    supporters += r.supporters
    committed += r.committed
    ballot += r.ballot_recorded
  }

  const gaps: string[] = []
  if (!input.voterRollups.length) gaps.push('voter_conversion_rollups_empty')
  if (!input.gotvAnalytics || input.gotvAnalytics.total_sites === 0) gaps.push('gotv_sites_sparse')
  if (!input.financeSummary) gaps.push('finance_summary_missing')
  if (!input.volunteersLoaded) gaps.push('volunteer_roster_not_loaded_for_route')
  if (input.activeProgramEventCount === 0) gaps.push('no_active_program_events')

  const supporter_rate = tracked > 0 ? Math.round((supporters / tracked) * 1000) / 1000 : null
  const committed_rate = tracked > 0 ? Math.round((committed / tracked) * 1000) / 1000 : null

  const fin = input.financeSummary

  return {
    source: 'campaign_simulation_baseline_v1',
    as_of_ms: input.asOfMs,
    turnout_phase: input.phase,
    conversion: {
      tracked_voters: tracked,
      supporters,
      committed,
      ballot_recorded: ballot,
      supporter_rate,
      committed_rate,
    },
    gotv: {
      total_sites: input.gotvAnalytics?.total_sites ?? 0,
      mean_coverage_pct: input.gotvAnalytics?.mean_coverage_pct ?? 0,
      red_site_count: input.gotvAnalytics?.red_site_count ?? 0,
      orange_site_count: input.gotvAnalytics?.orange_site_count ?? 0,
    },
    programs: {
      active_event_count: input.activeProgramEventCount,
    },
    finance: {
      total_donations: fin?.total_donations ?? 0,
      total_expenses: fin?.total_expenses ?? 0,
      net: fin ? fin.total_donations - fin.total_expenses : 0,
    },
    volunteers: {
      roster_count: input.volunteerRosterCount,
      active_pipeline_count: input.volunteerActivePipelineCount,
      data_loaded: input.volunteersLoaded,
    },
    data_gaps: gaps,
  }
}
