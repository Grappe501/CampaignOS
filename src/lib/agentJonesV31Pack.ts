import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { buildAgentJonesCalendarSummary } from './agentJonesCalendarSignals'
import type {
  AgentJonesCoordinatorOpsContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'
import { buildAgentJonesLeadershipCommand } from './agentJonesLeadershipCommand'
import { buildAgentJonesProactiveAlerts } from './agentJonesProactiveAlerts'
import { buildAgentJonesReadinessCoverage } from './agentJonesReadinessSignals'

export type AgentJonesV31Pack = {
  calendar_summary: ReturnType<typeof buildAgentJonesCalendarSummary>
  proactive_alerts: ReturnType<typeof buildAgentJonesProactiveAlerts>
  leadership_command: ReturnType<typeof buildAgentJonesLeadershipCommand>
  readiness_coverage: ReturnType<typeof buildAgentJonesReadinessCoverage>
}

export function buildAgentJonesV31Pack(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  volunteerMission: AgentJonesVolunteerMissionContext | null
  dailyActivation: AgentJonesDailyActivationContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  profile: CampaignProfile | null
  progressSlice: DashboardProgressSlice
  internLayer: AgentJonesInternLayerContext | null
}): AgentJonesV31Pack {
  const calendar_summary = buildAgentJonesCalendarSummary({
    operating: input.operating,
    volunteerMission: input.volunteerMission,
    dailyActivation: input.dailyActivation,
    coordinatorOps: input.coordinatorOps,
  })
  const proactive_alerts = buildAgentJonesProactiveAlerts({
    operating: input.operating,
    volunteerMission: input.volunteerMission,
    dailyActivation: input.dailyActivation,
    coordinatorOps: input.coordinatorOps,
    leadershipSnapshot: input.leadershipSnapshot,
    calendarSummary: calendar_summary,
    exceptionRequestedAt: input.profile?.exception_requested_at
      ? String(input.profile.exception_requested_at).trim()
      : null,
    progressSlice: input.progressSlice,
  })
  const leadership_command = buildAgentJonesLeadershipCommand({
    surface: input.surface,
    operating: input.operating,
    coordinatorOps: input.coordinatorOps,
    leadershipSnapshot: input.leadershipSnapshot,
    calendarSummary: calendar_summary,
  })
  const readiness_coverage = buildAgentJonesReadinessCoverage({
    surface: input.surface,
    operating: input.operating,
    progressSlice: input.progressSlice,
    volunteerMission: input.volunteerMission,
    internLayer: input.internLayer,
    coordinatorOps: input.coordinatorOps,
    calendarSummary: calendar_summary,
  })
  return {
    calendar_summary,
    proactive_alerts,
    leadership_command,
    readiness_coverage,
  }
}
