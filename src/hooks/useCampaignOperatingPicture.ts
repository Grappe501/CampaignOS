import { useEffect, useMemo, useState } from 'react'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { useCampaignStaffingBulk } from './useCampaignStaffingBulk'
import { useProfile } from './useProfile'
import { buildLeadershipBriefing } from '../lib/leadershipBriefingService'
import { emphasisFromRole } from '../lib/leadershipBriefingAccess'
import { loadLeadershipKpiPrior } from '../lib/leadershipBriefingKpiStorage'
import { filterProgramEventsForOrchestration } from '../lib/eventAi/eventAiProgramEvents'
import {
  buildCampaignOperatingPicture,
  type CampaignOperatingPicture,
} from '../lib/cop/copAggregationService'
import type { CampaignKpiRow } from '../lib/kpiEngine'
import { globalScope } from '../lib/cop/copScopes'
import { buildCopAgentSummary } from '../lib/cop/copAgentBridge'

export type UseCampaignOperatingPictureOptions = {
  /** When supplied (e.g. from parent `useCampaignKpis`), avoids duplicate KPI fetches. */
  kpiRows?: CampaignKpiRow[] | null
}

export function useCampaignOperatingPicture(
  options?: UseCampaignOperatingPictureOptions,
) {
  const { profile, loading: profileLoading } = useProfile()
  const { events } = useCampaignEventsContext()
  const programEvents = useMemo(
    () => filterProgramEventsForOrchestration(events),
    [events],
  )
  const eventIds = useMemo(() => programEvents.map((e) => e.event_id), [programEvents])
  const { assignmentMap } = useCampaignStaffingBulk(eventIds)

  const [asOfMs, setAsOfMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAsOfMs(Date.now()), 120000)
    return () => window.clearInterval(id)
  }, [])

  const priorKpi = useMemo(() => loadLeadershipKpiPrior(), [])

  const snapshot = useMemo(
    () =>
      buildLeadershipBriefing(programEvents, asOfMs, {
        emphasis: emphasisFromRole(profile?.primary_role),
        assignmentMap,
        priorKpi,
      }),
    [programEvents, asOfMs, assignmentMap, profile?.primary_role, priorKpi],
  )

  const kpis = options?.kpiRows ?? null

  const cop = useMemo((): CampaignOperatingPicture => {
    return buildCampaignOperatingPicture({
      snapshot,
      scope: globalScope(),
      assignmentMapLoaded: true,
      kpiRows: kpis ?? undefined,
    })
  }, [snapshot, kpis])

  const copAgentSummary = useMemo(() => buildCopAgentSummary(cop), [cop])

  return {
    cop,
    copAgentSummary,
    snapshot,
    profileLoading,
    generatedAtMs: snapshot.generated_at_ms,
  }
}
