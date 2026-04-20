import { scrollToDashboardId } from '../../lib/agentJonesGuidance'
import { isAgentJonesNavigatePath } from '../../lib/agentJonesContext'
import type { AgentJonesProactiveAlert } from '../../lib/agentJonesContextV2'

export default function AgentJonesProactiveAlerts({
  alerts,
}: {
  alerts: AgentJonesProactiveAlert[]
}) {
  if (!alerts.length) return null

  return (
    <div className="agent-jones-v31-alerts" role="region" aria-label="Proactive alerts">
      <p className="agent-jones-v3-section-label">Alerts</p>
      <ul className="agent-jones-v31-alert-list">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`agent-jones-v31-alert agent-jones-v31-alert--${a.severity}`}
          >
            <p className="agent-jones-v31-alert-title">{a.title}</p>
            <p className="agent-jones-v31-alert-explain">{a.explanation}</p>
            {(a.target_id || a.route_hint) && (
              <button
                type="button"
                className="btn-touch agent-jones-v31-alert-btn"
                onClick={() => {
                  if (a.target_id) scrollToDashboardId(a.target_id)
                  else if (a.route_hint && isAgentJonesNavigatePath(a.route_hint)) {
                    window.location.assign(a.route_hint)
                  }
                }}
              >
                {a.target_id ? 'Scroll' : 'Open'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
