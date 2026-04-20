import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'

type EventOutcomesCardProps = {
  record: CampaignCalendarEventRecord | null
}

export default function EventOutcomesCard({ record }: EventOutcomesCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-outcomes"
      aria-labelledby="event-outcomes-heading"
    >
      <h2 id="event-outcomes-heading" className="event-coordinator-desk__h2">
        Attendance &amp; outcomes
      </h2>
      <p className="event-coordinator-desk__placeholder">
        RSVP summaries, headcount, leads captured, volunteer signups, donor outcomes, and debrief —
        will bind to post-event tables. No placeholder numbers.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>RSVP summary</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Attendance captured</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Leads / supporters</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Volunteer signups</dt>
          <dd>—</dd>
        </div>
        <div>
          <dt>Donor outcome</dt>
          <dd>{record?.finance_flag ? '— (finance-touch event)' : '—'}</dd>
        </div>
        <div>
          <dt>Field notes / debrief</dt>
          <dd>—</dd>
        </div>
      </dl>
    </section>
  )
}
