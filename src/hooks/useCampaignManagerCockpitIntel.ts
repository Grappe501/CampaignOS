import { useEffect, useMemo, useState } from 'react'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { useCampaignStaffingBulk } from './useCampaignStaffingBulk'
import { buildLeadershipBriefing } from '../lib/leadershipBriefingService'
import { emphasisFromRole } from '../lib/leadershipBriefingAccess'
import { loadLeadershipKpiPrior } from '../lib/leadershipBriefingKpiStorage'
import { filterProgramEventsForOrchestration } from '../lib/eventAi/eventAiProgramEvents'
import type { CampaignProfile } from './useProfile'

/**
 * Deterministic operational picture for cockpit chrome (same engine as leadership briefing).
 */
export function useCampaignManagerCockpitIntel(profile: CampaignProfile | null) {
  const { events } = useCampaignEventsContext()
  const programEvents = useMemo(() => filterProgramEventsForOrchestration(events), [events])
  const eventIds = useMemo(() => programEvents.map((e) => e.event_id), [programEvents])
  const { assignmentMap } = useCampaignStaffingBulk(eventIds)

  const [asOfMs, setAsOfMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAsOfMs(Date.now()), 120000)
    return () => window.clearInterval(id)
  }, [])

  const snapshot = useMemo(
    () =>
      buildLeadershipBriefing(programEvents, asOfMs, {
        emphasis: emphasisFromRole(profile?.primary_role),
        assignmentMap,
        priorKpi: loadLeadershipKpiPrior(),
      }),
    [programEvents, asOfMs, assignmentMap, profile?.primary_role],
  )

  return { snapshot, programEvents, assignmentMap }
}
