import { useState } from 'react'
import type { SupervisorAssignmentRow } from '../../lib/supervisorTasks'
import {
  supervisorBlockTask,
  supervisorNudgeTask,
} from '../../lib/supervisorTasks'
import { shortProfileId } from '../../lib/coordinatorDeskData'

function statusLabel(s: string): string {
  const x = String(s ?? '').trim().toLowerCase()
  if (x === 'assigned') return 'Assigned'
  if (x === 'in_progress') return 'In progress'
  if (x === 'blocked') return 'Blocked'
  if (x === 'completed') return 'Completed'
  if (x === 'skipped') return 'Skipped'
  return x.replace(/_/g, ' ') || '—'
}

export default function CoordinatorMissionBoard({
  rows,
  loading,
  onChanged,
}: {
  rows: SupervisorAssignmentRow[]
  loading: boolean
  onChanged: () => void | Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const run = async (assignmentId: string, fn: () => Promise<boolean>) => {
    setBusyId(assignmentId)
    try {
      const ok = await fn()
      if (ok) await onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const active = rows.filter((r) => r.status !== 'completed' && r.status !== 'skipped')

  return (
    <section
      className="card stack-section coordinator-card"
      aria-labelledby="coordinator-missions-title"
    >
      <h2 id="coordinator-missions-title" className="coordinator-section-title">
        Team mission assignments
      </h2>
      <p className="subtitle coordinator-section-lede">
        Rows from <code>volunteer_supervisor_task_assignments_v</code> — tasks for volunteers
        on teams you supervise. Actions call existing supervisor RPCs (nudge / block).
        Reassign needs a target profile ID and is not exposed here yet.
      </p>

      {loading ? (
        <p className="subtitle" role="status">
          Loading assignments…
        </p>
      ) : active.length === 0 ? (
        <div className="coordinator-empty">
          <p className="subtitle" style={{ margin: 0 }}>
            No open assignments in your supervisor scope.
          </p>
          <p className="subtitle" style={{ margin: '8px 0 0' }}>
            Ensure you are listed in <strong>volunteer_supervisor_teams</strong> for the
            correct Power of 5 team, then refresh after volunteers receive tasks.
          </p>
        </div>
      ) : (
        <div className="coordinator-table-wrap">
          <table className="coordinator-table">
            <thead>
              <tr>
                <th scope="col">Mission</th>
                <th scope="col">Assignee</th>
                <th scope="col">Status</th>
                <th scope="col">Due</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.assignment_id}>
                  <td>
                    <strong className="coordinator-cell-title">{r.title}</strong>
                    <div className="subtitle coordinator-cell-meta">
                      {r.template_key} · {r.task_type}
                    </div>
                  </td>
                  <td className="coordinator-mono">
                    {shortProfileId(r.assignee_profile_id)}
                  </td>
                  <td>
                    <span
                      className={`coordinator-pill coordinator-pill--${r.status === 'blocked' ? 'blocked' : 'open'}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="subtitle">
                    {r.due_at
                      ? new Date(r.due_at).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <div className="coordinator-row-actions">
                      <button
                        type="button"
                        className="btn-touch"
                        disabled={busyId !== null}
                        onClick={() =>
                          void run(r.assignment_id, () => supervisorNudgeTask(r.assignment_id))
                        }
                      >
                        Nudge
                      </button>
                      <button
                        type="button"
                        className="btn-touch"
                        disabled={busyId !== null}
                        onClick={() => {
                          const reason = window.prompt(
                            'Block reason for the volunteer (optional, max ~500 chars):',
                            '',
                          )
                          if (reason === null) return
                          void run(r.assignment_id, () =>
                            supervisorBlockTask(
                              r.assignment_id,
                              reason.trim() || null,
                            ),
                          )
                        }}
                      >
                        Block
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
