import type { EventPressureSummary } from '../../lib/calendarWidgetData'

export default function EventPressureSummaryCard({
  pressure,
  title = 'Event pressure summary',
}: {
  pressure: EventPressureSummary
  title?: string
}) {
  return (
    <section
      className="calendar-widget-card calendar-widget-card--pressure"
      aria-labelledby="cal-pressure-title"
    >
      <h3 id="cal-pressure-title" className="calendar-widget-card__title">
        {title}
      </h3>
      <div className="calendar-widget-stat-grid">
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{pressure.approvalBacklog}</span>
          <span className="calendar-widget-stat__label">Approval / intake backlog</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{pressure.staffingGaps}</span>
          <span className="calendar-widget-stat__label">Staffing gaps &amp; at-risk</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{pressure.logisticsGaps}</span>
          <span className="calendar-widget-stat__label">Logistics / venue gaps</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{pressure.mobilizeQueue}</span>
          <span className="calendar-widget-stat__label">Mobilize queue / errors</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{pressure.followupDebt}</span>
          <span className="calendar-widget-stat__label">Post-event follow-up debt</span>
        </div>
        <div className="calendar-widget-stat calendar-widget-stat--wide">
          <span className="calendar-widget-stat__value">{pressure.highPriorityRisk}</span>
          <span className="calendar-widget-stat__label">High-priority risk flags</span>
        </div>
      </div>
      <ul className="calendar-widget-bullets">
        {pressure.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </section>
  )
}
