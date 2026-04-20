import { Link } from 'react-router-dom'
import { usePostEventAttentionQueue } from '../../hooks/useEventSummaries'
import type { CalendarWidgetPersona } from '../../lib/eventSummaryEngine'
import { campaignEventRecordPath } from '../../lib/campaignEventSystem'

type PostEventAttentionQueueSectionProps = {
  persona: CalendarWidgetPersona
}

export default function PostEventAttentionQueueSection({ persona }: PostEventAttentionQueueSectionProps) {
  const rows = usePostEventAttentionQueue(persona, { limit: 12 })

  return (
    <section
      className="event-coordinator-desk__section"
      aria-labelledby="ec-postevent-queue-heading"
      id="event-coordinator-postevent-queue"
    >
      <h2 id="ec-postevent-queue-heading" className="event-coordinator-desk__h2">
        Post-event follow-up queue
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Ended events that are not in <code>complete</code> follow-up, plus finance donor checks. Same
        rules as the event detail follow-up card — no fabricated outcomes; rows come from the shared
        event source.
      </p>
      {rows.length === 0 ? (
        <p className="event-coordinator-desk__meta" role="status">
          No post-event attention items in the current queue for this persona.
        </p>
      ) : (
        <ul className="event-postevent-queue__list">
          {rows.map((r) => (
            <li
              key={r.eventId}
              className={
                r.severity === 'critical'
                  ? 'event-postevent-queue__item event-postevent-queue__item--crit'
                  : 'event-postevent-queue__item'
              }
            >
              <div className="event-postevent-queue__title-row">
                <Link to={campaignEventRecordPath(r.eventId)} className="event-postevent-queue__link">
                  {r.title}
                </Link>
                <span className="event-postevent-queue__ended">Ended {r.endAtLabel}</span>
              </div>
              <ul className="event-postevent-queue__reasons">
                {r.reasons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
