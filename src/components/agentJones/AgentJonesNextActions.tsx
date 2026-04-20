import { scrollToDashboardId } from '../../lib/agentJonesGuidance'
import type { AgentJonesNavigationHint } from '../../lib/agentJonesContextV2'

export default function AgentJonesNextActions({
  hints,
  nextStepLines,
  chiefPriorityLine,
}: {
  hints: AgentJonesNavigationHint[]
  nextStepLines: string[]
  /** Phase-aware “first move” already synthesized in leadership_command — surfaces above taps. */
  chiefPriorityLine?: string | null
}) {
  const lines = nextStepLines.slice(0, 3)
  const chief = chiefPriorityLine?.trim().slice(0, 360) ?? ''

  if (!hints.length && !lines.length && !chief) return null

  return (
    <div className="agent-jones-v3-next-actions">
      {chief ? (
        <p className="agent-jones-next-actions-chief" role="status">
          <span className="agent-jones-next-actions-chief-k">Strategic priority</span> {chief}
        </p>
      ) : null}
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
