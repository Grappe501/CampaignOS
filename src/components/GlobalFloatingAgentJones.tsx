import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useVoterMatch } from '../hooks/useVoterMatch'
import { usePower5Workspace } from '../hooks/usePower5Workspace'
import { usePower5Propagation } from '../hooks/usePower5Propagation'
import { useVolunteerTasks } from '../hooks/useVolunteerTasks'
import { useDailyMission } from '../hooks/useDailyMission'
import { useInternLayer } from '../hooks/useInternLayer'
import { useCampaignKpis } from '../hooks/useCampaignKpis'
import { useCampaignOperatingPicture } from '../hooks/useCampaignOperatingPicture'
import { useCoordinatorDesk } from '../hooks/useCoordinatorDesk'
import {
  buildAgentJonesRelationalPower5Context,
  agentJonesSurfaceFromPathname,
} from '../lib/agentJonesContextV2'
import {
  buildAgentJonesCoordinatorOps,
  buildAgentJonesLeadershipSnapshot,
} from '../lib/agentJonesDeskContext'
import {
  countEarlyStagePower5Nodes,
  getPower5SuggestedNextLine,
} from '../lib/power5DashboardHints'
import {
  getDashboardProgressSlice,
  normalizeKey,
} from '../lib/dashboardState'
import FloatingAgentJones from './FloatingAgentJones'
import { useEventIntelligenceRegistry } from '../context/EventIntelligenceLayerContext'
import { useLeadershipExecutiveBriefing } from '../hooks/useLeadershipExecutiveBriefing'
import { useVolunteerCommandDesk } from '../hooks/useVolunteerCommandDesk'

/**
 * Single campaign assistant entry point for all authenticated routes (mounted from `App`).
 */
export default function GlobalFloatingAgentJones() {
  const location = useLocation()
  const { profile, loading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const primaryRole =
    profile?.primary_role != null ? String(profile.primary_role) : null

  const voterMatch = useVoterMatch(profileId, {
    onAfterMatch: () => void refetch(),
  })
  const voterLinked =
    Boolean(voterMatch.matched) ||
    Boolean(
      profile?.linked_voter_id != null && String(profile.linked_voter_id).trim() !== '',
    )
  const voterMatched = voterLinked

  const progressSlice = getDashboardProgressSlice({
    profile,
    voterMatched,
    voterLoading: voterMatch.matchedLoading,
  })

  const power5Workspace = usePower5Workspace(profileId)
  const power5Propagation = usePower5Propagation(profileId)
  const volunteerTasks = useVolunteerTasks(profileId)
  const dailyMission = useDailyMission(profileId)
  const internDesk = useInternLayer(profileId, primaryRole)
  const campaignKpis = useCampaignKpis(profileId, primaryRole)
  const campaignOperatingPicture = useCampaignOperatingPicture({
    kpiRows: campaignKpis.kpis,
  })
  const coordinatorDesk = useCoordinatorDesk(profile?.power5_home_team_id)
  const { layer: eventIntelligenceLayer } = useEventIntelligenceRegistry()
  const { agentPayload: leadershipExecutivePayload } = useLeadershipExecutiveBriefing()
  const volunteerCommandDesk = useVolunteerCommandDesk()

  const agentJonesRelationalPower5 = useMemo(
    () =>
      buildAgentJonesRelationalPower5Context({
        totalNodes: power5Workspace.nodes.length,
        contacted: power5Workspace.impact.contacted,
        activated: power5Workspace.impact.activated,
        rosterMatched: power5Workspace.impact.matched,
        earlyStageCount: countEarlyStagePower5Nodes(power5Workspace.nodes),
        openManualRelays: power5Propagation.openRelayCount,
        recommendedNext: getPower5SuggestedNextLine(power5Workspace.nodes),
      }),
    [
      power5Workspace.nodes,
      power5Workspace.impact,
      power5Propagation.openRelayCount,
    ],
  )

  const agentJonesInternLayer = useMemo(() => {
    if (!internDesk.isIntern || !internDesk.agentInternContext) return null
    return {
      ...internDesk.agentInternContext,
      leadership_task_title: volunteerTasks.nextBest?.title ?? null,
    }
  }, [internDesk.isIntern, internDesk.agentInternContext, volunteerTasks.nextBest?.title])

  const coordinatorOps = useMemo(() => {
    if (location.pathname !== '/coordinator') return null
    return buildAgentJonesCoordinatorOps({
      hasSupervisorScope: coordinatorDesk.hasSupervisorScope,
      supervisedTeamCount: coordinatorDesk.supervisedTeams.length,
      buckets: coordinatorDesk.assignmentBuckets,
      internParsed: coordinatorDesk.internParsed,
      deskLoading: coordinatorDesk.loading,
    })
  }, [
    location.pathname,
    coordinatorDesk.hasSupervisorScope,
    coordinatorDesk.supervisedTeams.length,
    coordinatorDesk.assignmentBuckets,
    coordinatorDesk.internParsed,
    coordinatorDesk.loading,
  ])

  const leadershipSnapshot = useMemo(() => {
    if (location.pathname !== '/candidate') return null
    return buildAgentJonesLeadershipSnapshot(
      campaignKpis.kpis,
      campaignKpis.isLeadership ? campaignKpis.missions.length : 0,
    )
  }, [
    location.pathname,
    campaignKpis.kpis,
    campaignKpis.isLeadership,
    campaignKpis.missions.length,
  ])

  const progressionEpoch = useMemo(
    () =>
      [
        location.pathname,
        progressSlice,
        normalizeKey(profile?.onboarding_branch),
        normalizeKey(profile?.exception_request_status),
        voterMatched ? '1' : '0',
      ].join('|'),
    [
      location.pathname,
      progressSlice,
      profile?.onboarding_branch,
      profile?.exception_request_status,
      voterMatched,
    ],
  )

  const onProfileRefresh = useCallback(async () => {
    await refetch()
    await volunteerTasks.refetch()
    await dailyMission.refetch()
    await internDesk.refetch()
    await campaignKpis.refetch()
    await coordinatorDesk.refresh()
    await power5Workspace.reload()
    await power5Propagation.reload()
  }, [
    refetch,
    volunteerTasks,
    dailyMission,
    internDesk,
    campaignKpis,
    coordinatorDesk,
    power5Workspace,
    power5Propagation,
  ])

  if (loading && !profile) return null
  if (!profileId) return null

  return (
    <FloatingAgentJones
      progressionEpoch={progressionEpoch}
      progressSlice={progressSlice}
      profile={profile}
      voterLoading={voterMatch.matchedLoading}
      voterMatched={voterMatched}
      matchedVoter={voterMatch.matched}
      surface={agentJonesSurfaceFromPathname(location.pathname)}
      coordinatorHasSupervisorScope={coordinatorDesk.hasSupervisorScope}
      coordinatorOps={coordinatorOps}
      leadershipSnapshot={leadershipSnapshot}
      onProfileRefresh={onProfileRefresh}
      relationalPower5={agentJonesRelationalPower5}
      volunteerMission={volunteerTasks.agentMissionContext}
      dailyActivation={dailyMission.agentDailyContext}
      internLayer={agentJonesInternLayer}
      campaignGoals={campaignKpis.agentCampaignGoals}
      eventIntelligenceLayer={eventIntelligenceLayer}
      eventOperationsExecutive={leadershipExecutivePayload}
      campaignOperatingPicture={campaignOperatingPicture.copAgentSummary}
      volunteerThroughput={volunteerCommandDesk.agentJonesVolunteerThroughput}
    />
  )
}
