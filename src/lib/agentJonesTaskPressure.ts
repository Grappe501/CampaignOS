import type {
  AgentJonesCoordinatorOpsContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesTaskPressureSummary,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'

export function buildAgentJonesTaskPressure(input: {
  volunteerMission: AgentJonesVolunteerMissionContext | null
  dailyActivation: AgentJonesDailyActivationContext | null
  internLayer: AgentJonesInternLayerContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
}): AgentJonesTaskPressureSummary {
  const m = input.volunteerMission
  const d = input.dailyActivation
  const i = input.internLayer
  const o = input.coordinatorOps

  const mission_active = m?.active_summaries?.length ?? 0
  const mission_stalled = m?.stalled_titles?.length ?? 0
  const daily_remaining =
    d && d.total_today > 0 ? Math.max(0, d.total_today - d.completed_today) : null
  const intern_pipeline_assigned = i?.assigned_pipeline_count ?? 0
  const intern_overdue_first_contact = Math.max(
    i?.overdue_first_contact_count ?? 0,
    o?.intern_overdue_first_contact ?? 0,
  )
  const coord_blocked = o?.blocked_count ?? 0
  const coord_overdue = o?.overdue_count ?? 0
  const open_assignments = o?.open_assignments_total ?? 0

  const parts: string[] = []
  if (mission_stalled > 0) {
    parts.push(
      mission_stalled === 1
        ? '1 stalled mission'
        : `${mission_stalled} stalled missions`,
    )
  } else if (mission_active > 0) {
    parts.push(`${mission_active} active mission(s)`)
  }
  if (daily_remaining != null && daily_remaining > 0) {
    parts.push(`${daily_remaining} daily item(s) left today`)
  }
  if (intern_overdue_first_contact > 0) {
    parts.push(`intern first-contact overdue ×${intern_overdue_first_contact}`)
  }
  if (coord_blocked + coord_overdue > 0) {
    parts.push(`coord blocked ${coord_blocked} · overdue ${coord_overdue}`)
  } else if (open_assignments > 0 && o?.has_supervisor_scope) {
    parts.push(`${open_assignments} open supervised assignment(s)`)
  }
  const headline =
    parts.length > 0
      ? `Task pressure: ${parts.slice(0, 3).join('; ')}.`
      : 'Task pressure: no elevated lanes from visible counts — still scan missions and daily activation when you have time.'

  return {
    mission_active,
    mission_stalled,
    daily_remaining,
    intern_pipeline_assigned,
    intern_overdue_first_contact,
    coord_blocked,
    coord_overdue,
    open_assignments,
    headline: headline.slice(0, 220),
  }
}
