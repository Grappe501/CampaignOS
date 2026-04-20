import { useState } from 'react'
import type {
  VolunteerEngagementRow,
  VolunteerTaskRow,
} from '../../hooks/useVolunteerTasks'
import TaskWorkspaceModal from './TaskWorkspaceModal'

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

export default function TaskListCard({
  active,
  engagement,
  loading,
  error,
  nextBest,
  onClaim,
  onComplete,
  onSkip,
  onChecklistSave,
  refetch,
}: {
  active: VolunteerTaskRow[]
  engagement: VolunteerEngagementRow | null
  loading: boolean
  error: string | null
  nextBest: VolunteerTaskRow | null
  onClaim: (id: string) => Promise<boolean>
  onComplete: (id: string) => Promise<boolean>
  onSkip: (id: string) => Promise<boolean>
  onChecklistSave: (id: string, progress: Record<string, boolean>) => Promise<boolean>
  refetch: () => Promise<void>
}) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const show = active.slice(0, 3)
  const workspaceTask = show.find((t) => t.id === workspaceId) ?? null

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true)
    try {
      const ok = await fn()
      if (ok) await refetch()
      return ok
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card stack-section mission-task-card" aria-labelledby="mission-tasks-title">
        <p
          className="subtitle"
          style={{
            margin: 0,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            color: 'var(--accent)',
          }}
        >
          Your next moves
        </p>
        <h3
          id="mission-tasks-title"
          style={{ margin: '4px 0 0', fontSize: '1.05rem', color: 'var(--text-h)' }}
        >
          {nextBest ? nextBest.title : 'Mission queue'}
        </h3>
        <p className="subtitle" style={{ margin: '6px 0 0' }}>
          Tap a mission to open the full workspace — instructions, run-of-show, and day-of checklists
          live there. Claim a task when you are ready to own it.
        </p>
        {engagement ? (
          <p className="subtitle" style={{ margin: '8px 0 0', fontWeight: 600, fontSize: '0.9rem' }}>
            Momentum {engagement.points_total} pts · {engagement.streak_completion_days}-day completion
            rhythm
          </p>
        ) : null}
        {error ? (
          <p className="subtitle" role="alert" style={{ margin: '8px 0 0', color: 'var(--accent)' }}>
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="subtitle" style={{ margin: '10px 0 0' }}>
            Loading your mission queue…
          </p>
        ) : show.length === 0 ? (
          <p className="subtitle" style={{ margin: '10px 0 0' }}>
            Nothing queued right now — you cleared the deck or we are lining up your next nudge.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
            {show.map((t, i) => (
              <li key={t.id} style={{ marginTop: i ? 10 : 0 }}>
                <button
                  type="button"
                  className="btn-touch"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    border: '1px solid color-mix(in srgb, var(--text-h) 10%, transparent)',
                  }}
                  onClick={() => setWorkspaceId(t.id)}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                    {i === 0 ? 'Next best · ' : ''}
                    {t.title}
                  </span>
                  <span className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {t.claimed_at ? 'Claimed · ' : ''}
                    {statusLabel(t.status)} · ~{t.estimated_minutes} min · Open workspace →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaskWorkspaceModal
        open={workspaceId != null}
        task={workspaceTask}
        busy={busy}
        onClose={() => setWorkspaceId(null)}
        onClaim={() =>
          run(async () => {
            if (!workspaceTask) return false
            return onClaim(workspaceTask.id)
          })
        }
        onComplete={() =>
          run(async () => {
            if (!workspaceTask) return false
            const ok = await onComplete(workspaceTask.id)
            if (ok) setWorkspaceId(null)
            return ok
          })
        }
        onSkip={() =>
          run(async () => {
            if (!workspaceTask) return false
            const ok = await onSkip(workspaceTask.id)
            if (ok) setWorkspaceId(null)
            return ok
          })
        }
        onChecklistSave={(progress) =>
          workspaceTask ? onChecklistSave(workspaceTask.id, progress) : Promise.resolve(false)
        }
      />
    </>
  )
}
