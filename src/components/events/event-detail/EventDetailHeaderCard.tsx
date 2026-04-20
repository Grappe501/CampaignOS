import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'

type EventDetailHeaderCardProps = {
  eventId: string
  isNew: boolean
  isUuid: boolean
  title: string
  record: CampaignCalendarEventRecord | null
  typeLabel: string | null
}

export default function EventDetailHeaderCard({
  eventId,
  isNew,
  isUuid,
  title,
  record,
  typeLabel,
}: EventDetailHeaderCardProps) {
  const virtualOrVenue = record?.address_or_virtual?.trim()
    ? 'Virtual / hybrid (address on file)'
    : record?.venue_name
      ? record.venue_name
      : '—'

  return (
    <header className="event-detail-header event-coordinator-desk__command" id="event-record-command">
      <p className="event-coordinator-desk__eyebrow">Event command</p>
      <h1 className="event-coordinator-desk__title">{title}</h1>

      <dl className="event-detail-header__meta">
        <div>
          <dt>Type</dt>
          <dd>{typeLabel ?? <code>{record?.event_type ?? '—'}</code>}</dd>
        </div>
        {record?.event_subtype ? (
          <div>
            <dt>Subtype</dt>
            <dd>{record.event_subtype}</dd>
          </div>
        ) : null}
        <div>
          <dt>Schedule</dt>
          <dd>
            {record
              ? `${new Date(record.start_at).toLocaleString()} — ${new Date(record.end_at).toLocaleString()} (${record.timezone})`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Venue / virtual</dt>
          <dd>{virtualOrVenue}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd>{record?.stage_status ?? '—'}</dd>
        </div>
        <div>
          <dt>Staffing</dt>
          <dd>{record?.staffing_state ?? '—'}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>{record?.visibility_scope ?? '—'}</dd>
        </div>
        <div>
          <dt>Mobilize</dt>
          <dd>{record?.mobilize_publish_state ?? '—'}</dd>
        </div>
      </dl>

      <p className="event-record-desk__id-line">
        <span className="event-record-desk__id-k">Record id</span>{' '}
        <code className="event-record-desk__id-v">{eventId}</code>
        {isUuid ? (
          <span className="event-record-desk__id-note"> — UUID</span>
        ) : isNew ? (
          <span className="event-record-desk__id-note"> — new scaffold</span>
        ) : null}
      </p>

      <div className="event-coordinator-desk__quick-actions" aria-label="Quick actions">
        <button type="button" className="btn-touch" disabled title="Coming soon">
          Edit basics
        </button>
        <button type="button" className="btn-touch" disabled title="Coming soon">
          Change status
        </button>
        <button type="button" className="btn-touch" disabled title="Coming soon">
          Assign owner
        </button>
        <Link to="/events/calendar" className="btn-touch">
          Open calendar
        </Link>
        <button type="button" className="btn-touch" disabled title="Server publish not wired">
          Publish / promote
        </button>
        <button type="button" className="btn-touch" disabled title="Coming soon">
          Mark complete
        </button>
        <Link to="/events" className="btn-touch">
          Event desk
        </Link>
      </div>
    </header>
  )
}
