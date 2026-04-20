import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesCoverageSummary,
  AgentJonesGeoIntelligence,
  AgentJonesOperatingContext,
} from './agentJonesContextV2'

export function buildAgentJonesCoverageIntelligence(input: {
  calendarSummary: AgentJonesCalendarSummary | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  operating: AgentJonesOperatingContext
  /** Roster-linked scope only — used for honest county/precinct watch flags (0/1), not multi-jurisdiction analytics. */
  geo: AgentJonesGeoIntelligence | null
}): AgentJonesCoverageSummary | null {
  const cal = input.calendarSummary
  const ops = input.coordinatorOps
  const op = input.operating

  const missing: string[] = []
  if (op.exception_summary.pending_review) {
    missing.push('Voter-gated lanes until roster exception resolves')
  }

  let eventStaffing: number | null = null
  if (cal?.staffing_gap_count != null && cal.staffing_gap_count > 0) {
    eventStaffing = cal.staffing_gap_count
  }

  const shortageLabels: string[] = []
  if (
    ops?.has_supervisor_scope &&
    ops.assigned_not_started_count > 0 &&
    !ops.desk_loading
  ) {
    shortageLabels.push(
      `Supervised assignments not yet started (${ops.assigned_not_started_count})`,
    )
  }

  const readinessParts: string[] = []
  if (eventStaffing != null) {
    readinessParts.push(
      'Visible board shows assignments waiting on volunteer start — treat as staffing/coverage pressure, not event RSVPs.',
    )
  }
  if (missing.length) {
    readinessParts.push('Exception gating can thin effective coverage until cleared.')
  }

  const readiness_headline =
    readinessParts.length > 0
      ? readinessParts.join(' ')
      : shortageLabels.length > 0
        ? 'Coverage hints from visible coordinator board only — no county staffing ledger in chat.'
        : null

  const hasWatchSignal =
    eventStaffing != null || missing.length > 0 || shortageLabels.length > 0

  let county_coverage_watch_count: number | null = null
  let precinct_coverage_watch_count: number | null = null
  const scope = input.geo?.scope_type
  if (scope === 'county') {
    county_coverage_watch_count = hasWatchSignal ? 1 : 0
  } else if (scope === 'precinct') {
    precinct_coverage_watch_count = hasWatchSignal ? 1 : 0
  }

  if (
    !readiness_headline &&
    missing.length === 0 &&
    eventStaffing == null &&
    shortageLabels.length === 0
  ) {
    return null
  }

  return {
    county_coverage_watch_count,
    precinct_coverage_watch_count,
    missing_leadership_slots: missing.slice(0, 3),
    event_staffing_pressure_count: eventStaffing,
    volunteer_shortage_area_labels: shortageLabels.slice(0, 2),
    readiness_headline,
  }
}
