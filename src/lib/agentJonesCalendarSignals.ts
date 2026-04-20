import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesDailyActivationContext,
  AgentJonesOperatingContext,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'

function missionDueWindow(m: AgentJonesVolunteerMissionContext | null): {
  nextTitle: string | null
  nextAt: string | null
  count7d: number
} {
  if (!m?.next_assignment_due_at) {
    const c = m?.assignments_due_within_7d_count ?? 0
    return { nextTitle: null, nextAt: null, count7d: c }
  }
  return {
    nextTitle: m.next_best_title ?? m.active_summaries[0]?.title ?? null,
    nextAt: m.next_assignment_due_at ?? null,
    count7d: m.assignments_due_within_7d_count ?? 0,
  }
}

export function buildAgentJonesCalendarSummary(input: {
  operating: AgentJonesOperatingContext
  volunteerMission: AgentJonesVolunteerMissionContext | null
  dailyActivation: AgentJonesDailyActivationContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
}): AgentJonesCalendarSummary | null {
  const m = input.volunteerMission
  const d = input.dailyActivation
  const ops = input.coordinatorOps
  const { nextTitle, nextAt, count7d } = missionDueWindow(m)

  const dailyRemaining =
    d && d.total_today > 0 ? Math.max(0, d.total_today - d.completed_today) : 0
  const dailyPressure = dailyRemaining > 0

  let gov = 0
  if (input.operating.exception_summary.pending_review) gov += 1
  const esc = input.operating.command_summary.attention_now.some((l) =>
    l.toLowerCase().includes('escalat'),
  )
  if (esc) gov += 1
  if (ops?.has_supervisor_scope && ops.blocked_count > 0) {
    gov += Math.min(8, ops.blocked_count)
  }

  /** Supervised assignments visible as assigned-but-not-started — not org-wide staffing. */
  let staffingGap: number | null = null
  if (
    ops?.has_supervisor_scope &&
    ops.assigned_not_started_count > 0 &&
    !ops.desk_loading
  ) {
    staffingGap = Math.min(500, ops.assigned_not_started_count)
  }

  const hasTiming = Boolean(nextAt) || count7d > 0 || dailyPressure
  const hasCoordPressure =
    Boolean(ops?.has_supervisor_scope) &&
    (ops.blocked_count > 0 || ops.overdue_count > 0)
  if (!hasTiming && gov === 0 && staffingGap == null && !hasCoordPressure) return null

  return {
    next_event_title: null,
    next_event_at: null,
    next_deadline_title: nextTitle,
    next_deadline_at: nextAt,
    upcoming_count_7d: count7d > 0 ? count7d : dailyPressure ? 1 : null,
    staffing_gap_count: staffingGap,
    governance_warning_count: gov > 0 ? gov : null,
    has_meaningful_upcoming_activity:
      hasTiming || gov > 0 || staffingGap != null || hasCoordPressure,
  }
}
