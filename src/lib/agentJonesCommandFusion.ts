import type {
  AgentJonesCalendarSummary,
  AgentJonesCampaignManagerCommand,
  AgentJonesCommandFusionSummary,
  AgentJonesCoverageSummary,
  AgentJonesEventDeploymentSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesTaskPressureSummary,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'

/**
 * v3.3 Pass 3 — fuse field, task load, deadlines, timing/governance, event staffing,
 * coverage gaps, and optional deployment anchor into one commander-facing summary.
 */
export function buildAgentJonesCommandFusionSummary(input: {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  calendarSummary: AgentJonesCalendarSummary | null
  taskPressure: AgentJonesTaskPressureSummary | null
  volunteerMission: AgentJonesVolunteerMissionContext | null
  campaignManagerCommand: AgentJonesCampaignManagerCommand | null
  eventDeployment?: AgentJonesEventDeploymentSummary | null
}): AgentJonesCommandFusionSummary | null {
  const tp = input.taskPressure
  const cal = input.calendarSummary
  const vm = input.volunteerMission
  const field = input.field
  const geo = input.geo
  const cov = input.coverage
  const evDep = input.eventDeployment ?? null

  const areas: string[] = []
  for (const x of geo?.undercovered_area_labels ?? []) {
    const t = x.trim()
    if (t) areas.push(t)
  }
  for (const x of cov?.volunteer_shortage_area_labels ?? []) {
    const t = x.trim()
    if (t) areas.push(t)
  }
  const w = field?.weakest_area_label?.trim()
  if (w) areas.push(w.replace(/\s*\(visible session[^)]*\)\s*$/i, '').trim())

  const headlineParts: string[] = []
  if (tp?.headline) headlineParts.push(tp.headline)
  if (field?.top_field_risks?.[0]) {
    headlineParts.push(`Field: ${field.top_field_risks[0].slice(0, 140)}`)
  }
  if (cov?.readiness_headline) {
    headlineParts.push(cov.readiness_headline.slice(0, 140))
  }
  if (cov?.event_staffing_pressure_count != null && cov.event_staffing_pressure_count > 0) {
    headlineParts.push(
      `Event staffing rows (visible boards): ${cov.event_staffing_pressure_count}`,
    )
  }
  if (cal?.governance_warning_count != null && cal.governance_warning_count > 0) {
    headlineParts.push(`Timing / governance signals (session): ${cal.governance_warning_count}`)
  }
  if (evDep?.highest_priority_event_label?.trim()) {
    headlineParts.push(`Deployment anchor: ${evDep.highest_priority_event_label.trim().slice(0, 100)}`)
  }

  const deadlineOverlap = vm?.assignments_due_within_7d_count ?? null
  const eventOverlap =
    cal?.upcoming_count_7d != null && cal.upcoming_count_7d > 0
      ? cal.upcoming_count_7d
      : cal?.staffing_gap_count != null && cal.staffing_gap_count > 0
        ? cal.staffing_gap_count
        : null

  let taskOverlap: number | null = null
  if (tp) {
    taskOverlap =
      tp.mission_active +
      tp.coord_blocked +
      tp.coord_overdue +
      tp.intern_pipeline_assigned
  }

  const staffingCount =
    cov?.event_staffing_pressure_count != null && cov.event_staffing_pressure_count > 0
      ? cov.event_staffing_pressure_count
      : null
  const govCount =
    cal?.governance_warning_count != null && cal.governance_warning_count > 0
      ? cal.governance_warning_count
      : null

  let intervention = input.campaignManagerCommand?.recommended_intervention?.trim() || null
  if (!intervention && evDep?.recommended_event_action?.trim()) {
    intervention = evDep.recommended_event_action.trim()
  }
  if (!intervention && field?.top_field_risks?.[0]) {
    intervention = 'Clear the top visible field risk, then re-check supervised boards.'
  }
  if (
    !intervention &&
    deadlineOverlap != null &&
    deadlineOverlap > 0 &&
    staffingCount != null
  ) {
    intervention =
      'Sequence assignment deadlines with visible staffing gaps before opening new turf or events.'
  }

  const hasTaskLoad = taskOverlap != null && taskOverlap > 0
  if (
    !headlineParts.length &&
    !areas.length &&
    deadlineOverlap == null &&
    eventOverlap == null &&
    !hasTaskLoad &&
    !intervention &&
    staffingCount == null &&
    govCount == null
  ) {
    return null
  }

  return {
    top_combined_pressure_headline: headlineParts.length
      ? headlineParts.join(' · ').slice(0, 360)
      : null,
    combined_pressure_areas: areas.length ? [...new Set(areas)].slice(0, 6) : undefined,
    deadline_overlap_count: deadlineOverlap,
    event_overlap_count: eventOverlap,
    task_overlap_count: taskOverlap,
    coverage_staffing_pressure_count: staffingCount,
    governance_timing_signal_count: govCount,
    recommended_intervention: intervention,
  }
}
