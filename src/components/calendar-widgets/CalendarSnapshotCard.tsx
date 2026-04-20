import type { CalendarSnapshotDay } from '../../lib/calendarWidgetData'

export default function CalendarSnapshotCard({
  days,
  title = 'Next seven days (snapshot)',
}: {
  days: CalendarSnapshotDay[]
  title?: string
}) {
  return (
    <section
      className="calendar-widget-card"
      aria-labelledby="cal-snapshot-title"
    >
      <h3 id="cal-snapshot-title" className="calendar-widget-card__title">
        {title}
      </h3>
      {days.length === 0 ? (
        <p className="calendar-widget-muted">No events in this window for your view.</p>
      ) : (
        <ul className="calendar-widget-snapshot-list">
          {days.map((d) => (
            <li key={d.dayKey}>
              <div className="calendar-widget-snapshot-day">
                <strong>{d.label}</strong>
                <span className="calendar-widget-snapshot-count">{d.count} event{d.count === 1 ? '' : 's'}</span>
              </div>
              {d.titles.length > 0 ? (
                <ul className="calendar-widget-snapshot-titles">
                  {d.titles.map((t) => (
                    <li key={`${d.dayKey}-${t}`}>{t}</li>
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
