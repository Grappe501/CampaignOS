import { useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'
import {
  buildFollowupBucketChecklist,
  CANONICAL_FOLLOWUP_STATES,
  isFollowUpCloseReady,
  isFollowupOverdue,
  isPastEvent,
  normalizeFollowupPhase,
  type FollowupBucketStatus,
} from '../../../lib/eventPostEventWorkflow'

type EventFollowupCardProps = {
  record: CampaignCalendarEventRecord | null
  followGaps: CoordinatorOperationsGap[]
}

function bucketBadgeClass(s: FollowupBucketStatus): string {
  switch (s) {
    case 'done':
      return 'event-followup-bucket__status event-followup-bucket__status--done'
    case 'in_progress':
      return 'event-followup-bucket__status event-followup-bucket__status--progress'
    case 'open':
      return 'event-followup-bucket__status event-followup-bucket__status--open'
    case 'blocked':
      return 'event-followup-bucket__status event-followup-bucket__status--blocked'
    default:
      return 'event-followup-bucket__status event-followup-bucket__status--na'
  }
}

export default function EventFollowupCard({ record, followGaps }: EventFollowupCardProps) {
  const [nowMs] = useState(() => Date.now())
  const checklist = useMemo(
    () => (record ? buildFollowupBucketChecklist(record, nowMs) : []),
    [record, nowMs],
  )

  const phase = record ? normalizeFollowupPhase(record.followup_state) : null
  const overdue = record ? isFollowupOverdue(record, nowMs) : false
  const closeReady = record ? isFollowUpCloseReady(record, nowMs) : false
  const ended = record ? isPastEvent(record, nowMs) : false

  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-followup"
      aria-labelledby="event-followup-heading"
    >
      <h2 id="event-followup-heading" className="event-coordinator-desk__h2">
        Follow-up workflow
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Reconcile attendance, leads, donor/volunteer queues, media handoff, and debrief. Follow-up phase
        is tracked on the event row; buckets below are derived for coordinators (extensible for
        finance / field programs).
      </p>

      {record && ended ? (
        <div
          className={
            closeReady
              ? 'event-followup__banner event-followup__banner--ok'
              : overdue
                ? 'event-followup__banner event-followup__banner--overdue'
                : 'event-followup__banner event-followup__banner--active'
          }
          role="status"
        >
          {closeReady ? (
            <strong>Close-ready:</strong>
          ) : overdue ? (
            <strong>Follow-up overdue:</strong>
          ) : (
            <strong>Follow-up active:</strong>
          )}{' '}
          {closeReady
            ? 'Row follow-up phase is complete after event end.'
            : overdue
              ? 'Past the 72h grace window or row marked overdue — prioritize reconciliation.'
              : 'Event has ended; advance follow-up buckets and update follow-up state when work is done.'}
        </div>
      ) : null}

      <dl className="event-record-desk__dl">
        <div>
          <dt>Follow-up state (row)</dt>
          <dd>{record?.followup_state?.trim() ? record.followup_state : '—'}</dd>
        </div>
        <div>
          <dt>Normalized phase</dt>
          <dd>{phase ?? '—'}</dd>
        </div>
      </dl>

      <h3 className="event-detail-card__h3">Workstream buckets</h3>
      {!record ? (
        <p className="event-coordinator-desk__placeholder">Load an event to see bucket checklist.</p>
      ) : (
        <ul className="event-followup-bucket__list">
          {checklist.map((b) => (
            <li
              key={b.id}
              className={
                b.applies ? 'event-followup-bucket__item' : 'event-followup-bucket__item is-muted'
              }
            >
              <div className="event-followup-bucket__row">
                <span className="event-followup-bucket__label">{b.label}</span>
                <span className={bucketBadgeClass(b.status)}>{b.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="event-followup-bucket__desc">{b.description}</p>
              {b.hint ? <p className="event-followup-bucket__hint">{b.hint}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <h3 className="event-detail-card__h3">Canonical states (DB)</h3>
      <p className="event-coordinator-desk__meta">
        {CANONICAL_FOLLOWUP_STATES.join(' · ')}
      </p>

      {followGaps.length > 0 ? (
        <ul className="event-record-desk__gap-list">
          {followGaps.map((g) => (
            <li key={g.message}>
              <span className="event-record-desk__gap-sev">{g.category}</span> {g.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No follow-up gaps flagged on the row.</p>
      )}
    </section>
  )
}
