/**
 * Human-readable priority / intervention explainability for war-room rows.
 */

const INTERVENTION_REASON_LABELS: Record<string, string> = {
  critical_health: 'Critical health',
  at_risk_health: 'At-risk health',
  live_window: 'Live window',
  starting_imminently: 'Starts in <3h',
  within_24h: 'Within 24h',
  within_72h: 'Within 72h',
  approval_pending: 'Approval pending',
  critical_blockers: 'Critical blockers',
  field_issues_open: 'Open field issues',
  staffing_posture: 'Staffing posture',
  comms_not_cleared: 'Comms not cleared',
  unowned_event: 'No owner assigned',
  closure_incomplete: 'Closure incomplete',
}

/** Short sentence for tooltips and panels (deterministic, same codes as service). */
export function buildInterventionReasonSummary(codes: readonly string[]): string {
  if (!codes.length) return 'Routine watch — no extra intervention codes.'
  const parts = codes.map((c) => INTERVENTION_REASON_LABELS[c] ?? c.replace(/_/g, ' '))
  return parts.join(' · ')
}
