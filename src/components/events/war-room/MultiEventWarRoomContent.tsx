import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignProfile } from '../../../hooks/useProfile'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import { useCampaignStaffingBulk } from '../../../hooks/useCampaignStaffingBulk'
import { campaignEventRecordPath, campaignEventRecordSectionPath } from '../../../lib/campaignEventSystem'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../../lib/campaignEventTypeMatrix'
import { buildWarRoomSnapshot } from '../../../lib/multiEventWarRoomService'
import {
  filterWarRoomRows,
  sortRowsForView,
  groupRowsByCounty,
  groupWarRoomIssuesBySection,
} from '../../../lib/multiEventWarRoomSelectors'
import type { WarRoomFilters, WarRoomViewMode } from '../../../lib/multiEventWarRoomSchemas'
import type { CommandPanelIssue } from '../../../lib/todayCommandService'
import { buildRapidActionContextFromEvent } from '../../../lib/rapidActionContextSelectors'
import { mergeRapidActionContext } from '../../../lib/rapidActionContextSelectors'
import RapidActionsBar from '../command/RapidActionsBar'
import StaffingCoverageHeatmap from '../command/StaffingCoverageHeatmap'
import VolunteerLoadBalancerPanel from '../command/VolunteerLoadBalancerPanel'

type Props = {
  profile: CampaignProfile | null
}

function safeEventTitle(title: string | null | undefined): string {
  const t = String(title ?? '').trim()
  return t || 'Untitled event'
}

function formatEventStart(iso: string | null | undefined): string {
  if (!iso) return 'Schedule TBD'
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'Schedule TBD'
  return new Date(iso).toLocaleString()
}

const defaultFilters = (): WarRoomFilters => ({
  countyId: null,
  eventType: null,
  ownerUserId: null,
  healthBand: 'any',
  objectiveContains: '',
})

export default function MultiEventWarRoomContent({ profile }: Props) {
  const { events, loading, refetch } = useCampaignEventsContext()
  /** Aligns snapshot, heatmaps, and staffing bulk with war-room service filters (no canceled/archived). */
  const programEvents = useMemo(() => {
    return events.filter((e) => {
      const s = String(e.stage_status ?? '').toLowerCase()
      return s !== 'canceled' && s !== 'archived'
    })
  }, [events])
  const eventIds = useMemo(() => programEvents.map((e) => e.event_id), [programEvents])
  const { assignmentMap } = useCampaignStaffingBulk(eventIds)

  const [asOfMs, setAsOfMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAsOfMs(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [])
  const [viewMode, setViewMode] = useState<WarRoomViewMode>('board')
  const [filters, setFilters] = useState<WarRoomFilters>(defaultFilters)
  const [compactCards, setCompactCards] = useState(true)

  const snapshot = useMemo(
    () => buildWarRoomSnapshot(programEvents, asOfMs, { assignmentMap }),
    [programEvents, asOfMs, assignmentMap],
  )

  const filteredRows = useMemo(() => {
    const f = filterWarRoomRows(snapshot.rows, filters)
    return sortRowsForView(f, viewMode)
  }, [snapshot.rows, filters, viewMode])

  const geo = useMemo(() => groupRowsByCounty(filteredRows), [filteredRows])

  const issuesBySection = useMemo(() => {
    const grouped = groupWarRoomIssuesBySection(snapshot.issues)
    const out: Array<{ section: CommandPanelIssue['section']; items: CommandPanelIssue[] }> = []
    let n = 0
    const cap = 18
    for (const g of grouped) {
      const take = g.items.slice(0, Math.max(0, cap - n))
      if (!take.length) continue
      out.push({ section: g.section, items: take })
      n += take.length
      if (n >= cap) break
    }
    return out
  }, [snapshot.issues])

  const liveNowCount = useMemo(() => snapshot.rows.filter((r) => r.bucket === 'live_now').length, [snapshot.rows])

  const rapidContext = useMemo(() => {
    const top = snapshot.top_urgent[0]?.item.record ?? programEvents[0] ?? null
    const summary =
      snapshot.top_urgent[0]?.intervention_reason_summary ||
      snapshot.top_urgent[0]?.intervention_reason_codes.join(' · ') ||
      snapshot.issues[0]?.whyHere ||
      null
    return mergeRapidActionContext(
      buildRapidActionContextFromEvent('events_dashboard', top, {
        issue_summary: summary,
      }),
      {
        /** Oldest in queue — not derived from truncated issue panel. */
        approval_request_event_id: snapshot.pending_approval_event_id,
      },
    )
  }, [snapshot, programEvents])

  const counties = useMemo(() => {
    const s = new Set<string | null>()
    for (const e of programEvents) s.add(e.county_id)
    return [...s]
  }, [programEvents])

  if (loading && events.length === 0) {
    return (
      <div className="war-room-page" id="war-room-root">
        <p className="event-coordinator-desk__meta" role="status">
          Loading campaign events…
        </p>
      </div>
    )
  }

  if (!loading && events.length === 0) {
    return (
      <div className="war-room-page" id="war-room-root">
        <header className="war-room-page__hero">
          <p className="event-coordinator-desk__eyebrow">Multi-event operations</p>
          <h1 className="event-coordinator-desk__title">War room</h1>
        </header>
        <p className="event-coordinator-desk__placeholder" role="status">
          No campaign events loaded. Add events from the coordinator desk or calendar; the war room activates when programs exist.
        </p>
        <div className="war-room-page__nav-links">
          <Link to="/events" className="btn-touch">
            Coordinator desk
          </Link>
          <Link to="/events/calendar" className="btn-touch">
            Calendar
          </Link>
        </div>
      </div>
    )
  }

  if (!loading && events.length > 0 && programEvents.length === 0) {
    return (
      <div className="war-room-page" id="war-room-root">
        <header className="war-room-page__hero">
          <p className="event-coordinator-desk__eyebrow">Multi-event operations</p>
          <h1 className="event-coordinator-desk__title">War room</h1>
        </header>
        <p className="event-coordinator-desk__placeholder" role="status">
          No active program events in view (all are canceled or archived). Restore or create events from the coordinator desk.
        </p>
        <div className="war-room-page__nav-links">
          <Link to="/events" className="btn-touch">
            Coordinator desk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="war-room-page" id="war-room-root">
      <header className="war-room-page__hero">
        <div>
          <p className="event-coordinator-desk__eyebrow">Multi-event operations</p>
          <h1 className="event-coordinator-desk__title">War room</h1>
          <p className="event-coordinator-desk__lede">
            Live oversight across events — prioritization blends health, staffing, comms, local day-of workspaces, and governance
            queue. Deterministic; drill down into each event to act.
          </p>
        </div>
        <div className="war-room-page__hero-stats" role="status">
          <div>
            <span className="war-room-page__stat-k">Live</span>
            <span className="war-room-page__stat-v">{liveNowCount}</span>
          </div>
          <div>
            <span className="war-room-page__stat-k">Now band</span>
            <span className="war-room-page__stat-v">{snapshot.intervention_now_count}</span>
          </div>
          <div>
            <span className="war-room-page__stat-k">Cross-issues</span>
            <span className="war-room-page__stat-v">{snapshot.cross_event_issues_total}</span>
          </div>
          <div>
            <span className="war-room-page__stat-k">Closure backlog</span>
            <span className="war-room-page__stat-v">{snapshot.closure_backlog_total}</span>
          </div>
        </div>
      </header>

      {liveNowCount === 0 ? (
        <p className="war-room-page__quiet" role="status">
          Quiet airspace: no events in the live window right now. The board below still surfaces near-term, debrief, and backlog work.
        </p>
      ) : null}

      <div className="war-room-page__toolbar">
        <div className="war-room-page__nav-links">
          <Link to="/events/calendar" className="btn-touch">
            Calendar
          </Link>
          <Link to="/events/review-requests" className="btn-touch">
            Approval queue
          </Link>
          <Link to="/events" className="btn-touch">
            Coordinator desk
          </Link>
        </div>
        <label className="war-room-page__toggle">
          <input type="checkbox" checked={compactCards} onChange={(e) => setCompactCards(e.target.checked)} /> Compact
          cards
        </label>
      </div>

      <RapidActionsBar
        context={rapidContext}
        profile={profile}
        operationalEvent={snapshot.top_urgent[0]?.item.record ?? programEvents[0] ?? null}
        campaignEvents={programEvents}
        assignmentMap={assignmentMap}
        onAfterAction={() => void refetch()}
        compact
      />

      <section className="war-room-page__section" aria-labelledby="war-filters-heading">
        <h2 id="war-filters-heading" className="event-coordinator-desk__h2">
          Filters &amp; layout
        </h2>
        <div className="war-room-page__filters">
          <label>
            County
            <select
              className="btn-touch"
              value={filters.countyId ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, countyId: e.target.value === '' ? null : e.target.value }))
              }
            >
              <option value="">All</option>
              {counties.map((c) => (
                <option key={c ?? 'none'} value={c ?? ''}>
                  {c ?? 'No county'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Event type
            <select
              className="btn-touch"
              value={filters.eventType ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, eventType: e.target.value === '' ? null : e.target.value }))
              }
            >
              <option value="">All</option>
              {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Health
            <select
              className="btn-touch"
              value={filters.healthBand}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  healthBand: e.target.value as WarRoomFilters['healthBand'],
                }))
              }
            >
              <option value="any">Any band</option>
              <option value="READY">Ready</option>
              <option value="AT_RISK">At risk</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label className="war-room-page__filter-grow">
            Objective / title contains
            <input
              type="search"
              className="war-room-page__search"
              value={filters.objectiveContains}
              onChange={(e) => setFilters((f) => ({ ...f, objectiveContains: e.target.value }))}
              placeholder="Filter…"
            />
          </label>
        </div>
        <div className="war-room-page__view-tabs" role="tablist">
          {(
            [
              ['board', 'Command board'],
              ['timeline', 'Timeline'],
              ['issues', 'Issue-centric'],
              ['staffing', 'Staffing'],
              ['comms', 'Comms risk'],
              ['geo', 'Geography'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={viewMode === id ? 'war-room-page__tab war-room-page__tab--active' : 'war-room-page__tab'}
              aria-selected={viewMode === id}
              onClick={() => setViewMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="war-room-page__section war-room-page__grid-two" aria-labelledby="war-live-heading">
        <div>
          <h2 id="war-live-heading" className="event-panel__h3">
            Priority strip (top 5 by war-room score)
          </h2>
          <ul className="war-room-page__priority-strip">
            {snapshot.top_urgent.map((r) => (
              <li key={r.item.record.event_id}>
                <Link to={campaignEventRecordPath(r.item.record.event_id)} className="war-room-page__priority-link">
                  <strong>{safeEventTitle(r.item.record.title)}</strong>
                  <span className="war-room-page__mono">
                    P{r.war_room_priority_score} · {r.intervention_urgency} · {r.bucket.replace(/_/g, ' ')}
                  </span>
                  <span className="war-room-page__priority-hint">{r.intervention_reason_summary}</span>
                </Link>
              </li>
            ))}
            {snapshot.top_urgent.length === 0 ? (
              <li className="subtitle">Nothing in the top urgency band (priority strip is unfiltered).</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2 className="event-panel__h3">Owner cascade signals</h2>
          {snapshot.owner_cascade_risks.length === 0 ? (
            <p className="subtitle">No overlapping same-owner windows detected in the 48h prep band.</p>
          ) : (
            <ul className="war-room-page__cascade">
              {snapshot.owner_cascade_risks.map((o, i) => (
                <li key={`${o.owner_user_id ?? 'x'}-${i}`}>
                  {o.display_hint} — {o.event_ids.length} events
                </li>
              ))}
            </ul>
          )}
          <h3 className="event-panel__h3 war-room-page__subsection-h">Volunteer multi-event strain</h3>
          {snapshot.volunteer_strain_risks.length === 0 ? (
            <p className="subtitle">No volunteers mapped to multiple near-term events in assignment data.</p>
          ) : (
            <ul className="war-room-page__cascade">
              {snapshot.volunteer_strain_risks.map((v) => (
                <li key={v.user_id}>
                  {v.display_hint} — {v.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="war-room-page__section" aria-labelledby="war-cards-heading">
        <h2 id="war-cards-heading" className="event-coordinator-desk__h2">
          Event board ({filteredRows.length})
        </h2>
        <div className={compactCards ? 'war-room-page__card-grid war-room-page__card-grid--compact' : 'war-room-page__card-grid'}>
          {filteredRows.map((r) => (
            <article key={r.item.record.event_id} className="war-room-card">
              <header className="war-room-card__head">
                <Link to={campaignEventRecordPath(r.item.record.event_id)} className="war-room-card__title">
                  {safeEventTitle(r.item.record.title)}
                </Link>
                <span className={`war-room-card__urgency war-room-card__urgency--${r.intervention_urgency}`}>
                  {r.intervention_urgency}
                </span>
              </header>
              <p className="war-room-card__meta">
                {r.item.record.event_type} · {formatEventStart(r.item.record.start_at)} · {r.bucket.replace(/_/g, ' ')}
              </p>
              <p className="war-room-card__hint" title={r.intervention_reason_codes.join(', ')}>
                {r.intervention_reason_summary}
              </p>
              <dl className="war-room-card__dl">
                <div>
                  <dt>Health</dt>
                  <dd>
                    {r.adjusted_health_score} · {r.adjusted_status.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt>Staffing</dt>
                  <dd>{String(r.item.record.staffing_state ?? '—').replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt>Comms</dt>
                  <dd>{String(r.item.record.mobilize_publish_state ?? '—').replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt>Field issues</dt>
                  <dd>{r.day_of_open_issues}</dd>
                </div>
              </dl>
              {r.live_segment_label ? (
                <p className="war-room-card__ros">
                  <strong>RoS:</strong> {r.live_segment_label}
                </p>
              ) : null}
              <p className="war-room-card__next">{r.recommended_next_action}</p>
              <div className="war-room-card__actions">
                <Link className="event-coordinator-desk__btn" to={campaignEventRecordPath(r.item.record.event_id)}>
                  Command
                </Link>
                <Link
                  className="event-coordinator-desk__btn"
                  to={campaignEventRecordSectionPath(r.item.record.event_id, 'field')}
                >
                  Field
                </Link>
                <Link
                  className="event-coordinator-desk__btn"
                  to={campaignEventRecordSectionPath(r.item.record.event_id, 'communications')}
                >
                  Comms
                </Link>
                <Link
                  className="event-coordinator-desk__btn"
                  to={campaignEventRecordSectionPath(r.item.record.event_id, 'staffing')}
                >
                  Staffing
                </Link>
              </div>
            </article>
          ))}
        </div>
        {filteredRows.length === 0 ? (
          <p className="event-coordinator-desk__placeholder">No events match filters.</p>
        ) : null}
      </section>

      {viewMode === 'geo' ? (
        <section className="war-room-page__section" aria-labelledby="war-geo-heading">
          <h2 id="war-geo-heading" className="event-coordinator-desk__h2">
            Geography board
          </h2>
          <p className="subtitle">County / region clusters by lowest health in the filtered board (list-first; map hooks can attach later).</p>
          <ul className="war-room-page__geo">
            {geo.map((g) => (
              <li key={g.label}>
                <strong>{g.label}</strong> — {g.row_count} event(s), min health {g.min_health}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="war-room-page__section" aria-labelledby="war-issues-heading">
        <h2 id="war-issues-heading" className="event-coordinator-desk__h2">
          Cross-event command issues (showing {snapshot.issues.length}
          {snapshot.cross_event_issues_total > snapshot.issues.length
            ? ` of ${snapshot.cross_event_issues_total}`
            : ''}
          )
        </h2>
        {snapshot.issues.length === 0 ? (
          <p className="event-coordinator-desk__placeholder" role="status">
            No cross-event issues surfaced — command health, staffing, comms, and governance filters found nothing to flag for this list.
          </p>
        ) : (
          <div className="war-room-page__issues-grouped">
            {issuesBySection.map((grp) => (
              <div key={grp.section} className="war-room-page__issue-group">
                <h3 className="event-panel__h3">{grp.section.replace(/_/g, ' ')}</h3>
                <ul className="war-room-page__issue-list">
                  {grp.items.map((i) => (
                    <li key={i.id}>
                      <Link to={campaignEventRecordPath(i.record.event_id)}>{safeEventTitle(i.record.title)}</Link> —{' '}
                      {i.whyHere}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="war-room-page__section" aria-labelledby="war-closure-heading">
        <h2 id="war-closure-heading" className="event-coordinator-desk__h2">
          Closure / debrief backlog (showing {snapshot.closure_backlog.length}
          {snapshot.closure_backlog_total > snapshot.closure_backlog.length
            ? ` of ${snapshot.closure_backlog_total}`
            : ''}
          )
        </h2>
        <ul className="war-room-page__closure">
          {snapshot.closure_backlog.slice(0, 12).map((c) => (
            <li key={c.record.event_id}>
              <Link to={campaignEventRecordSectionPath(c.record.event_id, 'field')}>
                {safeEventTitle(c.record.title)}
              </Link>{' '}
              — {c.reasons.join('; ')}
            </li>
          ))}
        </ul>
        {snapshot.closure_backlog_total === 0 ? (
          <p className="subtitle" role="status">
            Cleared: no past-end closure or signup-handoff gaps detected in local day-of state for listed events.
          </p>
        ) : null}
      </section>

      <section className="war-room-page__section war-room-page__grid-two" aria-labelledby="war-heat-heading">
        <div>
          <h2 id="war-heat-heading" className="event-coordinator-desk__h2">
            Staffing coverage heatmap
          </h2>
          <StaffingCoverageHeatmap events={programEvents} assignmentMap={assignmentMap} />
        </div>
        <div>
          <h2 className="event-coordinator-desk__h2">Volunteer load</h2>
          <VolunteerLoadBalancerPanel events={programEvents} assignmentMap={assignmentMap} />
        </div>
      </section>

      <section className="war-room-page__section" aria-labelledby="war-aj-heading">
        <h2 id="war-aj-heading" className="event-coordinator-desk__h2">
          Agent Jones — deterministic war-room brief
        </h2>
        <p className="subtitle">
          Paste into Agent Jones or use as stand-alone when AI is offline. Does not mutate rows. Server-side AI (when enabled)
          remains advisory.
        </p>
        <pre className="war-room-page__brief">{snapshot.agent_jones_brief_lines.join('\n')}</pre>
      </section>
    </div>
  )
}
