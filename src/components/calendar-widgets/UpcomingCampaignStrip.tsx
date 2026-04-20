import { Link } from 'react-router-dom'
import type { UpcomingStripItem } from '../../lib/calendarWidgetData'

export default function UpcomingCampaignStrip({
  items,
  heading = 'Upcoming on the campaign calendar',
}: {
  items: UpcomingStripItem[]
  heading?: string
}) {
  if (items.length === 0) {
    return (
      <div className="calendar-widget-strip calendar-widget-strip--empty">
        <h3 className="calendar-widget-strip__title">{heading}</h3>
        <p className="calendar-widget-muted">
          No upcoming events in this permission-scoped view. Open the event desk when your role
          allows.
        </p>
        <p className="calendar-widget-muted">
          <Link to="/events">Event coordinator desk</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="calendar-widget-strip">
      <div className="calendar-widget-strip__head">
        <h3 className="calendar-widget-strip__title">{heading}</h3>
        <Link to="/events/calendar" className="calendar-widget-strip__link">
          Full calendar
        </Link>
      </div>
      <ul className="calendar-widget-strip__list" role="list">
        {items.map((it) => (
          <li key={it.event_id}>
            <Link
              to={`/events/${it.event_id}`}
              className={`calendar-widget-strip__chip calendar-widget-strip__chip--${it.urgency}`}
            >
              <span className="calendar-widget-strip__date">{it.shortDate}</span>
              <span className="calendar-widget-strip__label">{it.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
