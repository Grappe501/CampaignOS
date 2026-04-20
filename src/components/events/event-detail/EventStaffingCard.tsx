import { useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { CALENDAR_STAFFING_STATUSES } from '../../../lib/campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import {
  deriveStaffingStateFromMatrix,
  evaluateStaffingMatrix,
  getStaffingMatrixForEventType,
  type StaffingAssignmentLike,
} from '../../../lib/eventStaffingMatrix'

type EventStaffingCardProps = {
  record: CampaignCalendarEventRecord | null
  effectiveType: CampaignEventTypeKey
  staffingAssignments: readonly StaffingAssignmentLike[]
  staffingOnlyGaps: CoordinatorOperationsGap[]
}

export default function EventStaffingCard({
  record,
  effectiveType,
  staffingAssignments,
  staffingOnlyGaps,
}: EventStaffingCardProps) {
  const [nowMs] = useState(() => Date.now())
  const startMs = record ? new Date(record.start_at).getTime() : nowMs

  const matrixRows = useMemo(
    () => evaluateStaffingMatrix(effectiveType, staffingAssignments),
    [effectiveType, staffingAssignments],
  )

  const derivedState = useMemo(
    () => deriveStaffingStateFromMatrix(effectiveType, staffingAssignments, nowMs, startMs),
    [effectiveType, staffingAssignments, nowMs, startMs],
  )

  const templateCount = getStaffingMatrixForEventType(effectiveType).length

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
        Role templates by event type (blueprint 18). Assignments support named users, display
        placeholders, and optional shift windows — persisted in{' '}
        <code>campaign_event_staffing_assignments</code> when wired.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>Staffing state (row)</dt>
          <dd>{record?.staffing_state ?? '—'}</dd>
        </div>
        <div>
          <dt>Matrix-derived state</dt>
          <dd>
            {record ? (
              <>
                <strong>{derivedState}</strong>
                {record.staffing_state !== derivedState ? (
                  <span className="event-staffing__hint">
                    {' '}
                    (differs from row — reconcile when Supabase syncs)
                  </span>
                ) : null}
              </>
            ) : (
              '—'
            )}
          </dd>
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

      <h3 className="event-staffing__subhead">Role matrix ({effectiveType.replace(/_/g, ' ')})</h3>
      <p className="event-coordinator-desk__meta">
        {templateCount} template roles · {staffingAssignments.length} assignment row
        {staffingAssignments.length === 1 ? '' : 's'} (dev fixtures when present).
      </p>
      <div className="event-staffing__table-wrap">
        <table className="event-staffing__table">
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Required</th>
              <th scope="col">Min filled</th>
              <th scope="col">Filled</th>
              <th scope="col">Shifts</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((row) => (
              <tr key={row.template.slug}>
                <td>
                  <span className="event-staffing__role">{row.label}</span>
                  <code className="event-staffing__slug">{row.template.slug}</code>
                </td>
                <td>{row.template.required ? 'Yes' : '—'}</td>
                <td>{row.template.minFilled}</td>
                <td>{row.filled}</td>
                <td>{row.template.supportsShifts ? 'Yes' : '—'}</td>
                <td>
                  {row.satisfied ? (
                    <span className="event-staffing__ok">OK</span>
                  ) : (
                    <span className="event-staffing__gap">
                      Need {row.deficit}
                      {row.openInvited > 0 ? ` · ${row.openInvited} open invite` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {staffingAssignments.length > 0 ? (
        <>
          <h3 className="event-staffing__subhead">Assignment rows</h3>
          <ul className="event-staffing__assignments">
            {staffingAssignments.map((a, i) => (
              <li key={`${a.staff_role_slug}-${i}`}>
                <strong>{a.staff_role_slug.replace(/_/g, ' ')}</strong> — {a.status}
                {a.assigned_user_id ? (
                  <>
                    {' '}
                    · user <code>{a.assigned_user_id}</code>
                  </>
                ) : null}
                {a.assigned_display_name ? <> · {a.assigned_display_name}</> : null}
                {a.shift_label ? <> · shift: {a.shift_label}</> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="event-coordinator-desk__placeholder">No staffing assignment rows (yet).</p>
      )}

      <p className="event-coordinator-desk__meta">
        Coverage states: {CALENDAR_STAFFING_STATUSES.join(' · ')}
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
      <p className="event-coordinator-desk__meta">
        <a href="#rapid-actions-command">Rapid staffing actions</a> — assign, reassign, confirm coverage, and
        marketplace publish — are available in the command action strip above this section.
      </p>
    </section>
  )
}
