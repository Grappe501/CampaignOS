import type { SupervisorAssignmentRow } from '../../lib/supervisorTasks'
import {
  shortProfileId,
  type CoordinatorAssignmentBuckets,
} from '../../lib/coordinatorDeskData'
import CoordinatorAssignmentSegment from './CoordinatorAssignmentSegment'

function ReadOnlyAssignments({
  title,
  rows,
}: {
  title: string
  rows: SupervisorAssignmentRow[]
}) {
  if (rows.length === 0) return null
  return (
    <section className="coordinator-segment coordinator-segment--readonly" aria-label={title}>
      <div className="coordinator-segment-head">
        <h3 className="coordinator-segment-title">{title}</h3>
        <span className="coordinator-segment-count">{rows.length}</span>
      </div>
      <div className="coordinator-table-wrap">
        <table className="coordinator-table">
          <thead>
            <tr>
              <th scope="col">Mission</th>
              <th scope="col">Assignee</th>
              <th scope="col">Status</th>
              <th scope="col">Closed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.assignment_id}>
                <td>
                  <strong className="coordinator-cell-title">{r.title}</strong>
                  <div className="subtitle coordinator-cell-meta">{r.template_key}</div>
                </td>
                <td className="coordinator-mono">{shortProfileId(r.assignee_profile_id)}</td>
                <td>{r.status}</td>
                <td className="subtitle">
                  {r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function CoordinatorOperationsBoard({
  buckets,
  recentCompletions,
  loading,
  hasSupervisorScope,
  onChanged,
}: {
  buckets: CoordinatorAssignmentBuckets
  recentCompletions: SupervisorAssignmentRow[]
  loading: boolean
  hasSupervisorScope: boolean
  onChanged: () => void | Promise<void>
}) {
  const openTotal =
    buckets.blocked.length +
    buckets.overdue.length +
    buckets.inProgress.length +
    buckets.assigned.length

  if (loading && openTotal === 0 && recentCompletions.length === 0) {
    return (
      <section className="card stack-section coordinator-card" aria-live="polite">
        <h2 className="coordinator-section-title">Team mission operations</h2>
        <p className="subtitle" role="status">
          Loading supervisor assignments…
        </p>
      </section>
    )
  }

  if (!hasSupervisorScope && openTotal === 0 && recentCompletions.length === 0) {
    return (
      <section className="card stack-section coordinator-card" aria-labelledby="coord-ops-empty">
        <h2 id="coord-ops-empty" className="coordinator-section-title">
          Team mission operations
        </h2>
        <div className="coordinator-empty">
          <p className="subtitle" style={{ margin: 0 }}>
            No supervisor scope — mission board stays empty.
          </p>
          <p className="subtitle" style={{ margin: '8px 0 0' }}>
            Add your profile to <strong>volunteer_supervisor_teams</strong> for the Power of 5 team
            you coordinate, then refresh.
          </p>
        </div>
      </section>
    )
  }

  if (!loading && openTotal === 0 && recentCompletions.length === 0) {
    return (
      <section className="card stack-section coordinator-card" aria-labelledby="coord-ops-clear">
        <h2 id="coord-ops-clear" className="coordinator-section-title">
          Team mission operations
        </h2>
        <div className="coordinator-empty">
          <p className="subtitle" style={{ margin: 0 }}>
            No open assignments in your supervisor view right now.
          </p>
          <p className="subtitle" style={{ margin: '8px 0 0' }}>
            When volunteers on your teams receive missions, they will appear in the lanes below.
          </p>
        </div>
      </section>
    )
  }

  return (
    <div className="coordinator-ops-board stack-section">
      <header className="coordinator-ops-board-intro">
        <h2 className="coordinator-section-title" style={{ marginBottom: 6 }}>
          Team mission operations
        </h2>
        <p className="subtitle coordinator-section-lede" style={{ margin: 0 }}>
          Rows from <code>volunteer_supervisor_task_assignments_v</code>. Each assignment is in exactly
          one lane: blocked → overdue → in progress → assigned.
        </p>
      </header>

      <div className="coordinator-segment-grid">
        <CoordinatorAssignmentSegment
          title="Blocked · needs review"
          description="Volunteer is paused — unblock by having them resume in-app, or document why it stays blocked."
          rows={buckets.blocked}
          onChanged={onChanged}
          tone="blocked"
          showReassign
        />
        <CoordinatorAssignmentSegment
          title="Overdue · urgent"
          description="Due time passed — nudge or reassign if the volunteer is stuck."
          rows={buckets.overdue}
          onChanged={onChanged}
          tone="overdue"
          showReassign
        />
        <CoordinatorAssignmentSegment
          title="In progress"
          description="Volunteer marked started — monitor for stalls."
          rows={buckets.inProgress}
          onChanged={onChanged}
          tone="active"
          showReassign
        />
        <CoordinatorAssignmentSegment
          title="Assigned · not started"
          description="Awaiting volunteer claim — good candidates for a light nudge."
          rows={buckets.assigned}
          onChanged={onChanged}
          tone="default"
          showReassign
        />
      </div>

      <ReadOnlyAssignments title="Recently completed or skipped" rows={recentCompletions} />
    </div>
  )
}
