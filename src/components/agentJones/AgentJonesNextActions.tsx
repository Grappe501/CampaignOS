import { scrollToDashboardId } from '../../lib/agentJonesGuidance'
import type { AgentJonesNavigationHint } from '../../lib/agentJonesContextV2'

export default function AgentJonesNextActions({
  hints,
  nextStepLines,
}: {
  hints: AgentJonesNavigationHint[]
  nextStepLines: string[]
}) {
  const lines = nextStepLines.slice(0, 3)

  if (!hints.length && !lines.length) return null

  return (
    <div className="agent-jones-v3-next-actions">
      {hints.length ? (
        <>
          <p className="agent-jones-v3-section-label">Next actions</p>
          <div className="agent-jones-v3-hint-row">
            {hints.map((h) => (
              <button
                key={`${h.priority}-${h.kind}-${h.label}`}
                type="button"
                className="btn-touch agent-jones-v3-hint-btn"
                onClick={() => {
                  if (h.kind === 'scroll' && h.target_id) {
                    scrollToDashboardId(h.target_id)
                  }
                  if (h.kind === 'navigate' && h.route) {
                    window.location.assign(h.route)
                  }
                }}
              >
                <span className="agent-jones-v3-hint-label">{h.label}</span>
                <span className="agent-jones-v3-hint-reason">{h.reason}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {!hints.length && lines.length ? (
        <ul className="agent-jones-v3-next-lines">
          {lines.map((line, i) => (
            <li key={`ns-${i}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
