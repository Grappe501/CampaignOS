import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  computeEventOutcomeHealth,
  eventOutcomeRouteHints,
  outcomeStageLabel,
  type EventOutcomeStage,
} from '../../../lib/eventOutcomeDomain'
import { useEventOutcomeSnapshot } from '../../../hooks/useEventOutcomeSnapshot'
import {
  buildOutcomeCaptureLanesWithDb,
  type OutcomeCaptureStatus,
} from '../../../lib/eventOutcomeSelectors'
import { isPastEvent } from '../../../lib/eventPostEventWorkflow'

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
  const eventId = record?.event_id
  const { snapshot, loading, error } = useEventOutcomeSnapshot(eventId)

  const lanes = useMemo(
    () => (record ? buildOutcomeCaptureLanesWithDb(record, snapshot, nowMs) : []),
    [record, snapshot, nowMs],
  )

  const health = useMemo(() => {
    if (!record) return null
    const fu = snapshot?.followups ?? []
    const fuOpen = fu.filter((f) => f.status === 'pending' || f.status === 'in_progress').length
    return computeEventOutcomeHealth({
      recordExpectedAudience: record.expected_audience_size ?? null,
      attendanceCheckins: snapshot?.attendanceCheckinCount ?? 0,
      outcomeRow: snapshot?.outcomeRow ?? null,
      followupsTotal: fu.length,
      followupsOpen: fuOpen,
      learningCaptureFilled: snapshot?.learningCaptureFilled ?? false,
      eventEnded: isPastEvent(record, nowMs),
    })
  }, [record, snapshot, nowMs])

  const executionPhase = record
    ? isPastEvent(record, nowMs)
      ? 'Post-event'
      : 'Pre-event / live'
    : '—'

  const routes = eventId ? eventOutcomeRouteHints(eventId) : null
  const stage: EventOutcomeStage | null = snapshot?.outcomeRow?.outcome_stage ?? null

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
        Capture lanes reconcile RSVP, check-ins, outcomes row, follow-ups, and learning. Counts load from
        Supabase — no placeholder numbers.
      </p>
      <p className="event-coordinator-desk__meta">
        Execution phase: <strong>{executionPhase}</strong>
        {record ? (
          <>
            {' '}
            · Stage <code>{record.stage_status}</code>
          </>
        ) : null}
        {stage ? (
          <>
            {' '}
            · Outcome stage <strong>{outcomeStageLabel(stage)}</strong>
          </>
        ) : null}
        {health ? (
          <>
            {' '}
            · Closure quality ~<strong>{health.completeness_0_100}%</strong>
            {health.flags.length ? ` (${health.flags.length} flag${health.flags.length > 1 ? 's' : ''})` : ''}
          </>
        ) : null}
      </p>
      {routes ? (
        <p className="event-coordinator-desk__meta">
          <Link to={routes.checkIn} className="btn-touch btn-touch--ghost" style={{ marginRight: 8 }}>
            Open check-in
          </Link>
          <Link to={routes.analytics} className="btn-touch btn-touch--ghost">
            Program analytics
          </Link>
        </p>
      ) : null}
      {loading ? <p className="event-coordinator-desk__meta">Loading outcome snapshot…</p> : null}
      {error ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          {error}
        </p>
      ) : null}
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
      {snapshot?.attendanceCheckinCount != null && snapshot.attendanceCheckinCount > 0 ? (
        <p className="event-coordinator-desk__meta">
          Check-ins on file: <strong>{snapshot.attendanceCheckinCount}</strong>
          {snapshot.outcomeRow?.attendance_count != null &&
          snapshot.outcomeRow.attendance_count !== snapshot.attendanceCheckinCount ? (
            <> · Outcomes row attendance: {snapshot.outcomeRow.attendance_count}</>
          ) : null}
        </p>
      ) : null}
    </section>
  )
}
