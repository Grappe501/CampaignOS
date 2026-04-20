import { Link } from 'react-router-dom'
import type { MobilizeQueueSlice } from '../../lib/calendarWidgetData'

export default function MobilizeQueueCard({ mobilize }: { mobilize: MobilizeQueueSlice }) {
  const active = mobilize.eligible + mobilize.queued + mobilize.syncError
  return (
    <section
      className="calendar-widget-card calendar-widget-card--mobilize"
      aria-labelledby="cal-mobilize-title"
    >
      <h3 id="cal-mobilize-title" className="calendar-widget-card__title">
        Mobilize publish queue
      </h3>
      <div className="calendar-widget-stat-grid calendar-widget-stat-grid--tight">
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{mobilize.eligible}</span>
          <span className="calendar-widget-stat__label">Eligible</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{mobilize.queued}</span>
          <span className="calendar-widget-stat__label">Queued</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{mobilize.syncError}</span>
          <span className="calendar-widget-stat__label">Sync errors</span>
        </div>
        <div className="calendar-widget-stat">
          <span className="calendar-widget-stat__value">{mobilize.published}</span>
          <span className="calendar-widget-stat__label">Published</span>
        </div>
      </div>
      {active === 0 ? (
        <p className="calendar-widget-muted">No rows waiting on Mobilize in this view.</p>
      ) : (
        <ul className="calendar-widget-mobilize-samples">
          {mobilize.samples.map((s) => (
            <li key={s.event_id}>
              <Link to={`/events/${s.event_id}`}>
                <span className="calendar-widget-mobilize-state">{s.state}</span>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
