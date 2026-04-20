import type { AgentJonesLeadershipCommand } from '../../lib/agentJonesContextV2'

export default function AgentJonesLeadershipSummary({
  command,
}: {
  command: AgentJonesLeadershipCommand
}) {
  if (!command.synthesis_lines.length && !command.recommended_intervention) return null

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
      {command.recommended_intervention ? (
        <p className="agent-jones-v31-leadership-focus">
          <span className="agent-jones-v31-leadership-focus-k">First move</span>{' '}
          {command.recommended_intervention}
        </p>
      ) : null}
    </div>
  )
}
