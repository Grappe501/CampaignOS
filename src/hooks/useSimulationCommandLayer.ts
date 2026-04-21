import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { buildCampaignSimulationBaseline } from '../lib/campaignSimulationBaseline'
import { BUILT_IN_SCENARIOS, customScenario } from '../lib/scenarioBuilder'
import type { ScenarioInputVariables, StrategyScenario } from '../lib/simulationDomain'
import { clampScenarioVariables } from '../lib/simulationDomain'
import { runSimulation } from '../lib/simulationEngine'
import { compareStrategies } from '../lib/strategyComparison'
import { listRiskFactors, sensitivityVolunteerOnePercent, simulationConfidence } from '../lib/simulationRisk'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import { useGotvCommandLayer } from './useGotvCommandLayer'
import { useVoterConversionLeadership } from './useVoterConversionLeadership'
import { useVolunteerCommandCoordinator } from './useVolunteerCommandCoordinator'
import { useFinanceCommandLayer } from './useFinanceCommandLayer'

export function useSimulationCommandLayer(primaryRole: string | null | undefined) {
  const location = useLocation()
  const simPage = location.pathname === '/events/simulation-command'
  const enabled = canAccessEventCoordinatorDesk(primaryRole)
  const loadVolunteers = enabled && simPage && !isDevAuthBypassEnabled()

  const voterConv = useVoterConversionLeadership(primaryRole)
  const gotv = useGotvCommandLayer('default')
  const finance = useFinanceCommandLayer(primaryRole)
  const volDesk = useVolunteerCommandCoordinator('default', loadVolunteers)
  const { events } = useCampaignEventsContext()

  const programEvents = useMemo(() => {
    return events.filter((e) => {
      const s = String(e.stage_status ?? '').toLowerCase()
      return s !== 'canceled' && s !== 'archived'
    })
  }, [events])

  const [customVars, setCustomVars] = useState<ScenarioInputVariables>(() =>
    clampScenarioVariables({
      volunteer_capacity_delta: 0.15,
      program_event_pace_delta: 0.2,
      field_vs_media_budget_shift: 0,
      gotv_coverage_lift_pct_points: 5,
      county_focus_id: null,
    }),
  )

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 120_000)
    return () => window.clearInterval(id)
  }, [])

  const baseline = useMemo(() => {
    const now = nowMs
    const funnel = volDesk.funnel
    const activePipe = loadVolunteers ? funnel.active + funnel.ready + funnel.onboarding : 0
    return buildCampaignSimulationBaseline({
      asOfMs: now,
      phase: gotv.phaseResolution.phase,
      voterRollups: voterConv.rollups,
      gotvAnalytics: gotv.analytics,
      financeSummary: finance.summary,
      activeProgramEventCount: programEvents.length,
      volunteerRosterCount: loadVolunteers ? volDesk.volunteers.length : 0,
      volunteerActivePipelineCount: activePipe,
      volunteersLoaded: loadVolunteers && !volDesk.loading,
    })
  }, [
    gotv.phaseResolution.phase,
    gotv.analytics,
    voterConv.rollups,
    finance.summary,
    programEvents.length,
    volDesk.volunteers.length,
    volDesk.funnel,
    volDesk.loading,
    loadVolunteers,
    nowMs,
  ])

  const builtInCompare = useMemo(
    () => compareStrategies(baseline, BUILT_IN_SCENARIOS),
    [baseline],
  )

  const customScenarioObj = useMemo(
    () => customScenario('custom', 'Custom mix', customVars),
    [customVars],
  )

  const customRun = useMemo(() => {
    const out = runSimulation(baseline, customVars)
    return {
      outputs: out,
      confidence: simulationConfidence(baseline),
    }
  }, [baseline, customVars])

  const risks = useMemo(() => listRiskFactors(baseline), [baseline])
  const sensitivity = useMemo(() => sensitivityVolunteerOnePercent(baseline), [baseline])

  const dataLoading =
    voterConv.loading ||
    gotv.loading ||
    finance.loading ||
    finance.voterConvLoading ||
    (loadVolunteers && volDesk.loading)

  const error = voterConv.error ?? gotv.error?.message ?? finance.error ?? volDesk.error?.message ?? null

  return {
    enabled,
    simPage,
    baseline,
    builtInCompare,
    customVars,
    setCustomVars: (v: ScenarioInputVariables) => setCustomVars(clampScenarioVariables(v)),
    customScenario: customScenarioObj,
    customRun,
    risks,
    sensitivity,
    dataLoading,
    error,
    refreshFinance: finance.refresh,
    scenariosForAgentJones: [...BUILT_IN_SCENARIOS, customScenarioObj] satisfies StrategyScenario[],
  }
}
