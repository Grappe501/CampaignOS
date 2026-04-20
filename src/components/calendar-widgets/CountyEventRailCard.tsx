import type { CountyRailRow } from '../../lib/calendarWidgetData'

export default function CountyEventRailCard({
  rows,
  windowDays = 14,
}: {
  rows: CountyRailRow[]
  windowDays?: number
}) {
  return (
    <section
      className="calendar-widget-card"
      aria-labelledby="cal-county-title"
    >
      <h3 id="cal-county-title" className="calendar-widget-card__title">
        County coverage ({windowDays}-day window)
      </h3>
      {rows.length === 0 ? (
        <p className="calendar-widget-muted">
          No county-scoped events in this window, or events lack county IDs.
        </p>
      ) : (
        <ul className="calendar-widget-county-list">
          {rows.map((r) => (
            <li key={r.county_id}>
              <span className="calendar-widget-county-label">{r.label}</span>
              <span className="calendar-widget-county-count">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
