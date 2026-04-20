import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import { contactStrategySummary } from '../../lib/power5ContactStrategy'
import { POWER5_TREE_RULES } from '../../lib/power5TreeRules'

export default function Power5ContactPlanCard({
  spotlightNode,
}: {
  spotlightNode: Power5RelationshipNodeRow | null
}) {
  return (
    <div className="power5-contact-plan-card card card--inner stack-section">
      <h3 className="power5-subheading">Contact strategy</h3>
      <p className="subtitle">
        Default order is always <strong>in person → phone → Zoom → social → text</strong>. You can
        override per person.
      </p>
      {spotlightNode ? (
        <p className="power5-contact-plan-focus">
          <strong>{spotlightNode.display_label}:</strong> {contactStrategySummary(spotlightNode)}
        </p>
      ) : (
        <p className="subtitle">Add someone above to see a tailored recommendation.</p>
      )}
      <ul className="power5-rules-list">
        {POWER5_TREE_RULES.map((r) => (
          <li key={r.id}>{r.summary}</li>
        ))}
      </ul>
    </div>
  )
}
