import type { Power5ImpactRollup } from '../../hooks/usePower5Workspace'
import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import { pickSuggestedPower5Node, getPower5SuggestedNextLine } from '../../lib/power5DashboardHints'

export default function Power5SummaryCard({
  loading,
  impact,
  nodes,
  openRelays,
  onOpenWorkspace,
}: {
  loading: boolean
  impact: Power5ImpactRollup
  nodes: Power5RelationshipNodeRow[]
  openRelays: number
  onOpenWorkspace?: () => void
}) {
  const next = pickSuggestedPower5Node(nodes)

  return (
    <section
      className="card stack-section power5-dash-summary"
      aria-labelledby="power5-dash-summary-title"
    >
      <h2 id="power5-dash-summary-title" className="page-title">
        Power of 5
      </h2>
      {loading ? (
        <p className="subtitle">Loading network…</p>
      ) : (
        <>
          <dl className="power5-dash-summary-grid">
            <dt>People named</dt>
            <dd>{impact.total}</dd>
            <dt>In motion</dt>
            <dd>{impact.contacted}</dd>
            <dt>Activated+</dt>
            <dd>{impact.activated}</dd>
            <dt>Roster linked</dt>
            <dd>{impact.matched}</dd>
            <dt>Open relays</dt>
            <dd>{openRelays}</dd>
          </dl>
          {next ? (
            <p className="power5-dash-next">
              <strong>Suggested next:</strong> {getPower5SuggestedNextLine(nodes)}
            </p>
          ) : (
            <p className="subtitle">Add your first relationship to unlock suggestions.</p>
          )}
          {onOpenWorkspace ? (
            <button type="button" className="btn-touch btn-primary" onClick={onOpenWorkspace}>
              Open full workspace
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
