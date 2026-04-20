import { isAgentJonesNavigatePath } from '../../lib/agentJonesContext'
import type { AgentJonesPrioritySignal } from '../../lib/agentJonesContextV2'

export default function AgentJonesPriorityCards({
  signals,
}: {
  signals: AgentJonesPrioritySignal[]
}) {
  if (!signals.length) return null

  return (
    <div className="agent-jones-v3-priority-block">
      <p className="agent-jones-v3-section-label">Priority signals</p>
      <ul className="agent-jones-v3-priority-list">
        {signals.slice(0, 4).map((s) => (
          <li
            key={s.id}
            className={`agent-jones-v3-priority-card agent-jones-v3-priority--${s.severity}`}
          >
            <div className="agent-jones-v3-priority-meta">
              <span className="agent-jones-v3-priority-cat">{s.category}</span>
              {s.owner_hint ? (
                <span className="agent-jones-v3-priority-owner">{s.owner_hint}</span>
              ) : null}
            </div>
            <p className="agent-jones-v3-priority-title">{s.title}</p>
            {s.explanation && s.explanation !== s.title ? (
              <p className="agent-jones-v3-priority-explain">{s.explanation}</p>
            ) : null}
            {s.route_hint && isAgentJonesNavigatePath(s.route_hint) ? (
              <p className="agent-jones-v3-priority-route">{s.route_hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
