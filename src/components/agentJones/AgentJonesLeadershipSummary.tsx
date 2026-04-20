import type { AgentJonesLeadershipCommand } from '../../lib/agentJonesContextV2'

export default function AgentJonesLeadershipSummary({
  command,
  suppressRecommendedIntervention = false,
}: {
  command: AgentJonesLeadershipCommand
  /** When true, hide the duplicate “First move” line (shown under Next actions instead). */
  suppressRecommendedIntervention?: boolean
}) {
  const showIntervention =
    Boolean(command.recommended_intervention) && !suppressRecommendedIntervention
  if (!command.synthesis_lines.length && !showIntervention) return null

  return (
    <div className="agent-jones-v31-leadership" role="region" aria-label="Leadership synthesis">
      <p className="agent-jones-v3-section-label">Command synthesis</p>
      {command.synthesis_lines.length ? (
        <ul className="agent-jones-v31-leadership-lines">
          {command.synthesis_lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {showIntervention ? (
        <p className="agent-jones-v31-leadership-focus">
          <span className="agent-jones-v31-leadership-focus-k">First move</span>{' '}
          {command.recommended_intervention}
        </p>
      ) : null}
    </div>
  )
}
