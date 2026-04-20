import type { AgentJonesEventDeploymentSummary } from '../../lib/agentJonesContextV2'

export default function AgentJonesDeploymentSummary({
  deployment,
}: {
  deployment: AgentJonesEventDeploymentSummary
}) {
  const has =
    deployment.highest_priority_event_label ||
    (deployment.staffing_pressure_count ?? 0) > 0 ||
    (deployment.overlap_with_field_pressure?.length ?? 0) > 0 ||
    deployment.recommended_event_action ||
    deployment.weak_field_area_label ||
    deployment.weak_field_overlap_note
  if (!has) return null
  return (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Event deployment (v3.3)</p>
      {deployment.highest_priority_event_label ? (
        <p className="agent-jones-v32-pass1-line">
          <span className="agent-jones-v31-calendar-k">Focus</span>{' '}
          {deployment.highest_priority_event_label}
        </p>
      ) : null}
      {deployment.highest_priority_event_reason ? (
        <p className="agent-jones-v32-pass1-meta">{deployment.highest_priority_event_reason}</p>
      ) : null}
      {deployment.weak_field_area_label ? (
        <p className="agent-jones-v32-pass1-meta">
          Weak-field proxy (session): {deployment.weak_field_area_label}
        </p>
      ) : null}
      {deployment.weak_field_overlap_note ? (
        <p className="agent-jones-v32-pass1-note">{deployment.weak_field_overlap_note}</p>
      ) : null}
      {deployment.staffing_pressure_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Staffing pressure (visible): {deployment.staffing_pressure_count}
        </p>
      ) : null}
      {deployment.overlap_with_field_pressure?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {deployment.overlap_with_field_pressure.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {deployment.recommended_event_action ? (
        <p className="agent-jones-v32-pass1-note">{deployment.recommended_event_action}</p>
      ) : null}
    </div>
  )
}
