import { useState } from 'react'
import type { SupervisorAssignmentRow } from '../../lib/supervisorTasks'
import {
  supervisorBlockTask,
  supervisorNudgeTask,
  supervisorReassignTask,
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

export default function CoordinatorAssignmentSegment({
  title,
  description,
  rows,
  onChanged,
  tone = 'default',
  showReassign,
}: {
  title: string
  description?: string
  rows: SupervisorAssignmentRow[]
  onChanged: () => void | Promise<void>
  tone?: 'default' | 'blocked' | 'overdue' | 'active'
  showReassign?: boolean
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

  const headId = `coord-seg-${title.replace(/\s+/g, '-').toLowerCase().slice(0, 48)}`

  if (rows.length === 0) {
    return (
      <section
        className={`coordinator-segment coordinator-segment--empty coordinator-segment--tone-${tone}`}
        aria-labelledby={headId}
      >
        <div className="coordinator-segment-head">
          <h3 id={headId} className="coordinator-segment-title">
            {title}
          </h3>
          <span className="coordinator-segment-count" aria-hidden>
            0
          </span>
        </div>
        {description ? (
          <p className="subtitle coordinator-segment-desc" style={{ margin: '6px 0 0' }}>
            {description}
          </p>
        ) : null}
        <p className="coordinator-segment-empty-msg subtitle" style={{ margin: '10px 0 0' }}>
          None in this lane.
        </p>
      </section>
    )
  }

  return (
    <section
      className={`coordinator-segment coordinator-segment--tone-${tone}`}
      aria-labelledby={headId}
    >
      <div className="coordinator-segment-head">
        <h3 id={headId} className="coordinator-segment-title">
          {title}
        </h3>
        <span className="coordinator-segment-count">{rows.length}</span>
      </div>
      {description ? (
        <p className="subtitle coordinator-segment-desc" style={{ margin: '6px 0 0' }}>
          {description}
        </p>
      ) : null}

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
            {rows.map((r) => (
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
                  {r.due_at ? new Date(r.due_at).toLocaleString() : '—'}
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
                          supervisorBlockTask(r.assignment_id, reason.trim() || null),
                        )
                      }}
                    >
                      Block
                    </button>
                    {showReassign ? (
                      <button
                        type="button"
                        className="btn-touch"
                        disabled={busyId !== null}
                        onClick={() => {
                          const raw = window.prompt(
                            'Reassign to campaign profile UUID (must be on your supervised team):',
                            '',
                          )
                          if (raw === null) return
                          const next = raw.trim()
                          if (!next) return
                          void run(r.assignment_id, () => supervisorReassignTask(r.assignment_id, next))
                        }}
                      >
                        Reassign
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
