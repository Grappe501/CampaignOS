import { useMemo } from 'react'
import { useEventCalendarSummary } from '../../../hooks/useEventSummaries'
import type { CalendarWidgetPersona, EventCalendarSummary } from '../../../lib/eventSummaryEngine'
import type { EventSummaryFilter } from '../../../lib/eventSummaryEngine'

type CalendarSnapshotCardProps = {
  persona: CalendarWidgetPersona
  windowDays: 7 | 14 | 30
  filter?: EventSummaryFilter
  summaryOverride?: EventCalendarSummary
  className?: string
}

export default function CalendarSnapshotCard({
  persona,
  windowDays,
  filter,
  summaryOverride,
  className = '',
}: CalendarSnapshotCardProps) {
  const hooked = useEventCalendarSummary(persona, windowDays, filter)
  const summary = summaryOverride ?? hooked

  const denseDays = useMemo(
    () => summary.days.filter((d) => d.count > 0).slice(0, 6),
    [summary.days],
  )

  return (
    <section
      className={`ec-widget-card event-coordinator-desk__section ${className}`.trim()}
      aria-labelledby="ec-snapshot-heading"
      id="calendar-snapshot-card"
    >
      <h3 id="ec-snapshot-heading" className="event-coordinator-desk__h2">
        Calendar snapshot ({summary.windowDays} days)
      </h3>
      <p className="event-coordinator-desk__meta">
        From <strong>{new Date(summary.fromMs).toLocaleDateString()}</strong> through{' '}
        <strong>{new Date(summary.toMs).toLocaleDateString()}</strong> (start times in view).
      </p>
      {denseDays.length === 0 ? (
        <p className="event-coordinator-desk__placeholder" role="status">
          No starts in this window for the current filter set.
        </p>
      ) : (
        <ul className="ec-widget-card__snapshot-days">
          {denseDays.map((d) => (
            <li key={d.dayKey}>
              <span className="ec-widget-card__snapshot-label">{d.label}</span>
              <span className="ec-widget-card__snapshot-count">{d.count} events</span>
              <span className="ec-widget-card__snapshot-meta">
                {d.candidateInvolvedCount > 0
                  ? `${d.candidateInvolvedCount} candidate · `
                  : ''}
                {d.publicSurfaceCount > 0 ? `${d.publicSurfaceCount} public surface · ` : ''}
                {d.fundraisingTouchCount > 0 ? `${d.fundraisingTouchCount} fundraising` : ''}
              </span>
              {d.titles.length > 0 ? (
                <ul className="ec-widget-card__snapshot-titles">
                  {d.titles.slice(0, 3).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
