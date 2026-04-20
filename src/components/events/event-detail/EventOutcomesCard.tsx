import { useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  buildOutcomeCaptureLanes,
  isPastEvent,
  type OutcomeCaptureStatus,
} from '../../../lib/eventPostEventWorkflow'

type EventOutcomesCardProps = {
  record: CampaignCalendarEventRecord | null
}

function statusLabel(s: OutcomeCaptureStatus): string {
  switch (s) {
    case 'not_applicable':
      return 'N/A'
    case 'pending_capture':
      return 'Pending capture'
    case 'partial':
      return 'Partial'
    case 'captured':
      return 'Captured'
    default:
      return s
  }
}

function statusClass(s: OutcomeCaptureStatus): string {
  switch (s) {
    case 'captured':
      return 'event-outcome-lane__badge event-outcome-lane__badge--ok'
    case 'partial':
      return 'event-outcome-lane__badge event-outcome-lane__badge--partial'
    case 'pending_capture':
      return 'event-outcome-lane__badge event-outcome-lane__badge--pending'
    default:
      return 'event-outcome-lane__badge event-outcome-lane__badge--na'
  }
}

export default function EventOutcomesCard({ record }: EventOutcomesCardProps) {
  const [nowMs] = useState(() => Date.now())
  const lanes = useMemo(() => buildOutcomeCaptureLanes(record), [record])
  const executionPhase = record
    ? isPastEvent(record, nowMs)
      ? 'Post-event'
      : 'Pre-event / live'
    : '—'

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
        Structured capture lanes for reconciliation. Counts and RSVP rollups will load from{' '}
        <code>campaign_event_outcomes</code> when the API is wired — this view never shows placeholder
        numbers.
      </p>
      <p className="event-coordinator-desk__meta">
        Execution phase: <strong>{executionPhase}</strong>
        {record ? (
          <>
            {' '}
            · Stage <code>{record.stage_status}</code>
          </>
        ) : null}
      </p>
      {!record ? (
        <p className="event-coordinator-desk__placeholder">Save or load an event record to see lanes.</p>
      ) : (
        <ul className="event-outcome-lane__list">
          {lanes.map((lane) => (
            <li key={lane.id} className="event-outcome-lane__item">
              <div className="event-outcome-lane__head">
                <span className="event-outcome-lane__label">{lane.label}</span>
                <span className={statusClass(lane.status)}>{statusLabel(lane.status)}</span>
              </div>
              <p className="event-outcome-lane__detail">{lane.detail}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="event-coordinator-desk__meta">
        Mobilize / check-in integrations can auto-fill attendance and signups later; leadership widgets
        read the same summary hooks as this desk.
      </p>
    </section>
  )
}
