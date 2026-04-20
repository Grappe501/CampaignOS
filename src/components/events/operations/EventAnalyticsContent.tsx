import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { buildEventAnalyticsSnapshot, deriveCoverageGaps, staffingCoverageRatio } from '../../../lib/eventAnalyticsSelectors'
import { isCampaignEventTypeKey } from '../../../lib/eventStaffingMatrix'

export default function EventAnalyticsContent() {
  const { events: source, loading: eventsLoading, error: eventsError } = useCampaignEventsContext()
  const snap = useMemo(() => buildEventAnalyticsSnapshot(source), [source])
  const gaps = useMemo(() => deriveCoverageGaps(source), [source])

  const weakest = useMemo(() => {
    return [...source]
      .map((r) => {
        const t = isCampaignEventTypeKey(r.event_type) ? r.event_type : null
        const cov = t ? staffingCoverageRatio(r, t) : 0
        return { r, cov }
      })
      .sort((a, b) => a.cov - b.cov)[0]
  }, [source])

  if (eventsError) {
    return (
      <div className="event-coordinator-desk event-analytics-page" id="event-analytics">
        <p className="event-coordinator-desk__placeholder" role="alert">
          Could not load events: {eventsError.message}
        </p>
        <Link to="/events" className="event-coordinator-desk__back">
          ← Coordinator desk
        </Link>
      </div>
    )
  }

  return (
    <div className="event-coordinator-desk event-analytics-page" id="event-analytics">
      <header className="event-coordinator-desk__command">
        <p className="event-coordinator-desk__eyebrow">Optimization</p>
        <h1 className="event-coordinator-desk__title">Event analytics & coverage</h1>
        <p className="event-coordinator-desk__lede">
          Aggregates over live campaign events. Deeper rollups and historical outcomes can extend this
          layer.
        </p>
        {eventsLoading ? (
          <p className="event-coordinator-desk__meta" aria-live="polite">
            Loading events…
          </p>
        ) : source.length === 0 ? (
          <p className="event-coordinator-desk__placeholder">
            No events in this campaign yet — add events to see coverage analytics.
          </p>
        ) : null}
        <div className="event-coordinator-desk__quick-actions">
          <Link to="/events/county-ops" className="btn-touch btn-touch--ghost">
            County ops
          </Link>
          <Link to="/events" className="btn-touch btn-touch--ghost">
            Coordinator desk
          </Link>
        </div>
      </header>

      <section className="event-coordinator-desk__section">
        <h2 className="event-coordinator-desk__h2">Snapshot</h2>
        <div className="county-ops-kpi-grid">
          <div className="county-ops-kpi">
            <span className="county-ops-kpi__k">Total events</span>
            <span className="county-ops-kpi__v">{snap.totalEvents}</span>
          </div>
          <div className="county-ops-kpi">
            <span className="county-ops-kpi__k">Avg readiness</span>
            <span className="county-ops-kpi__v">{snap.avgReadiness}%</span>
          </div>
          <div className="county-ops-kpi">
            <span className="county-ops-kpi__k">Low readiness</span>
            <span className="county-ops-kpi__v">{snap.lowReadinessCount}</span>
          </div>
        </div>
      </section>

      <section className="event-coordinator-desk__section">
        <h2 className="event-coordinator-desk__h2">By county</h2>
        <ul className="county-ops-board">
          {Object.entries(snap.byCounty).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>: {v} events
            </li>
          ))}
        </ul>
      </section>

      <section className="event-coordinator-desk__section">
        <h2 className="event-coordinator-desk__h2">By objective (template default)</h2>
        <ul className="county-ops-board">
          {Object.entries(snap.byObjectiveTag).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>: {v}
            </li>
          ))}
        </ul>
      </section>

      <section className="event-coordinator-desk__section">
        <h2 className="event-coordinator-desk__h2">Coverage gaps</h2>
        <ul className="county-ops-board">
          {gaps.map((g, i) => (
            <li key={i}>
              <strong>{g.label}</strong> — {g.detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="event-coordinator-desk__section">
        <h2 className="event-coordinator-desk__h2">Recommendation</h2>
        {weakest ? (
          <p className="event-coordinator-desk__placeholder">
            Lowest staffing coverage:{' '}
            <Link to={campaignEventRecordPath(weakest.r.event_id)}>{weakest.r.title}</Link> (
            {Math.round(weakest.cov * 100)}% coverage heuristic).
          </p>
        ) : (
          <p className="event-coordinator-desk__meta">No rows.</p>
        )}
      </section>

      <p className="event-coordinator-desk__foot">
        <Link to="/events">← Event Coordinator Desk</Link>
      </p>
    </div>
  )
}
