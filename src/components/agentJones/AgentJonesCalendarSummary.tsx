import type { AgentJonesCalendarSummary } from '../../lib/agentJonesContextV2'

export default function AgentJonesCalendarSummaryBlock({
  summary,
}: {
  summary: AgentJonesCalendarSummary
}) {
  const hasDeadline = Boolean(summary.next_deadline_title || summary.next_deadline_at)
  const upcoming = summary.upcoming_count_7d
  const gov = summary.governance_warning_count
  const staffing = summary.staffing_gap_count

  if (
    !hasDeadline &&
    (upcoming == null || upcoming <= 0) &&
    (gov == null || gov <= 0) &&
    (staffing == null || staffing <= 0) &&
    !summary.has_meaningful_upcoming_activity
  ) {
    return null
  }

  return (
    <div className="agent-jones-v31-calendar" role="region" aria-label="Timing summary">
      <p className="agent-jones-v3-section-label">Timing & deadlines</p>
      {summary.next_event_title || summary.next_event_at ? (
        <p className="agent-jones-v31-calendar-line">
          <span className="agent-jones-v31-calendar-k">Event</span>{' '}
          {summary.next_event_title ?? '—'}
          {summary.next_event_at ? ` · ${summary.next_event_at}` : null}
        </p>
      ) : (
        <p className="agent-jones-v31-calendar-note">
          No campaign event feed in context yet — using visible assignment deadlines and daily
          beats only.
        </p>
      )}
      {hasDeadline ? (
        <p className="agent-jones-v31-calendar-line">
          <span className="agent-jones-v31-calendar-k">Next deadline</span>{' '}
          {summary.next_deadline_title ?? 'Assignment'}
          {summary.next_deadline_at ? ` · ${summary.next_deadline_at}` : null}
        </p>
      ) : null}
      {upcoming != null && upcoming > 0 ? (
        <p className="agent-jones-v31-calendar-meta">
          {upcoming} timing-sensitive item(s) in the next ~7 days (from visible assignments).
        </p>
      ) : null}
      {gov != null && gov > 0 ? (
        <p className="agent-jones-v31-calendar-meta">
          Governance / escalation signals: {gov} (visible session only).
        </p>
      ) : null}
      {staffing != null && staffing > 0 ? (
        <p className="agent-jones-v31-calendar-meta">
          Supervised assignments not yet started (visible board): {staffing}.
        </p>
      ) : null}
    </div>
  )
}
