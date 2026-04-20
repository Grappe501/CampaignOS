import type {
  AgentJonesCalendarSummary,
  AgentJonesCoverageSummary,
  AgentJonesEventDeploymentSummary,
  AgentJonesFieldIntelligenceSummary,
} from './agentJonesContextV2'

function stripProxy(label: string): string {
  return label.replace(/\s*\(visible session[^)]*\)\s*$/i, '').trim() || label
}

export function buildAgentJonesEventDeploymentSummary(input: {
  calendarSummary: AgentJonesCalendarSummary | null
  coverage: AgentJonesCoverageSummary | null
  field: AgentJonesFieldIntelligenceSummary | null
}): AgentJonesEventDeploymentSummary | null {
  const cal = input.calendarSummary
  const cov = input.coverage
  const field = input.field

  const staffing = cal?.staffing_gap_count ?? cov?.event_staffing_pressure_count ?? null
  const label = cal?.next_event_title?.trim() || null
  const overlap =
    field?.top_field_risks?.slice(0, 2).map((s) => s.slice(0, 160)) ?? []

  const weakRaw = field?.weakest_area_label?.trim()
  const weak_field_area_label = weakRaw ? stripProxy(weakRaw) : null

  let weak_field_overlap_note: string | null = null
  if (weak_field_area_label && (staffing ?? 0) > 0) {
    weak_field_overlap_note = `Weak-field proxy “${weak_field_area_label.slice(0, 100)}” overlaps visible staffing pressure — relieve execution there before scaling events.`
  } else if (weak_field_area_label && overlap.length) {
    weak_field_overlap_note = `Weak-field proxy “${weak_field_area_label.slice(0, 100)}” aligns with visible field risks — avoid double-stressing volunteers across events and that lane.`
  } else if (weak_field_area_label && (label || cal?.next_deadline_title)) {
    weak_field_overlap_note = `Weak-field proxy “${weak_field_area_label.slice(0, 100)}” — check that calendar anchors do not stack on the same stressed lane (visible hints only).`
  }

  const hasSignals =
    Boolean(label) ||
    (staffing != null && staffing > 0) ||
    overlap.length > 0 ||
    Boolean(weak_field_overlap_note) ||
    Boolean(cal?.next_deadline_title?.trim())

  if (!hasSignals) return null

  let reason: string | null = null
  if (staffing != null && staffing > 0) {
    reason = `Timing/coverage layer shows ${staffing} staffing-gap signal(s) — prioritize fill before adding new surfaces.`
  } else if (cal?.next_deadline_title) {
    reason = `Next visible deadline: ${cal.next_deadline_title.slice(0, 120)} — align bodies to that window.`
  } else if (label) {
    reason = 'Next visible calendar anchor — treat as sequencing hint, not RSVP truth.'
  } else if (weak_field_overlap_note) {
    reason = 'Field/timing overlap visible — deployment guidance is session-limited, not an RSVP system.'
  }

  let action: string | null = null
  if (overlap.length && (staffing ?? 0) > 0) {
    action = 'Pair event staffing with clearing the top visible field risk so volunteers are not double-stressed.'
  } else if (weak_field_overlap_note && (staffing ?? 0) > 0) {
    action = 'Sequence weak-field relief with staffing fills before leadership or large mobilization asks.'
  } else if ((staffing ?? 0) > 0) {
    action = 'Reassign or recruit into the understaffed visible lane before leadership appearances.'
  } else if (label) {
    action = 'Confirm real-world run-of-show outside this panel; use visible hints only for sequencing tone.'
  } else if (weak_field_overlap_note) {
    action = 'Align event or deadline comms with the visible weak-field proxy — still confirm outside this UI.'
  }

  return {
    highest_priority_event_label: label,
    highest_priority_event_reason: reason,
    staffing_pressure_count: staffing,
    overlap_with_field_pressure: overlap.length ? overlap : undefined,
    recommended_event_action: action,
    weak_field_area_label,
    weak_field_overlap_note,
  }
}
