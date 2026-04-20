import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'

type EventFollowupCardProps = {
  record: CampaignCalendarEventRecord | null
  followGaps: CoordinatorOperationsGap[]
}

export default function EventFollowupCard({ record, followGaps }: EventFollowupCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-followup"
      aria-labelledby="event-followup-heading"
    >
      <h2 id="event-followup-heading" className="event-coordinator-desk__h2">
        Follow-up queue
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Donor, volunteer, and attendee follow-up; media/comms handoff; thank-yous — tracked via{' '}
        <code>followup_state</code> and task queues.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>Follow-up state</dt>
          <dd>{record?.followup_state ?? '—'}</dd>
        </div>
      </dl>
      <h3 className="event-detail-card__h3">Operational buckets (reference)</h3>
      <ul className="event-record-desk__path-list">
        <li>Donor follow-up</li>
        <li>Volunteer follow-up</li>
        <li>Attendee / supporter follow-up</li>
        <li>Media &amp; comms handoff</li>
        <li>Notes &amp; thank-yous</li>
        <li>Open tasks after completion</li>
      </ul>
      {followGaps.length > 0 ? (
        <ul className="event-record-desk__gap-list">
          {followGaps.map((g) => (
            <li key={g.message}>
              <span className="event-record-desk__gap-sev">{g.category}</span> {g.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No follow-up gaps flagged.</p>
      )}
    </section>
  )
}
