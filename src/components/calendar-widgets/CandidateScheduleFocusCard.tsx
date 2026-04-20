import { Link } from 'react-router-dom'
import type { CandidateFocusItem } from '../../lib/calendarWidgetData'

export default function CandidateScheduleFocusCard({
  items,
}: {
  items: CandidateFocusItem[]
}) {
  return (
    <section
      className="calendar-widget-card"
      aria-labelledby="cal-cand-focus-title"
    >
      <h3 id="cal-cand-focus-title" className="calendar-widget-card__title">
        Principal schedule focus
      </h3>
      {items.length === 0 ? (
        <p className="calendar-widget-muted">
          No candidate-flagged or upcoming public items in this snapshot.
        </p>
      ) : (
        <ul className="calendar-widget-focus-list">
          {items.map((it) => (
            <li key={it.event_id}>
              <Link to={`/events/${it.event_id}`} className="calendar-widget-focus-link">
                <span className="calendar-widget-focus-title">{it.title}</span>
                <span className="calendar-widget-focus-meta">
                  {it.kind.replace(/_/g, ' ')} ·{' '}
                  {new Date(it.start_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
