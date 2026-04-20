import { useState } from 'react'
import { Link } from 'react-router-dom'
import { computeMarketplaceAnalytics } from '../../lib/volunteerOpportunityAnalytics'
import { fetchMergedMarketplaceOpportunities } from '../../lib/volunteerOpportunityMerge'
import { syncOpenAssignmentsToMarketplace } from '../../lib/volunteerOpportunitySync'

export default function CoordinatorMarketplacePanel() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<ReturnType<typeof computeMarketplaceAnalytics> | null>(null)

  const refresh = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const merged = await fetchMergedMarketplaceOpportunities('default')
      setSnapshot(computeMarketplaceAnalytics(merged))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  const sync = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { synced, error } = await syncOpenAssignmentsToMarketplace('default')
      if (error) {
        setMsg(error.message)
        return
      }
      setMsg(`Synced ${synced} open assignments into marketplace table.`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="event-coordinator-desk__section" aria-labelledby="coord-mkt">
      <h2 id="coord-mkt" className="event-coordinator-desk__h2">
        Opportunity marketplace
      </h2>
      <p className="event-coordinator-desk__meta">
        Volunteers browse a merged feed (live open work + stored rows). Sync persists open assignments for
        analytics.
      </p>
      <div className="event-coordinator-desk__quick-actions">
        <Link to="/volunteers/opportunities" className="btn-touch">
          Open marketplace
        </Link>
        <button type="button" className="btn-touch btn-touch--ghost" disabled={busy} onClick={() => void refresh()}>
          {busy ? 'Loading…' : 'Refresh snapshot'}
        </button>
        <button type="button" className="btn-touch" disabled={busy} onClick={() => void sync()}>
          {busy ? 'Working…' : 'Sync open assignments → DB'}
        </button>
      </div>
      {msg ? (
        <p className="event-coordinator-desk__placeholder" role="status">
          {msg}
        </p>
      ) : null}
      {snapshot ? (
        <ul className="volunteer-command__stat-grid">
          <li>
            <strong>{snapshot.totalOpen}</strong> open (merged view)
          </li>
          <li>
            <strong>{snapshot.urgentOpen}</strong> urgent openings
          </li>
          <li>
            <strong>{Object.keys(snapshot.bySource).length}</strong> source types
          </li>
        </ul>
      ) : null}
      {snapshot?.bottleneckRoles[0] ? (
        <p className="event-coordinator-desk__meta">
          Top gap role: <strong>{snapshot.bottleneckRoles[0].roleSlug ?? 'unassigned'}</strong> (
          {snapshot.bottleneckRoles[0].open} open)
        </p>
      ) : null}
    </section>
  )
}
