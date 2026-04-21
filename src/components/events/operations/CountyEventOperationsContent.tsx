import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
} from '../../../lib/campaignEventSystem'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../../lib/campaignEventTypeMatrix'
import {
  buildCountyOperationsRows,
  buildFortnightAgenda,
  countEventsScheduledInMonth,
  filterCountyRows,
  selectFollowupAttentionRows,
  selectFollowupOverdueRows,
  selectRecentCompletedEvents,
  selectStaffingGapRows,
} from '../../../lib/eventOperationsSelectors'
import { buildEventAnalyticsSnapshot, deriveCoverageGaps } from '../../../lib/eventAnalyticsSelectors'
import { pressureBandFromScore } from '../../../lib/geographicCommandDomain'
import { heatIntensity01, rankGeographicInterventionCandidates } from '../../../lib/geographicCommandMetrics'
import { buildCountyCommandRollups } from '../../../lib/geographicCommandSelectors'
import { EXTERNAL_PUBLISH_STATES } from '../../../lib/eventExternalPublishing'
import { EVENT_OBJECTIVES, EVENT_OPERATIONAL_STATUSES } from '../../../lib/campaignEventDomain'
import { useGotvCommandLayer } from '../../../hooks/useGotvCommandLayer'
import { useProfile } from '../../../hooks/useProfile'
import { useVoterConversionLeadership } from '../../../hooks/useVoterConversionLeadership'
import GotvCountyReadinessPanel from '../../gotv/GotvCountyReadinessPanel'
import VoterConversionFunnel from '../../voter-conversion/VoterConversionFunnel'
import RelationalFollowupQueue from '../../voter-conversion/RelationalFollowupQueue'
import CommitmentBacklogPanel from '../../voter-conversion/CommitmentBacklogPanel'
import BallotPlanRiskCard from '../../voter-conversion/BallotPlanRiskCard'
import ChasePriorityCard from '../../voter-conversion/ChasePriorityCard'

export default function CountyEventOperationsContent() {
  const { profile } = useProfile()
  const voterConv = useVoterConversionLeadership(profile?.primary_role)
  const { events: source, loading: eventsLoading, error: eventsError } = useCampaignEventsContext()
  const gotv = useGotvCommandLayer('default')
  const rows = useMemo(() => buildCountyOperationsRows(source), [source])
  const analytics = useMemo(() => buildEventAnalyticsSnapshot(source), [source])
  const gaps = useMemo(() => deriveCoverageGaps(source), [source])

  const [countyId, setCountyId] = useState<string | null>(null)
  const [eventType, setEventType] = useState<string | null>(null)
  const [objective, setObjective] = useState<string | null>(null)
  const [minReadiness, setMinReadiness] = useState<number | null>(null)
  const [mobilize, setMobilize] = useState<string | null>(null)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState<string | null>(null)
  const [dateEnd, setDateEnd] = useState<string | null>(null)
  const [operationalStatus, setOperationalStatus] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      filterCountyRows(rows, {
        countyId,
        type: eventType,
        objective,
        minReadiness,
        mobilize,
        ownerUserId,
        dateStart,
        dateEnd,
        operationalStatus,
      }),
    [
      rows,
      countyId,
      eventType,
      objective,
      minReadiness,
      mobilize,
      ownerUserId,
      dateStart,
      dateEnd,
      operationalStatus,
    ],
  )

  const counties = useMemo(() => {
    const s = new Set<string>()
    for (const r of source) {
      if (r.county_id) s.add(r.county_id)
    }
    return [...s].sort()
  }, [source])

  const owners = useMemo(() => {
    const s = new Set<string>()
    for (const r of source) {
      if (r.owner_user_id) s.add(r.owner_user_id)
    }
    return [...s].sort()
  }, [source])

  const [opsListAsOfMs] = useState(() => Date.now())
  const geoRollups = useMemo(() => buildCountyCommandRollups(source, opsListAsOfMs, 14), [source, opsListAsOfMs])
  const geoInterventions = useMemo(
    () => rankGeographicInterventionCandidates(geoRollups, 6),
    [geoRollups],
  )
  const staffingGaps = useMemo(() => selectStaffingGapRows(filtered), [filtered])
  const followupAttention = useMemo(() => selectFollowupAttentionRows(filtered, opsListAsOfMs), [filtered, opsListAsOfMs])
  const followupOverdue = useMemo(() => selectFollowupOverdueRows(filtered, opsListAsOfMs), [filtered, opsListAsOfMs])
  const eventsThisMonth = useMemo(() => countEventsScheduledInMonth(source), [source])
  const recentOutcomes = useMemo(() => selectRecentCompletedEvents(source, 45, opsListAsOfMs), [source, opsListAsOfMs])
  const fortnight = useMemo(() => buildFortnightAgenda(filtered), [filtered])

  const upcoming = useMemo(() => {
    const t = opsListAsOfMs
    return [...filtered]
      .filter((r) => new Date(r.record.start_at).getTime() >= t - 86400000)
      .sort((a, b) => new Date(a.record.start_at).getTime() - new Date(b.record.start_at).getTime())
      .slice(0, 14)
  }, [filtered, opsListAsOfMs])

  const lowReadiness = filtered.filter((r) => r.readinessScore < 60)

  const topTypes = useMemo(() => {
    const entries = Object.entries(analytics.byType).sort((a, b) => b[1] - a[1])
    return entries.slice(0, 6)
  }, [analytics.byType])

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
          Plan, staff, and close the loop on events in your geography — readiness, outreach targets,
          Mobilize state, and follow-up in one place. Events load from Supabase for the active campaign.
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
            Full calendar
          </Link>
        </div>
      </header>

      <GotvCountyReadinessPanel
        campaignId="default"
        countyId={countyId}
        rollups={gotv.rollups}
        phaseResolution={gotv.phaseResolution}
        analytics={gotv.analytics}
        interventionHints={gotv.interventionHints}
        sites={gotv.sites}
        loading={gotv.loading}
        error={gotv.error}
        onRefresh={() => void gotv.refresh()}
      />

      {voterConv.enabled ? (
        <section
          className="event-coordinator-desk__section"
          aria-labelledby="voter-conversion-command-heading"
          id="voter-conversion-command"
        >
          <h2 id="voter-conversion-command-heading" className="event-coordinator-desk__h2">
            Voter conversion &amp; relational turnout
          </h2>
          {voterConv.loading ? (
            <p className="event-coordinator-desk__meta" aria-live="polite">
              Loading conversion rollups…
            </p>
          ) : voterConv.error ? (
            <p className="event-coordinator-desk__placeholder" role="alert">
              {voterConv.error}
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              <VoterConversionFunnel rollups={voterConv.rollups} />
              <ChasePriorityCard rollups={voterConv.rollups} phaseResolution={gotv.phaseResolution} />
              <CommitmentBacklogPanel rollups={voterConv.rollups} />
              <BallotPlanRiskCard rollups={voterConv.rollups} />
              <RelationalFollowupQueue rollups={voterConv.rollups} />
            </div>
          )}
        </section>
      ) : null}

      <section
        className="event-coordinator-desk__section"
        aria-labelledby="geo-command-heading"
        id="geographic-command"
      >
        <h2 id="geo-command-heading" className="event-coordinator-desk__h2">
          Geographic command (14d window)
        </h2>
        <p className="event-coordinator-desk__placeholder">
          Forward event density, staffing gaps, low readiness, Mobilize risk in the next week, and completed events still
          in follow-up — deterministic from the program queue (not a map layer).
        </p>
        {geoInterventions.length === 0 ? (
          <p className="event-coordinator-desk__meta">No geographic rollups yet — add counties to events.</p>
        ) : (
          <ul className="event-panel__list" style={{ listStyle: 'none', padding: 0 }}>
            {geoInterventions.map((g) => {
              const band = pressureBandFromScore(g.pressure_score_0_100)
              const heat = heatIntensity01(g.pressure_score_0_100)
              return (
                <li
                  key={g.area_key}
                  className="county-ops-geo-row"
                  style={{
                    border: '1px solid var(--border-subtle, #3333)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <strong>{g.label}</strong>
                      <span className="event-coordinator-desk__meta" style={{ marginLeft: 8 }}>
                        {band.toUpperCase()} · pressure {g.pressure_score_0_100}
                      </span>
                      <div className="event-coordinator-desk__meta">
                        Upcoming {g.upcoming_event_count} · gaps {g.staffing_gap_count} · low readiness{' '}
                        {g.low_readiness_count} · comms risk {g.mobilize_risk_count} · follow-up debt{' '}
                        {g.followup_debt_on_completed}
                      </div>
                      {g.reasons.length ? (
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                          {g.reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div style={{ minWidth: 120, flex: '1 1 140px' }}>
                      <div
                        aria-hidden
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: 'var(--surface-muted, #eee)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(heat * 100)}%`,
                            height: '100%',
                            background:
                              band === 'critical'
                                ? 'var(--danger, #c0392b)'
                                : band === 'watch'
                                  ? 'var(--warn, #d68910)'
                                  : 'var(--ok, #1e8449)',
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-touch btn-touch--ghost"
                        style={{ marginTop: 8, width: '100%' }}
                        disabled={g.county_id == null}
                        onClick={() => setCountyId(g.county_id)}
                      >
                        Filter this county
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-kpi-heading">
        <h2 id="co-kpi-heading" className="event-coordinator-desk__h2">
          County summary KPIs
        </h2>
        <div className="county-ops-kpi-grid" role="list">
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Events scheduled (this month)</span>
            <span className="county-ops-kpi__v">{eventsThisMonth}</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Total in queue</span>
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
            <span className="county-ops-kpi__k">Staffing gaps (filtered)</span>
            <span className="county-ops-kpi__v county-ops-kpi__v--warn">{staffingGaps.length}</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Follow-up attention</span>
            <span className="county-ops-kpi__v">{followupAttention.length}</span>
          </div>
          <div className="county-ops-kpi" role="listitem">
            <span className="county-ops-kpi__k">Coverage gaps (heuristic)</span>
            <span className="county-ops-kpi__v">{gaps.length}</span>
          </div>
        </div>
        {topTypes.length > 0 ? (
          <p className="county-ops-type-chips" aria-label="Events by type">
            <span className="county-ops-type-chips__label">By type:</span>
            {topTypes.map(([k, n]) => (
              <button
                key={k}
                type="button"
                className="county-ops-chip"
                onClick={() => setEventType(k)}
              >
                {k.replace(/_/g, ' ')} ({n})
              </button>
            ))}
          </p>
        ) : null}
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-filters-heading">
        <h2 id="co-filters-heading" className="event-coordinator-desk__h2">
          Filters
        </h2>
        <div className="county-ops-filters county-ops-filters--wrap">
          <label className="county-ops-filter">
            <span>County</span>
            <select value={countyId ?? ''} onChange={(e) => setCountyId(e.target.value || null)}>
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
            <select value={eventType ?? ''} onChange={(e) => setEventType(e.target.value || null)}>
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
            <select value={objective ?? ''} onChange={(e) => setObjective(e.target.value || null)}>
              <option value="">All</option>
              {EVENT_OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Operational status</span>
            <select
              value={operationalStatus ?? ''}
              onChange={(e) => setOperationalStatus(e.target.value || null)}
            >
              <option value="">All</option>
              {EVENT_OPERATIONAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Owner</span>
            <select value={ownerUserId ?? ''} onChange={(e) => setOwnerUserId(e.target.value || null)}>
              <option value="">All</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Min readiness</span>
            <select
              value={minReadiness ?? ''}
              onChange={(e) => setMinReadiness(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any</option>
              <option value="80">80+</option>
              <option value="60">60+</option>
              <option value="40">40+</option>
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Publish state</span>
            <select value={mobilize ?? ''} onChange={(e) => setMobilize(e.target.value || null)}>
              <option value="">All</option>
              {EXTERNAL_PUBLISH_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="county-ops-filter">
            <span>Starts after</span>
            <input
              type="date"
              value={dateStart ?? ''}
              onChange={(e) => setDateStart(e.target.value || null)}
            />
          </label>
          <label className="county-ops-filter">
            <span>Starts before</span>
            <input type="date" value={dateEnd ?? ''} onChange={(e) => setDateEnd(e.target.value || null)} />
          </label>
        </div>
        <p className="county-ops-filter-presets">
          <button type="button" className="btn-touch btn-touch--ghost" onClick={() => setDateStart(null)}>
            Clear dates
          </button>
          <button
            type="button"
            className="btn-touch btn-touch--ghost"
            onClick={() => {
              const d = new Date()
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              setDateStart(`${y}-${m}-01`)
              const last = new Date(y, d.getMonth() + 1, 0).getDate()
              setDateEnd(`${y}-${m}-${String(last).padStart(2, '0')}`)
            }}
          >
            This month
          </button>
        </p>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-fortnight-heading">
        <h2 id="co-fortnight-heading" className="event-coordinator-desk__h2">
          14-day operations strip
        </h2>
        <p className="event-coordinator-desk__meta">
          Same data as the full calendar — quick scan for density and clashes.{' '}
          <Link to="/events/calendar">Open calendar →</Link>
        </p>
        <div className="county-ops-fortnight" role="list">
          {fortnight.map((day) => (
            <div key={day.dayKey} className="county-ops-fortnight__day" role="listitem">
              <div className="county-ops-fortnight__day-label">{day.label}</div>
              <div className="county-ops-fortnight__chips">
                {day.events.length === 0 ? (
                  <span className="county-ops-fortnight__empty">—</span>
                ) : (
                  day.events.slice(0, 4).map((ev) => (
                    <Link
                      key={ev.record.event_id}
                      className="county-ops-fortnight__chip"
                      to={campaignEventRecordPath(ev.record.event_id)}
                      title={ev.record.title}
                    >
                      {ev.readinessScore}%
                    </Link>
                  ))
                )}
                {day.events.length > 4 ? (
                  <span className="county-ops-fortnight__more">+{day.events.length - 4}</span>
                ) : null}
              </div>
            </div>
          ))}
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

      <section
        className="event-coordinator-desk__section county-ops-split"
        aria-labelledby="co-staff-heading"
      >
        <div>
          <h2 id="co-staff-heading" className="event-coordinator-desk__h2">
            Staffing gaps
          </h2>
          {staffingGaps.length === 0 ? (
            <p className="event-coordinator-desk__meta">No staffing risk in current filters.</p>
          ) : (
            <ul className="county-ops-board">
              {staffingGaps.slice(0, 10).map((r) => (
                <li key={r.record.event_id}>
                  <Link to={campaignEventRecordSectionPath(r.record.event_id, 'staffing')}>
                    {r.record.title}
                  </Link>
                  <span className="county-ops-pill">{r.staffingCoverage}%</span>
                  <span className="county-ops-sub">{String(r.record.staffing_state ?? '')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="event-coordinator-desk__h2">Outreach / RSVP (targets)</h2>
          <p className="event-coordinator-desk__meta">
            RSVP wiring to Mobilize lands in Pass 3 — targets shown as operational goals per event type.
          </p>
          <ul className="county-ops-board">
            {upcoming.slice(0, 6).map((r) => (
              <li key={`rsvp-${r.record.event_id}`}>
                <span className="county-ops-sub">{r.record.title}</span>
                <span className="county-ops-pill">
                  RSVP {r.rsvpCount ?? '—'} / {r.rsvpGoal ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-fu-heading">
        <h2 id="co-fu-heading" className="event-coordinator-desk__h2">
          Follow-up due
        </h2>
        {followupOverdue.length > 0 ? (
          <p className="county-ops-card__warn" role="status">
            {followupOverdue.length} event(s) past the 72-hour follow-up window — close attendance and
            debrief tasks.
          </p>
        ) : null}
        {followupAttention.length === 0 ? (
          <p className="event-coordinator-desk__meta">No past events awaiting follow-up in filters.</p>
        ) : (
          <ul className="county-ops-board">
            {followupAttention.slice(0, 12).map((r) => (
              <li key={`fu-${r.record.event_id}`}>
                <Link to={campaignEventRecordSectionPath(r.record.event_id, 'followup')}>
                  {r.record.title}
                </Link>
                <span className="county-ops-sub">{r.record.followup_state ?? 'pending'}</span>
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
                {r.workflowPercent}% · Publish: {r.mobilizePublish}
              </p>
              {r.record.owner_user_id ? (
                <p className="county-ops-card__meta">Owner: {r.record.owner_user_id}</p>
              ) : null}
              {r.blockers.length > 0 ? (
                <p className="county-ops-card__warn">Blocker: {r.blockers[0]}</p>
              ) : null}
              <div className="county-ops-card__actions county-ops-card__actions--wrap">
                <Link className="btn-touch btn-touch--ghost" to={campaignEventRecordPath(r.record.event_id)}>
                  Open
                </Link>
                <Link
                  className="btn-touch btn-touch--ghost"
                  to={campaignEventRecordSectionPath(r.record.event_id, 'tasks')}
                >
                  Tasks
                </Link>
                <Link
                  className="btn-touch btn-touch--ghost"
                  to={campaignEventRecordSectionPath(r.record.event_id, 'staffing')}
                >
                  Staffing
                </Link>
                <Link
                  className="btn-touch btn-touch--ghost"
                  to={campaignEventRecordSectionPath(r.record.event_id, 'followup')}
                >
                  Follow-up
                </Link>
                <Link
                  className="btn-touch btn-touch--ghost"
                  to={campaignEventRecordSectionPath(r.record.event_id, 'mobilize')}
                >
                  Publish review
                </Link>
                <Link
                  className="btn-touch btn-touch--ghost"
                  to={`${campaignEventRecordPath(CAMPAIGN_EVENT_NEW_RECORD_SLUG)}?type=${encodeURIComponent(
                    r.typeKey ?? r.record.event_type ?? 'coffee_meeting',
                  )}`}
                >
                  Plan similar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="co-outcomes-heading">
        <h2 id="co-outcomes-heading" className="event-coordinator-desk__h2">
          Recent event outcomes
        </h2>
        {recentOutcomes.length === 0 ? (
          <p className="event-coordinator-desk__meta">No completed events in the last 45 days.</p>
        ) : (
          <ul className="county-ops-board">
            {recentOutcomes.slice(0, 8).map((ev) => (
              <li key={`out-${ev.event_id}`}>
                <Link to={campaignEventRecordPath(ev.event_id)}>{ev.title}</Link>
                <span className="county-ops-sub">
                  {new Date(ev.end_at || ev.start_at).toLocaleDateString()}
                  {ev.volunteer_outcome != null ? ` · volunteers ${ev.volunteer_outcome}` : ''}
                  {ev.voter_contact_outcome != null ? ` · contacts ${ev.voter_contact_outcome}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
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
