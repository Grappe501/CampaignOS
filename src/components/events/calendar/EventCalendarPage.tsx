import { useEffect, useMemo, useState } from 'react'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import type { CampaignCalendarViewMode } from '../../../lib/campaignCalendarSegmentEngine'
import {
  applyCalendarPageFilters,
  DEFAULT_EVENT_CALENDAR_UI,
  eventSummaryFilterFromUi,
  type EventCalendarUiState,
} from '../../../lib/eventCalendarPageFilters'
import type { CalendarWidgetPersona } from '../../../lib/eventSummaryEngine'
import {
  buildCandidateEventSummary,
  buildEventCalendarSummary,
  buildEventPressureBullets,
  buildUpcomingCampaignItems,
  summarizeEventPressure,
} from '../../../lib/eventSummaryEngine'
import CalendarSnapshotCard from '../widgets/CalendarSnapshotCard'
import CandidateScheduleFocusCard from '../widgets/CandidateScheduleFocusCard'
import EventPressureSummaryCard from '../widgets/EventPressureSummaryCard'
import UpcomingCampaignStrip from '../widgets/UpcomingCampaignStrip'
import EventAgendaList from './EventAgendaList'
import EventCalendarFilters from './EventCalendarFilters'
import EventCalendarHeader from './EventCalendarHeader'
import EventCalendarMonthGrid, { type MonthCursor } from './EventCalendarMonthGrid'

type EventCalendarPageProps = {
  persona: CalendarWidgetPersona
}

export default function EventCalendarPage({ persona }: EventCalendarPageProps) {
  const [ui, setUi] = useState<EventCalendarUiState>(DEFAULT_EVENT_CALENDAR_UI)
  const [viewMode, setViewMode] = useState<CampaignCalendarViewMode>('agenda')
  const [monthCursor, setMonthCursor] = useState<MonthCursor>({ year: 2026, monthIndex: 3 })
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const { events: source, loading: eventsLoading, error: eventsError } = useCampaignEventsContext()

  const filtered = useMemo(
    () => applyCalendarPageFilters(source, persona, ui, nowMs),
    [source, persona, ui, nowMs],
  )

  const summaryFilter = useMemo(() => eventSummaryFilterFromUi(ui, nowMs), [ui, nowMs])

  const stripItems = useMemo(
    () => buildUpcomingCampaignItems(filtered, 7, nowMs),
    [filtered, nowMs],
  )

  const pressureCounts = useMemo(() => summarizeEventPressure(filtered, nowMs), [filtered, nowMs])
  const pressureBullets = useMemo(() => buildEventPressureBullets(pressureCounts), [pressureCounts])

  const snapshot = useMemo(
    () => buildEventCalendarSummary(filtered, nowMs, 14),
    [filtered, nowMs],
  )

  const candidateSummary = useMemo(
    () => buildCandidateEventSummary(filtered, nowMs),
    [filtered, nowMs],
  )

  const isEmptySource = source.length === 0

  return (
    <div className="event-coordinator-desk ec-cal-page" id="event-calendar-page">
      <EventCalendarHeader persona={persona} />

      {eventsError ? (
        <p className="seg-cal__banner" role="alert">
          Could not load events: {eventsError.message}
        </p>
      ) : null}

      {eventsLoading ? (
        <p className="seg-cal__banner" role="status" aria-live="polite">
          Loading campaign events…
        </p>
      ) : null}

      {isEmptySource && !eventsLoading && !eventsError ? (
        <div className="ec-cal-page__empty-source" role="status">
          <h2 className="ec-cal-page__empty-title">No events scheduled yet</h2>
          <p className="event-coordinator-desk__placeholder">
            Create events from the coordinator desk or neighborhood hub. This calendar reads the same
            Supabase-backed list as dashboards.
          </p>
        </div>
      ) : null}

      <div className="ec-cal-page__layout">
        <div className="ec-cal-page__main">
          <EventCalendarFilters value={ui} onChange={setUi} sourceEvents={source} />

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
                    setMonthCursor((c) =>
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
                  {new Date(monthCursor.year, monthCursor.monthIndex, 1).toLocaleString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <button
                  type="button"
                  className="seg-cal__nav-btn"
                  onClick={() =>
                    setMonthCursor((c) =>
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

          <p className="seg-cal__meta" role="status">
            Showing <strong>{filtered.length}</strong> of <strong>{source.length}</strong> events after
            persona scope and filters (single engine).
          </p>

          <section className="event-coordinator-desk__section event-coordinator-desk__section--flush">
            <h2 className="event-coordinator-desk__h2" id="event-calendar-main-heading">
              {viewMode === 'agenda' ? 'Agenda' : 'Month view'}
            </h2>
            {!isEmptySource && filtered.length === 0 ? (
              <p className="event-coordinator-desk__placeholder" role="status">
                No events match the current filters. Reset the panel or widen the date range.
              </p>
            ) : null}
            {viewMode === 'agenda' ? (
              <EventAgendaList events={filtered} />
            ) : (
              <EventCalendarMonthGrid events={filtered} cursor={monthCursor} />
            )}
          </section>
        </div>

        <aside className="ec-cal-page__rail" aria-label="Upcoming and leadership widgets">
          <UpcomingCampaignStrip
            variant="items"
            items={stripItems}
            title="Upcoming (filtered)"
            subtitle="Near-term rail — same contract as dashboard strips."
          />
          <EventPressureSummaryCard
            persona={persona}
            filter={summaryFilter}
            countsOverride={pressureCounts}
            bulletsOverride={pressureBullets}
          />
          <CalendarSnapshotCard
            persona={persona}
            filter={summaryFilter}
            windowDays={14}
            summaryOverride={snapshot}
          />
          <CandidateScheduleFocusCard
            persona={persona}
            filter={summaryFilter}
            summaryOverride={candidateSummary}
          />
        </aside>
      </div>
    </div>
  )
}
