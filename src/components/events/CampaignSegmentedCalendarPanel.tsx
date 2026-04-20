import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../lib/campaignCalendarArchitecture'
import {
  CALENDAR_FUNCTION_SEGMENTS,
  CALENDAR_GEO_SCOPE_SEGMENTS,
  CALENDAR_LIFECYCLE_STATUSES,
  CALENDAR_VISIBILITY_SEGMENTS,
} from '../../lib/campaignCalendarArchitecture'
import { useCampaignEventsContext } from '../../context/CampaignEventsContext'
import {
  applyCalendarSegmentFilters,
  daysInMonth,
  groupEventsByLocalDay,
  inferFunctionSegment,
  inferGeoScope,
  localDayKey,
  type CampaignCalendarSegmentFilters,
  type CampaignCalendarViewMode,
  pickUpcomingStrip,
  sortEventsByStartAsc,
  weekdayMondayZero,
} from '../../lib/campaignCalendarSegmentEngine'
import { campaignEventRecordPath } from '../../lib/campaignEventSystem'
import EventHealthChip from './command/EventHealthChip'
import { collectOperationsGapsForEvent } from '../../lib/campaignEventCoordinatorOperations'
import { computeEventHealthScore, healthStatusToUiModifier } from '../../lib/eventHealthScoreService'

const EMPTY_FILTERS: CampaignCalendarSegmentFilters = {
  visibility: '',
  functionSegment: '',
  geoScope: '',
  lifecycle: '',
  ownerQuery: '',
}

function formatSegmentLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CampaignSegmentedCalendarPanel() {
  const { events: sourceEvents } = useCampaignEventsContext()
  const [filters, setFilters] = useState<CampaignCalendarSegmentFilters>(EMPTY_FILTERS)
  const [viewMode, setViewMode] = useState<CampaignCalendarViewMode>('agenda')
  const [cursor, setCursor] = useState(() => ({ year: 2026, monthIndex: 3 }))

  const filtered = useMemo(
    () => applyCalendarSegmentFilters(sourceEvents, filters),
    [sourceEvents, filters],
  )
  const sorted = useMemo(() => sortEventsByStartAsc(filtered), [filtered])
  const strip = useMemo(() => pickUpcomingStrip(filtered, 7), [filtered])

  const agendaGroups = useMemo(() => {
    const map = groupEventsByLocalDay(sorted)
    return [...map.entries()]
  }, [sorted])

  const monthGrid = useMemo(() => {
    const { year, monthIndex } = cursor
    const dim = daysInMonth(year, monthIndex)
    const lead = weekdayMondayZero(year, monthIndex)
    const cells: ({ day: number } | null)[] = Array(lead).fill(null).map(() => null)
    for (let d = 1; d <= dim; d += 1) {
      cells.push({ day: d })
    }
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
    const inMonth = (iso: string) => {
      const key = localDayKey(iso)
      const [y, m] = key.split('-').map(Number)
      return y === year && m === monthIndex + 1
    }
    const byDay = new Map<number, CampaignCalendarEventRecord[]>()
    for (const e of sorted) {
      if (!inMonth(e.start_at)) continue
      const day = new Date(e.start_at).getDate()
      const arr = byDay.get(day) ?? []
      arr.push(e)
      byDay.set(day, arr)
    }
    return { cells, byDay, dim, year, monthIndex }
  }, [cursor, sorted])

  const showDevBanner = import.meta.env.DEV && sourceEvents.length > 0

  return (
    <div className="seg-cal" id="campaign-segmented-calendar">
      {showDevBanner ? (
        <p className="seg-cal__banner" role="note">
          <strong>Development sample events</strong> — same engine as production; data clears when the
          events table replaces fixtures.
        </p>
      ) : null}

      <div className="seg-cal__toolbar">
        <div className="seg-cal__view-toggle" role="group" aria-label="Calendar view mode">
          <button
            type="button"
            className={viewMode === 'agenda' ? 'seg-cal__toggle is-active' : 'seg-cal__toggle'}
            onClick={() => setViewMode('agenda')}
          >
            Agenda
          </button>
          <button
            type="button"
            className={viewMode === 'month' ? 'seg-cal__toggle is-active' : 'seg-cal__toggle'}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
        {viewMode === 'month' ? (
          <div className="seg-cal__month-nav">
            <button
              type="button"
              className="seg-cal__nav-btn"
              onClick={() =>
                setCursor((c) =>
                  c.monthIndex <= 0
                    ? { year: c.year - 1, monthIndex: 11 }
                    : { ...c, monthIndex: c.monthIndex - 1 },
                )
              }
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="seg-cal__month-label">
              {new Date(cursor.year, cursor.monthIndex, 1).toLocaleString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              className="seg-cal__nav-btn"
              onClick={() =>
                setCursor((c) =>
                  c.monthIndex >= 11
                    ? { year: c.year + 1, monthIndex: 0 }
                    : { ...c, monthIndex: c.monthIndex + 1 },
                )
              }
              aria-label="Next month"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <fieldset className="seg-cal__filters">
        <legend className="seg-cal__filters-legend">Segment filters (single calendar engine)</legend>
        <div className="seg-cal__filter-grid">
          <label className="seg-cal__filter">
            <span>Visibility</span>
            <select
              value={filters.visibility}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  visibility: e.target.value as CampaignCalendarSegmentFilters['visibility'],
                }))
              }
            >
              <option value="">All</option>
              {CALENDAR_VISIBILITY_SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {formatSegmentLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="seg-cal__filter">
            <span>Function (inferred)</span>
            <select
              value={filters.functionSegment}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  functionSegment: e.target.value as CampaignCalendarSegmentFilters['functionSegment'],
                }))
              }
            >
              <option value="">All</option>
              {CALENDAR_FUNCTION_SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {formatSegmentLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="seg-cal__filter">
            <span>Geography (inferred)</span>
            <select
              value={filters.geoScope}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  geoScope: e.target.value as CampaignCalendarSegmentFilters['geoScope'],
                }))
              }
            >
              <option value="">All</option>
              {CALENDAR_GEO_SCOPE_SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {formatSegmentLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="seg-cal__filter">
            <span>Lifecycle status</span>
            <select
              value={filters.lifecycle}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  lifecycle: e.target.value as CampaignCalendarSegmentFilters['lifecycle'],
                }))
              }
            >
              <option value="">All</option>
              {CALENDAR_LIFECYCLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatSegmentLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="seg-cal__filter seg-cal__filter--grow">
            <span>Owner (id or role)</span>
            <input
              type="search"
              value={filters.ownerQuery}
              onChange={(e) => setFilters((f) => ({ ...f, ownerQuery: e.target.value }))}
              placeholder="e.g. coord-alex or finance_lead"
              autoComplete="off"
            />
          </label>
        </div>
        <button type="button" className="seg-cal__clear" onClick={() => setFilters(EMPTY_FILTERS)}>
          Clear filters
        </button>
      </fieldset>

      <p className="seg-cal__meta" role="status">
        Showing <strong>{filtered.length}</strong> of <strong>{sourceEvents.length}</strong> events in
        this source (filtered views, not a second calendar).
      </p>

      {viewMode === 'agenda' ? (
        <div className="seg-cal__agenda">
          {agendaGroups.length === 0 ? (
            <p className="event-coordinator-desk__placeholder">
              No events match these filters. Production uses the same filters against Supabase rows.
            </p>
          ) : (
            agendaGroups.map(([day, evs]) => (
              <section key={day} className="seg-cal__agenda-day" aria-labelledby={`seg-day-${day}`}>
                <h3 id={`seg-day-${day}`} className="seg-cal__agenda-day-title">
                  {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <ul className="seg-cal__agenda-list">
                  {evs.map((e) => (
                    <li key={e.event_id} className="seg-cal__agenda-item">
                      <div className="seg-cal__agenda-main">
                        <Link to={campaignEventRecordPath(e.event_id)} className="seg-cal__agenda-link">
                          {e.title}
                        </Link>
                        <span className="seg-cal__agenda-time">{formatEventTime(e.start_at)}</span>
                      </div>
                      <p className="seg-cal__agenda-chips">
                        <EventHealthChip record={e} />
                        <span className="seg-cal__chip">{formatSegmentLabel(e.visibility_scope)}</span>
                        <span className="seg-cal__chip">{formatSegmentLabel(inferFunctionSegment(e))}</span>
                        <span className="seg-cal__chip">{formatSegmentLabel(inferGeoScope(e))}</span>
                        <span className="seg-cal__chip">{e.stage_status}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="seg-cal__month">
          <div className="seg-cal__dow" aria-hidden>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d} className="seg-cal__dow-cell">
                {d}
              </span>
            ))}
          </div>
          <div className="seg-cal__grid">
            {monthGrid.cells.map((cell, i) => {
              if (!cell) {
                return <div key={`pad-${i}`} className="seg-cal__cell seg-cal__cell--muted" />
              }
              const evs = monthGrid.byDay.get(cell.day) ?? []
              return (
                <div key={cell.day} className="seg-cal__cell">
                  <span className="seg-cal__cell-day">{cell.day}</span>
                  <ul className="seg-cal__cell-events">
                    {evs.map((e) => {
                      const gaps = collectOperationsGapsForEvent(e)
                      const health = computeEventHealthScore({ record: e, gaps })
                      const hm = healthStatusToUiModifier(health.status)
                      return (
                        <li key={e.event_id}>
                          <Link
                            to={campaignEventRecordPath(e.event_id)}
                            className={`seg-cal__cell-link seg-cal__cell-link--health seg-cal__cell-link--health-${hm}`}
                            title={`${e.title} · health ${health.score}`}
                          >
                            {e.title.length > 22 ? `${e.title.slice(0, 20)}…` : e.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <section className="seg-cal__strip" aria-labelledby="seg-strip-heading">
        <h3 id="seg-strip-heading" className="seg-cal__strip-title">
          Upcoming strip (dashboard-compatible)
        </h3>
        <p className="seg-cal__strip-meta">
          Next items after filters — same <code>pickUpcomingStrip</code> helper Admin/CM/Candidate can
          reuse.
        </p>
        {strip.length === 0 ? (
          <p className="event-coordinator-desk__placeholder">No upcoming items in this filter set.</p>
        ) : (
          <ol className="seg-cal__strip-list">
            {strip.map((e) => (
              <li key={e.event_id}>
                <Link to={campaignEventRecordPath(e.event_id)}>{e.title}</Link>
                <span className="seg-cal__strip-when">{formatEventTime(e.start_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
