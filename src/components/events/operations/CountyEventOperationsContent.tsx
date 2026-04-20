import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../../lib/campaignEventTypeMatrix'
import {
  buildCountyOperationsRows,
  filterCountyRows,
  type CountyOperationsEventRow,
} from '../../../lib/eventOperationsSelectors'
import { buildEventAnalyticsSnapshot } from '../../../lib/eventAnalyticsSelectors'
import { deriveCoverageGaps } from '../../../lib/eventAnalyticsSelectors'
import { EXTERNAL_PUBLISH_STATES } from '../../../lib/eventExternalPublishing'
import { EVENT_OBJECTIVES } from '../../../lib/campaignEventDomain'

export default function CountyEventOperationsContent() {
  const { events: source, loading: eventsLoading, error: eventsError } = useCampaignEventsContext()
  const rows = useMemo(() => buildCountyOperationsRows(source), [source])
  const analytics = useMemo(() => buildEventAnalyticsSnapshot(source), [source])
  const gaps = useMemo(() => deriveCoverageGaps(source), [source])

  const [countyId, setCountyId] = useState<string | null>(null)
  const [eventType, setEventType] = useState<string | null>(null)
  const [objective, setObjective] = useState<string | null>(null)
  const [minReadiness, setMinReadiness] = useState<number | null>(null)
  const [mobilize, setMobilize] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      filterCountyRows(rows, {
        countyId,
        type: eventType,
        objective,
        minReadiness,
        mobilize,
      }),
    [rows, countyId, eventType, objective, minReadiness, mobilize],
  )

  const counties = useMemo(() => {
    const s = new Set<string>()
    for (const r of source) {
      if (r.county_id) s.add(r.county_id)
    }
    return [...s].sort()
  }, [source])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...filtered]
      .filter((r) => new Date(r.record.start_at).getTime() >= now - 86400000)
      .sort((a, b) => new Date(a.record.start_at).getTime() - new Date(b.record.start_at).getTime())
      .slice(0, 12)
  }, [filtered])

  const lowReadiness = filtered.filter((r) => r.readinessScore < 60)

  if (eventsError) {
    return (
      <div className="event-coordinator-desk county-event-ops" id="county-event-operations">
        <p className="event-coordinator-desk__placeholder" role="alert">
          Could not load campaign events: {eventsError.message}
        </p>
        <Link to="/events" className="event-coordinator-desk__back">
          ← Back to Event Coordinator Desk
        </Link>
      </div>
    )
  }

  return (
    <div className="event-coordinator-desk county-event-ops" id="county-event-operations">
      <header className="event-coordinator-desk__command">
        <p className="event-coordinator-desk__eyebrow">County operations</p>
        <h1 className="event-coordinator-desk__title">County event command center</h1>
        <p className="event-coordinator-desk__lede">
          Mobile-first view of readiness, staffing pressure, Mobilize state, and follow-up risk across
          your geography. Events load from Supabase for the active campaign.
        </p>
        {eventsLoading ? (
          <p className="event-coordinator-desk__meta" aria-live="polite">
            Loading events…
          </p>
        ) : source.length === 0 ? (
          <p className="event-coordinator-desk__placeholder">
            No events yet — create one from the coordinator desk or neighborhood hub to activate this
            view.
          </p>
        ) : null}
        <div className="event-coordinator-desk__quick-actions" aria-label="Hub navigation">
          <Link to="/events" className="btn-touch btn-touch--ghost">
            Coordinator desk
          </Link>
          <Link to="/events/neighborhood" className="btn-touch btn-touch--ghost">
            Neighborhood activation
          </Link>
          <Link to="/events/analytics" className="btn-touch btn-touch--ghost">
            Analytics
          </Link>
          <Link to="/events/calendar" className="btn-touch">
            Calendar
          </Link>
        </div>
      </header>

      <section className="event-coordinator-desk__section" aria-labelledby="co-kpi-heading">
        <h2 id="co-kpi-heading" className="event-coordinator-desk__h2">
          County summary KPIs
        </h2>
        <div className="county-ops-kpi-grid" role="list">
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Events in queue</span>
            <span className="county-ops-kpi__v">{analytics.totalEvents}</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Avg readiness</span>
            <span className="county-ops-kpi__v">{analytics.avgReadiness}%</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Below 50% readiness</span>
            <span className="county-ops-kpi__v county-ops-kpi__v--warn">{analytics.lowReadinessCount}</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Coverage gaps</span>
            <span className="county-ops-kpi__v">{gaps.length}</span>
          </div>
        </div>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-filters-heading">
        <h2 id="co-filters-heading" className="event-coordinator-desk__h2">
          Filters
        </h2>
        <div className="county-ops-filters">
          <label className="county-ops-filter">
            <span>County</span>
            <select
              value={countyId ?? ''}
              onChange={(e) => setCountyId(e.target.value || null)}
            >
              <option value="">All</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Event type</span>
            <select
              value={eventType ?? ''}
              onChange={(e) => setEventType(e.target.value || null)}
            >
              <option value="">All</option>
              {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Objective</span>
            <select
              value={objective ?? ''}
              onChange={(e) => setObjective(e.target.value || null)}
            >
              <option value="">All</option>
              {EVENT_OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Min readiness</span>
            <select
              value={minReadiness ?? ''}
              onChange={(e) =>
                setMinReadiness(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Any</option>
              <option value="80">80+</option>
              <option value="60">60+</option>
              <option value="40">40+</option>
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Publish state</span>
            <select
              value={mobilize ?? ''}
              onChange={(e) => setMobilize(e.target.value || null)}
            >
              <option value="">All</option>
              {EXTERNAL_PUBLISH_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-readiness-heading">
        <h2 id="co-readiness-heading" className="event-coordinator-desk__h2">
          Readiness board
        </h2>
        {lowReadiness.length === 0 ? (
          <p className="event-coordinator-desk__meta">No events below 60% in current filters.</p>
        ) : (
          <ul className="county-ops-board">
            {lowReadiness.map((r) => (
              <li key={r.record.event_id}>
                <Link to={campaignEventRecordPath(r.record.event_id)}>{r.record.title}</Link>
                <span className="county-ops-pill">{r.readinessScore}%</span>
                <span className="county-ops-sub">{r.blockers[0] ?? 'Review tasks'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-upcoming-heading">
        <h2 id="co-upcoming-heading" className="event-coordinator-desk__h2">
          Upcoming events
        </h2>
        <ul className="county-ops-cards">
          {upcoming.map((r) => (
            <li key={r.record.event_id} className="county-ops-card">
              <div className="county-ops-card__top">
                <h3 className="county-ops-card__title">
                  <Link to={campaignEventRecordPath(r.record.event_id)}>{r.record.title}</Link>
                </h3>
                <span className="county-ops-pill">{r.readinessScore}% ready</span>
              </div>
              <p className="county-ops-card__meta">
                {r.typeKey?.replace(/_/g, ' ') ?? r.record.event_type} ·{' '}
                {new Date(r.record.start_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <p className="county-ops-card__meta">
                Objective: {r.objectiveLabel ?? '—'} · Staffing: {r.staffingCoverage}% · Workflow:{' '}
                {r.workflowPercent}% · Mobilize: {r.mobilizePublish}
              </p>
              {r.blockers.length > 0 ? (
                <p className="county-ops-card__warn">Blocker: {r.blockers[0]}</p>
              ) : null}
              <div className="county-ops-card__actions">
                <Link className="btn-touch btn-touch--ghost" to={campaignEventRecordPath(r.record.event_id)}>
                  Open
                </Link>
                <Link className="btn-touch btn-touch--ghost" to={`${campaignEventRecordPath(r.record.event_id)}/tasks`}>
                  Tasks
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-coverage-heading">
        <h2 id="co-coverage-heading" className="event-coordinator-desk__h2">
          Geography coverage gaps
        </h2>
        {gaps.length === 0 ? (
          <p className="event-coordinator-desk__meta">No heuristic gaps detected.</p>
        ) : (
          <ul className="county-ops-board">
            {gaps.map((g, i) => (
              <li key={`${g.kind}-${i}`}>
                <strong>{g.label}</strong> — {g.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-density-heading">
        <h2 id="co-density-heading" className="event-coordinator-desk__h2">
          Event density (by week)
        </h2>
        <ul className="county-ops-density">
          {analytics.densityByWeek.map((w) => (
            <li key={w.weekKey}>
              <span>{w.weekKey}</span>
              <span className="county-ops-density__bar" style={{ flex: w.count }} title={`${w.count} events`} />
              <span>{w.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="event-coordinator-desk__foot">
        <Link to="/events">← Event Coordinator Desk</Link>
      </p>
    </div>
  )
}
