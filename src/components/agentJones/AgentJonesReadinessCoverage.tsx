import type { AgentJonesReadinessCoverage } from '../../lib/agentJonesContextV2'

export default function AgentJonesReadinessCoverageBlock({
  coverage,
}: {
  coverage: AgentJonesReadinessCoverage
}) {
  if (!coverage.summary_lines.length && !coverage.thin_areas.length) return null

  return (
    <div className="agent-jones-v31-readiness" role="region" aria-label="Readiness and coverage">
      <p className="agent-jones-v3-section-label">Readiness & coverage</p>
      {coverage.summary_lines.length ? (
        <ul className="agent-jones-v31-readiness-summary">
          {coverage.summary_lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {coverage.thin_areas.length ? (
        <>
          <p className="agent-jones-v31-readiness-thin-k">Where execution looks thin</p>
          <ul className="agent-jones-v31-readiness-thin">
            {coverage.thin_areas.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
