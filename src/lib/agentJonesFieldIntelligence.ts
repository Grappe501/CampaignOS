import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesTaskPressureSummary,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'

/** Visible-session field pressure — honest when multi-area data is absent. */
export function buildAgentJonesFieldIntelligence(input: {
  operating: AgentJonesOperatingContext
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  volunteerMission: AgentJonesVolunteerMissionContext | null
  calendarSummary: AgentJonesCalendarSummary | null
  taskPressure: AgentJonesTaskPressureSummary | null
  geo: AgentJonesGeoIntelligence | null
}): AgentJonesFieldIntelligenceSummary {
  const op = input.operating
  const risks: string[] = []

  if (op.exception_summary.pending_review) {
    risks.push(
      'Roster exception pending — voter-gated field work may be uneven until coordinators clear it.',
    )
  }

  const ops = input.coordinatorOps
  if (ops?.has_supervisor_scope && (ops.overdue_count > 0 || ops.blocked_count > 0)) {
    risks.push(
      `Supervised board: ${ops.blocked_count} blocked, ${ops.overdue_count} overdue — reassignment or captain air cover may be needed.`,
    )
  }

  const snap = input.leadershipSnapshot
  if (snap && snap.kpis_below_half_target >= 2) {
    risks.push(
      `${snap.kpis_below_half_target} KPI lane(s) under half — field energy and narrative may be misaligned with goals.`,
    )
  }

  const cal = input.calendarSummary
  if (cal?.governance_warning_count != null && cal.governance_warning_count > 0) {
    risks.push(
      'Governance or escalation signals in the timing layer — triage exceptions and coordinator queues.',
    )
  }

  const m = input.volunteerMission
  if ((m?.stalled_titles?.length ?? 0) > 0) {
    risks.push(
      'Stalled mission tasks visible — perceived coverage can look stronger than real execution.',
    )
  }

  const tp = input.taskPressure
  if (
    tp &&
    tp.coord_overdue + tp.coord_blocked > 0 &&
    !risks.some((r) => r.includes('Supervised board'))
  ) {
    risks.push(
      `Coordinator workload flags: ${tp.coord_blocked} blocked, ${tp.coord_overdue} overdue (count-only headline).`,
    )
  }

  let highPressure = 0
  if (op.exception_summary.pending_review) highPressure += 1
  if (ops?.has_supervisor_scope && ops.overdue_count > 0) highPressure += 1
  if (ops?.has_supervisor_scope && ops.blocked_count > 0) highPressure += 1
  if (snap && snap.kpis_below_half_target >= 3) highPressure += 1
  if (Object.values(op.desk_health).some((x) => x === 'urgent')) highPressure += 1

  const coordPressure =
    ops?.has_supervisor_scope && ops.blocked_count + ops.overdue_count > 0
      ? ops.blocked_count + ops.overdue_count
      : null

  const volWarn =
    cal?.staffing_gap_count != null && cal.staffing_gap_count > 0
      ? cal.staffing_gap_count
      : null

  const primary = input.geo?.primary_area_label?.trim() || null
  let weakest_area_label: string | null = null
  let strongest_area_label: string | null = null
  let undercovered_area_count: number | null = null
  if (primary) {
    if (highPressure > 0 || (volWarn ?? 0) > 0) {
      weakest_area_label = `${primary} (visible session stress proxy — not a turf ranking)`
      if ((volWarn ?? 0) > 0) undercovered_area_count = 1
    } else if (
      snap &&
      snap.kpis_below_half_target === 0 &&
      !op.exception_summary.pending_review &&
      !(ops?.has_supervisor_scope && ops.overdue_count + ops.blocked_count > 0)
    ) {
      strongest_area_label = `${primary} (visible session looks relatively clear)`
    }
  }

  return {
    weakest_area_label,
    strongest_area_label,
    undercovered_area_count,
    high_pressure_area_count: highPressure > 0 ? highPressure : null,
    volunteer_capacity_warning_count: volWarn,
    coordinator_pressure_count: coordPressure,
    area_readiness_summary:
      'County/precinct heatmaps and org-wide turf coverage are not in this chat context — use supervised boards, KPI cards, timing layer, and roster-safe geography only.',
    top_field_risks: risks.slice(0, 3),
  }
}
