import type { AgentJonesSegmentationSummary as SegSummary } from '../../lib/agentJonesContextV2'

function modeLabel(
  m: NonNullable<SegSummary['primary_mode']> | NonNullable<SegSummary['secondary_mode']>,
): string {
  return m.replace(/_/g, ' ')
}

export default function AgentJonesSegmentationSummary({
  summary,
}: {
  summary: SegSummary
}) {
  const has =
    summary.primary_mode ||
    summary.secondary_mode ||
    summary.turnout_persuasion_balance ||
    (summary.rationale_points?.length ?? 0) > 0
  if (!has) return null
  return (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Turnout / persuasion posture (v3.3)</p>
      {summary.area_label ? (
        <p className="agent-jones-v32-pass1-meta">Anchor: {summary.area_label}</p>
      ) : null}
      {summary.primary_mode ? (
        <p className="agent-jones-v32-pass1-line">
          <span className="agent-jones-v31-calendar-k">Primary</span>{' '}
          {modeLabel(summary.primary_mode)}
        </p>
      ) : null}
      {summary.secondary_mode ? (
        <p className="agent-jones-v32-pass1-meta">
          Secondary: {modeLabel(summary.secondary_mode)}
        </p>
      ) : null}
      {summary.turnout_persuasion_balance ? (
        <p className="agent-jones-v32-pass1-note">{summary.turnout_persuasion_balance}</p>
      ) : null}
      {summary.rationale_points?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {summary.rationale_points.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {summary.confidence_note ? (
        <p className="agent-jones-v32-pass1-note">{summary.confidence_note}</p>
      ) : null}
    </div>
  )
}
