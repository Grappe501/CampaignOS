import type { PipelineRow } from '../../hooks/useInternLayer'
import {
  formatPipelineStatusLabel,
  formatVolunteerRef,
  isFirstContactOverdue,
} from './internDeskFormat'

export default function InternDeskAttentionSummary({
  internLoading,
  tasksLoading,
  internError,
  tasksError,
  overdueCount,
  pipelines,
  activeTaskCount,
  nowMs,
  showRouteHint,
}: {
  internLoading: boolean
  tasksLoading: boolean
  internError: string | null
  tasksError: string | null
  overdueCount: number
  pipelines: PipelineRow[]
  activeTaskCount: number
  nowMs: number
  showRouteHint: boolean
}) {
  const loading = internLoading || tasksLoading
  const blocking =
    (internError && internError.trim()) || (tasksError && tasksError.trim())
      ? true
      : false
  const next = pipelines[0]

  let tone: 'urgent' | 'warn' | 'ok' | 'loading' | 'block' = 'ok'
  if (blocking) tone = 'block'
  else if (loading) tone = 'loading'
  else if (overdueCount > 0) tone = 'urgent'
  else if (pipelines.length > 0 || activeTaskCount > 0) tone = 'ok'

  return (
    <div
      className={`intern-desk-attention intern-desk-attention--${tone}`}
      role="region"
      aria-label="Team desk status"
    >
      {showRouteHint ? (
        <p className="intern-desk-route-hint subtitle" style={{ margin: '0 0 12px' }}>
          Direct link view: your full volunteer workspace is below this panel — use the
          dock or scroll for mission tasks, training, and Power of 5.
        </p>
      ) : null}

      {blocking ? (
        <p className="intern-desk-attention-lead" role="alert">
          <strong>Data blocked.</strong>{' '}
          {internError ? `Assignments: ${internError}` : null}
          {internError && tasksError ? ' · ' : null}
          {tasksError ? `Mission tasks: ${tasksError}` : null}
        </p>
      ) : loading ? (
        <p className="intern-desk-attention-lead">Syncing assignments and tasks…</p>
      ) : overdueCount > 0 ? (
        <p className="intern-desk-attention-lead">
          <strong>{overdueCount}</strong> first-contact{' '}
          {overdueCount === 1 ? 'window has passed' : 'windows have passed'} — work the
          queue top to bottom.
        </p>
      ) : pipelines.length === 0 && activeTaskCount === 0 ? (
        <p className="intern-desk-attention-lead">
          <strong>Queue clear.</strong> No assigned volunteers or active mission tasks in
          this view — check back after coordinators assign work or tasks sync.
        </p>
      ) : (
        <p className="intern-desk-attention-lead">
          <strong>{pipelines.length}</strong> in your contact queue
          {activeTaskCount > 0
            ? ` · ${activeTaskCount} active mission task${activeTaskCount === 1 ? '' : 's'}`
            : ''}
          .
        </p>
      )}

      {!blocking && !loading && next ? (
        <p className="intern-desk-attention-next subtitle" style={{ margin: '8px 0 0' }}>
          <strong>Next up:</strong> {formatVolunteerRef(next.volunteer_profile_id)} —{' '}
          {formatPipelineStatusLabel(next.status)}
          {isFirstContactOverdue(next.status, next.first_contact_due_at, nowMs)
            ? ' · overdue for first contact'
            : ''}
        </p>
      ) : null}

      {!blocking && !loading && pipelines.length > 0 ? (
        <ul className="intern-desk-attention-actions subtitle" style={{ margin: '10px 0 0' }}>
          <li>Log every touch so coordinators see progress.</li>
          <li>Use <strong>Placed in lane</strong> when the volunteer is active in Power of 5.</li>
          <li>
            <strong>Reassign</strong> after quiet follow-up; <strong>Escalate</strong> if you are
            stuck after documented tries.
          </li>
        </ul>
      ) : null}
    </div>
  )
}
