import { Link } from 'react-router-dom'
import type { FollowupSlice } from '../../lib/calendarWidgetData'

export default function PostEventFollowupCard({ followup }: { followup: FollowupSlice }) {
  return (
    <section
      className="calendar-widget-card calendar-widget-card--followup"
      aria-labelledby="cal-followup-title"
    >
      <h3 id="cal-followup-title" className="calendar-widget-card__title">
        Post-event follow-up
      </h3>
      <p className="calendar-widget-lede">
        <strong>{followup.count}</strong> ended event{followup.count === 1 ? '' : 's'} without a
        follow-up state in this read.
      </p>
      {followup.samples.length === 0 ? (
        <p className="calendar-widget-muted">Nothing to reconcile in this fixture set.</p>
      ) : (
        <ul className="calendar-widget-followup-list">
          {followup.samples.map((s) => (
            <li key={s.event_id}>
              <Link to={`/events/${s.event_id}`}>{s.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
