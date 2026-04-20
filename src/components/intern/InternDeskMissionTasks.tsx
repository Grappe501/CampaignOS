import type { VolunteerTaskRow } from '../../hooks/useVolunteerTasks'

type Props = {
  tasks: VolunteerTaskRow[]
  loading: boolean
  busy: boolean
  declineReason: string
  onDeclineReasonChange: (s: string) => void
  run: (fn: () => Promise<void>) => Promise<void>
  onClaim: (assignmentId: string) => Promise<boolean>
  onComplete: (assignmentId: string) => Promise<boolean>
  onDecline: (assignmentId: string, reason: string | null) => Promise<boolean>
  onProfileRefetch: () => void | Promise<void>
}

function statusLabel(status: string): string {
  const s = String(status ?? '').trim().toLowerCase()
  if (s === 'assigned') return 'Assigned'
  if (s === 'in_progress') return 'In progress'
  if (s === 'blocked') return 'Blocked'
  return s.replace(/_/g, ' ') || '—'
}

export default function InternDeskMissionTasks({
  tasks,
  loading,
  busy,
  declineReason,
  onDeclineReasonChange,
  run,
  onClaim,
  onComplete,
  onDecline,
  onProfileRefetch,
}: Props) {
  return (
    <section className="intern-desk-section card stack-section">
      <header className="intern-desk-section-head">
        <h3 className="intern-desk-section-title">Your mission tasks</h3>
        <p className="subtitle intern-desk-section-lede" style={{ margin: 0 }}>
          Campaign-assigned work (separate from the volunteer queue). Claim to start, mark
          done when finished, or decline with a short note for coordinators.
        </p>
      </header>

      {loading ? (
        <p className="subtitle intern-desk-muted-loading" role="status">
          Loading mission tasks…
        </p>
      ) : tasks.length === 0 ? (
        <div className="intern-empty-state">
          <p className="subtitle" style={{ margin: 0 }}>
            No active assignments in your task inbox.
          </p>
          <p className="subtitle" style={{ margin: '8px 0 0' }}>
            New tasks appear when HQ assigns templates to your profile; refresh after sync if
            you expect something here.
          </p>
        </div>
      ) : (
        <ul className="intern-task-list">
          {tasks.map((t) => (
            <li key={t.id} className="intern-task-list__item">
              <div className="intern-task-main">
                <strong className="intern-task-title">{t.title}</strong>
                <span className="subtitle intern-task-meta">
                  {t.template_key} · {statusLabel(t.status)}
                  {t.priority ? ` · ${t.priority} priority` : ''}
                </span>
              </div>
              <div className="intern-task-list__actions">
                <button
                  type="button"
                  className="btn-touch"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await onClaim(t.id)
                    })
                  }
                >
                  Start
                </button>
                <button
                  type="button"
                  className="btn-touch"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const ok = await onComplete(t.id, null)
                      if (ok) await onProfileRefetch()
                    })
                  }
                >
                  Done
                </button>
                <button
                  type="button"
                  className="btn-touch"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await onDecline(t.id, declineReason.trim() || null)
                    })
                  }
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 ? (
        <label className="intern-field intern-field--block" style={{ marginTop: 14 }}>
          <span className="intern-field-label">
            Optional note for coordinators (sent with the next Decline you tap)
          </span>
          <input
            type="text"
            className="input-like"
            style={{ width: '100%', marginTop: 4 }}
            value={declineReason}
            onChange={(e) => onDeclineReasonChange(e.target.value)}
            placeholder="e.g. shift conflict, need different skill match"
            maxLength={240}
          />
        </label>
      ) : null}
    </section>
  )
}
