import type { DashboardProgressSlice } from './dashboardState'
import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesInternLayerContext,
  AgentJonesOperatingContext,
  AgentJonesReadinessCoverage,
  AgentJonesSurface,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole } from './agentJonesRoleDesk'

function simplerReadinessForExecutionDesk(
  surface: AgentJonesSurface,
  role: AgentJonesNormalizedRole,
): boolean {
  if (
    surface === 'admin_desk' ||
    surface === 'candidate_desk' ||
    surface === 'coordinator_desk'
  ) {
    return false
  }
  if (surface === 'intern_desk') return true
  if (surface === 'volunteer_dashboard') {
    return role === 'volunteer' || role === 'intern'
  }
  return false
}

function deskLaneReadinessLine(deskHealth: AgentJonesOperatingContext['desk_health']): string | null {
  const urgent = Object.entries(deskHealth).filter(([, v]) => v === 'urgent')
  if (urgent.length) {
    return 'At least one desk lane is urgent in this view — align with command cards before expanding scope.'
  }
  const watch = Object.entries(deskHealth).filter(([, v]) => v === 'watch')
  if (watch.length >= 2) {
    return 'Multiple desk lanes are on watch — sequence fixes so one lane does not mask another.'
  }
  return null
}

function timingReadinessLine(
  mission: AgentJonesVolunteerMissionContext | null,
  cal: AgentJonesCalendarSummary | null,
): string | null {
  if (mission?.next_assignment_due_at) {
    return 'Assignment deadlines are active in this view — use Timing & deadlines and mission cards for the soonest dates.'
  }
  if (cal?.upcoming_count_7d != null && cal.upcoming_count_7d > 0) {
    return `${cal.upcoming_count_7d} timing-sensitive item(s) in the visible ~7 day window.`
  }
  return null
}

/** v3.1 — where execution looks thin or blocked (deterministic, visible state only). */
export function buildAgentJonesReadinessCoverage(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  progressSlice: DashboardProgressSlice
  volunteerMission: AgentJonesVolunteerMissionContext | null
  internLayer: AgentJonesInternLayerContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  calendarSummary: AgentJonesCalendarSummary | null
}): AgentJonesReadinessCoverage | null {
  const op = input.operating
  const role = op.normalized_role
  const simple = simplerReadinessForExecutionDesk(input.surface, role)
  const thin: string[] = []
  const summary: string[] = []

  if (input.progressSlice !== 'matched_ready') {
    summary.push(
      `Roster path: ${input.progressSlice.replace(/_/g, ' ')} — execution tools may be limited until this clears.`,
    )
  }

  if (op.exception_summary.pending_review) {
    thin.push('Voter-gated work stays thin while a roster exception is pending review.')
  }

  const stalled = input.volunteerMission?.stalled_titles?.length ?? 0
  if (stalled > 0) {
    thin.push(
      stalled === 1
        ? 'One stalled mission — the visible queue overstates real forward motion.'
        : `${stalled} stalled missions — knock the oldest down to restore honest coverage.`,
    )
  }

  const internOd = input.internLayer?.overdue_first_contact_count ?? 0
  if (internOd > 0) {
    thin.push(`${internOd} intern first-contact window(s) overdue — human reach-out coverage is thin.`)
  }

  const ops = input.coordinatorOps
  if (ops?.has_supervisor_scope && ops.overdue_count > 0) {
    thin.push(`Supervised board: ${ops.overdue_count} overdue row(s) — team execution coverage is thin there.`)
  }
  if (!simple && ops?.has_supervisor_scope && ops.blocked_count > 0) {
    thin.push(`Supervised board: ${ops.blocked_count} blocked row(s) — decisions are backing up before new asks.`)
  }

  if (!simple) {
    const kt = op.kpi_telemetry
    if (kt.below_half != null && kt.below_half >= 2) {
      thin.push(
        kt.weakest_name
          ? `${kt.below_half} KPI lane(s) under half of target — weakest visible: “${kt.weakest_name}”.`
          : `${kt.below_half} KPI lane(s) under half of target in visible telemetry.`,
      )
    } else if (kt.below_half === 1 && kt.weakest_name) {
      thin.push(`One KPI lane under half of target — watch “${kt.weakest_name}” before adding new programs.`)
    }

    const laneLine = deskLaneReadinessLine(op.desk_health)
    if (laneLine) summary.push(laneLine)

    const timeLine = timingReadinessLine(input.volunteerMission, input.calendarSummary)
    if (timeLine) summary.push(timeLine)

    if (
      input.calendarSummary?.governance_warning_count != null &&
      input.calendarSummary.governance_warning_count > 0
    ) {
      summary.push(
        `Governance / escalation pressure (timing layer): ${input.calendarSummary.governance_warning_count} visible signal(s).`,
      )
    }
  }

  if (
    input.progressSlice === 'matched_ready' &&
    !op.exception_summary.pending_review &&
    (input.volunteerMission?.active_summaries?.length ?? 0) === 0 &&
    thin.length === 0
  ) {
    summary.push(
      'No active mission rows in this view — use training/workspace cards or wait for captain task drops.',
    )
  }

  if (summary.length === 0 && thin.length === 0) return null

  return {
    summary_lines: summary.slice(0, 4),
    thin_areas: thin.slice(0, 4),
  }
}
