import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import { POWER5_RELATIONSHIP_LABELS, type Power5RelationshipKind } from '../../lib/power5Model'

/** Ring-1 list: your named relationships (deeper rings = recruits’ trees, not auto-imported). */
export default function Power5TreeView({ nodes }: { nodes: Power5RelationshipNodeRow[] }) {
  if (!nodes.length) return null
  return (
    <div className="power5-tree-view" role="region" aria-label="Your first ring">
      <h3 className="power5-subheading">My five (ring 1)</h3>
      <ul className="power5-tree-ring-list">
        {nodes.map((n) => (
          <li key={n.id} className="power5-tree-ring-item">
            <span className="power5-tree-name">{n.display_label}</span>
            <span className="power5-tree-meta">
              {POWER5_RELATIONSHIP_LABELS[n.relationship_kind as Power5RelationshipKind] ??
                n.relationship_kind}{' '}
              · {String(n.progress_state_key ?? '')
                .replace(/_/g, ' ')
                .trim() || '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
