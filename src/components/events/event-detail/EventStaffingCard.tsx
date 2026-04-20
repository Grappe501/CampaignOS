import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { CALENDAR_STAFFING_STATUSES } from '../../../lib/campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'

type EventStaffingCardProps = {
  record: CampaignCalendarEventRecord | null
  staffingOnlyGaps: CoordinatorOperationsGap[]
}

export default function EventStaffingCard({ record, staffingOnlyGaps }: EventStaffingCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-staffing"
      aria-labelledby="event-staffing-heading"
    >
      <h2 id="event-staffing-heading" className="event-coordinator-desk__h2">
        Staffing
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Host, lead, candidate/surrogate support, and volunteer assignments will list here from the
        staffing model.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>Staffing state</dt>
          <dd>{record?.staffing_state ?? '—'}</dd>
        </div>
        <div>
          <dt>Event lead (owner)</dt>
          <dd>
            {record?.owner_user_id ?? '—'}
            {record?.owner_role ? (
              <>
                {' '}
                (<code>{record.owner_role}</code>)
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Hosts (`host_user_ids`)</dt>
          <dd>
            {record && record.host_user_ids.length > 0
              ? record.host_user_ids.join(', ')
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Candidate on row</dt>
          <dd>{record ? (record.candidate_flag ? 'Flagged' : 'Not flagged') : '—'}</dd>
        </div>
      </dl>
      <p className="event-coordinator-desk__meta">
        Reference: {CALENDAR_STAFFING_STATUSES.join(' · ')}
      </p>
      {staffingOnlyGaps.length > 0 ? (
        <ul className="event-record-desk__gap-list">
          {staffingOnlyGaps.map((g) => (
            <li key={g.message}>
              <span className="event-record-desk__gap-sev">{g.severity}</span> {g.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No staffing gaps flagged.</p>
      )}
    </section>
  )
}
