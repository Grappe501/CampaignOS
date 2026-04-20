import { Link } from 'react-router-dom'
import { useCandidateEventSummary } from '../../../hooks/useEventSummaries'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import type { CalendarWidgetPersona, CandidateEventSummary } from '../../../lib/eventSummaryEngine'
import type { EventSummaryFilter } from '../../../lib/eventSummaryEngine'

type CandidateScheduleFocusCardProps = {
  persona: CalendarWidgetPersona
  filter?: EventSummaryFilter
  summaryOverride?: CandidateEventSummary
  className?: string
}

export default function CandidateScheduleFocusCard({
  persona,
  filter,
  summaryOverride,
  className = '',
}: CandidateScheduleFocusCardProps) {
  const hooked = useCandidateEventSummary(persona, filter)
  const s = summaryOverride ?? hooked

  return (
    <section
      className={`ec-widget-card event-coordinator-desk__section ${className}`.trim()}
      aria-labelledby="ec-candidate-focus-heading"
      id="candidate-schedule-focus-card"
    >
      <h3 id="ec-candidate-focus-heading" className="event-coordinator-desk__h2">
        Candidate schedule focus
      </h3>
      <p className="event-coordinator-desk__placeholder">
        Travel, public touches, and briefing readiness — reusable on Candidate desk; here it respects
        your persona scope and filters.
      </p>
      <dl className="ec-widget-card__stats ec-widget-card__stats--compact">
        <div>
          <dt>Briefing gaps</dt>
          <dd>{s.briefingNeededCount}</dd>
        </div>
        <div>
          <dt>Public / volunteer surface</dt>
          <dd>{s.upcomingPublicCount}</dd>
        </div>
        <div>
          <dt>Private / finance</dt>
          <dd>{s.upcomingPrivateCount}</dd>
        </div>
        <div>
          <dt>Fundraising touches</dt>
          <dd>{s.upcomingFundraisingCount}</dd>
        </div>
        <div>
          <dt>High-priority candidate items</dt>
          <dd>{s.highPriorityCandidateCount}</dd>
        </div>
      </dl>
      {s.nextItems.length === 0 ? (
        <p className="event-coordinator-desk__placeholder" role="status">
          No candidate-weighted items in this snapshot.
        </p>
      ) : (
        <ol className="ec-widget-card__focus-list">
          {s.nextItems.map((row) => (
            <li key={row.eventId}>
              <Link to={campaignEventRecordPath(row.eventId)}>{row.title}</Link>
              <span className="ec-widget-card__focus-when">
                {new Date(row.startAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
