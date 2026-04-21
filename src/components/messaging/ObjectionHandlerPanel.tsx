import type { CampaignNarrativeFramework } from '../../lib/messageFramework'
import {
  selectRebuttalsForContext,
  type MessageTargetContext,
} from '../../lib/messageTargeting'

export default function ObjectionHandlerPanel({
  framework,
  context,
}: {
  framework: CampaignNarrativeFramework
  context: MessageTargetContext
}) {
  const items = selectRebuttalsForContext(framework, context, 8)
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Objection handling</h3>
      <p className="subtitle">Stay calm, short, and tied to framework themes — no new promises.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((r) => (
          <li
            key={r.id}
            style={{
              borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
              padding: '0.65rem 0',
            }}
          >
            <p className="subtitle" style={{ margin: 0 }}>
              <strong>They say:</strong> {r.objection}
            </p>
            <p className="subtitle" style={{ margin: '0.35rem 0 0' }}>
              <strong>You might reply:</strong> {r.response}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
