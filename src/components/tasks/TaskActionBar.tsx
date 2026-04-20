import type { VolunteerTaskRow } from '../../hooks/useVolunteerTasks'

export default function TaskActionBar({
  task,
  busy,
  onStart,
  onComplete,
  onSkip,
}: {
  task: VolunteerTaskRow
  busy: boolean
  onStart: () => void
  onComplete: () => void
  onSkip: () => void
}) {
  const canClaim = task.status === 'assigned'
  const canFinish = task.status === 'in_progress' || task.status === 'assigned'
  const blocked = task.status === 'blocked'

  return (
    <div className="mission-task-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {canClaim ? (
        <button
          type="button"
          className="btn-touch btn-primary"
          disabled={busy || blocked}
          onClick={onStart}
        >
          Claim task
        </button>
      ) : null}
      {canFinish && !blocked ? (
        <button
          type="button"
          className="btn-touch btn-primary"
          disabled={busy}
          onClick={onComplete}
        >
          Mark complete
        </button>
      ) : null}
      {!blocked ? (
        <button type="button" className="btn-touch" disabled={busy} onClick={onSkip}>
          Skip for now
        </button>
      ) : (
        <p className="subtitle" style={{ margin: 0, fontWeight: 600 }}>
          Your coordinator marked this blocked — reach out to them to continue.
        </p>
      )}
    </div>
  )
}
