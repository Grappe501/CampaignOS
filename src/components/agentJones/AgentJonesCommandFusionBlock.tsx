import type { AgentJonesCommandFusionSummary } from '../../lib/agentJonesContextV2'

export default function AgentJonesCommandFusionBlock({
  fusion,
}: {
  fusion: AgentJonesCommandFusionSummary
}) {
  const has =
    fusion.top_combined_pressure_headline ||
    (fusion.combined_pressure_areas?.length ?? 0) > 0 ||
    fusion.deadline_overlap_count != null ||
    fusion.event_overlap_count != null ||
    fusion.task_overlap_count != null ||
    fusion.coverage_staffing_pressure_count != null ||
    fusion.governance_timing_signal_count != null ||
    fusion.recommended_intervention
  if (!has) return null
  return (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Fused command pressure (v3.3)</p>
      {fusion.top_combined_pressure_headline ? (
        <p className="agent-jones-v32-pass1-line">{fusion.top_combined_pressure_headline}</p>
      ) : null}
      {fusion.combined_pressure_areas?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          Areas in tension: {fusion.combined_pressure_areas.join(' · ')}
        </p>
      ) : null}
      {fusion.deadline_overlap_count != null ||
      fusion.event_overlap_count != null ||
      fusion.task_overlap_count != null ||
      fusion.coverage_staffing_pressure_count != null ||
      fusion.governance_timing_signal_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          {[
            fusion.deadline_overlap_count != null
              ? `Deadlines (7d window): ${fusion.deadline_overlap_count}`
              : null,
            fusion.event_overlap_count != null
              ? `Events/timing: ${fusion.event_overlap_count}`
              : null,
            fusion.task_overlap_count != null
              ? `Task load index: ${fusion.task_overlap_count}`
              : null,
            fusion.coverage_staffing_pressure_count != null
              ? `Board staffing flags: ${fusion.coverage_staffing_pressure_count}`
              : null,
            fusion.governance_timing_signal_count != null
              ? `Governance/timing: ${fusion.governance_timing_signal_count}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {fusion.recommended_intervention ? (
        <p className="agent-jones-v32-pass1-note">{fusion.recommended_intervention}</p>
      ) : null}
    </div>
  )
}
