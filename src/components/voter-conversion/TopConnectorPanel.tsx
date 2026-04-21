import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import { rankPower5Connectors } from '../../lib/relationalConversionLinks'

export default function TopConnectorPanel({
  nodes,
  viewerProfileId,
}: {
  nodes: readonly Power5RelationshipNodeRow[]
  viewerProfileId: string | undefined
}) {
  const mine = viewerProfileId
    ? [...nodes].filter((n) => n.owner_profile_id === viewerProfileId)
    : [...nodes]
  const top = rankPower5Connectors(mine).slice(0, 5)
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Top connectors (this view)</h3>
      {top.length ? (
        <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {top.map((t) => (
            <li key={t.node_id} className="subtitle">
              {t.display_label}{' '}
              <span style={{ opacity: 0.75 }}>
                · strength {t.connection_strength} · {t.relationship_kind}
                {t.linked_voter_id ? ' · roster-linked' : ''}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="subtitle">Add Power5 nodes to surface connector leverage.</p>
      )}
    </div>
  )
}
