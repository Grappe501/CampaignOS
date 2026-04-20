import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { VolunteerTaskRow } from '../../hooks/useVolunteerTasks'
import {
  checklistItemKey,
  type VolunteerTaskWorkspaceSection,
} from '../../lib/volunteerTaskWorkspace'
import TaskActionBar from './TaskActionBar'

function BodyBlocks({ text }: { text: string }) {
  const parts = text.split(/\n+/u).filter(Boolean)
  return (
    <div className="mission-workspace-body">
      {parts.map((p, i) => (
        <p key={i} className="subtitle" style={{ margin: '0 0 10px' }}>
          {p}
        </p>
      ))}
    </div>
  )
}

export default function TaskWorkspaceModal({
  open,
  task,
  busy,
  onClose,
  onClaim,
  onComplete,
  onSkip,
  onChecklistSave,
}: {
  open: boolean
  task: VolunteerTaskRow | null
  busy: boolean
  onClose: () => void
  onClaim: () => Promise<boolean>
  onComplete: () => Promise<boolean>
  onSkip: () => Promise<boolean>
  onChecklistSave: (progress: Record<string, boolean>) => Promise<boolean>
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleItem = useCallback(
    async (section: VolunteerTaskWorkspaceSection, itemId: string) => {
      if (!task) return
      const key = checklistItemKey(section.id, itemId)
      const cur = Boolean(task.checklist_progress[key])
      const next = { ...task.checklist_progress, [key]: !cur }
      await onChecklistSave(next)
    },
    [task, onChecklistSave],
  )

  if (!open || !task) return null

  const spec = task.workspace_spec
  const sections = spec.sections ?? []
  const hasPlaybook = Boolean(spec.intro || sections.length)

  return createPortal(
    <div className="mission-workspace-root" role="dialog" aria-modal="true" aria-label="Task workspace">
      <button
        type="button"
        className="mission-workspace-backdrop"
        aria-label="Close task workspace"
        onClick={onClose}
      />
      <div className="mission-workspace-panel">
        <header className="mission-workspace-header">
          <div>
            <p
              className="subtitle"
              style={{
                margin: 0,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                color: 'var(--accent)',
              }}
            >
              Mission workspace
            </p>
            <h2 className="mission-workspace-title">{task.title}</h2>
            <p className="subtitle" style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
              ~{task.estimated_minutes} min · {task.task_type.replace(/_/g, ' ')}
              {task.claimed_at ? (
                <>
                  {' '}
                  · Claimed {new Date(task.claimed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </>
              ) : null}
            </p>
          </div>
          <button type="button" className="btn-touch mission-workspace-close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="mission-workspace-scroll">
          {task.description ? (
            <p className="subtitle" style={{ margin: '0 0 16px', fontWeight: 600 }}>
              {task.description}
            </p>
          ) : null}

          {!hasPlaybook ? (
            <p className="subtitle" style={{ margin: '0 0 16px' }}>
              Detailed instructions for this mission will appear here as coordinators publish playbooks,
              run-of-show notes, and day-of checklists. Claim the task so we know you are on it.
            </p>
          ) : null}

          {spec.intro ? (
            <section className="mission-workspace-section">
              <h3 className="mission-workspace-section-title">Overview</h3>
              <BodyBlocks text={spec.intro} />
            </section>
          ) : null}

          {sections.map((sec) => (
            <section key={sec.id} className="mission-workspace-section">
              <h3 className="mission-workspace-section-title">{sec.title}</h3>
              {sec.body ? <BodyBlocks text={sec.body} /> : null}
              {sec.checklist?.length ? (
                <ul className="mission-workspace-checklist">
                  {sec.checklist.map((item) => {
                    const key = checklistItemKey(sec.id, item.id)
                    const checked = Boolean(task.checklist_progress[key])
                    return (
                      <li key={item.id}>
                        <label className="mission-workspace-check-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy || task.status === 'blocked'}
                            onChange={() => void toggleItem(sec, item.id)}
                          />
                          <span>{item.label}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="mission-workspace-footer">
          <TaskActionBar
            task={task}
            busy={busy}
            onStart={onClaim}
            onComplete={onComplete}
            onSkip={onSkip}
          />
        </footer>
      </div>
    </div>,
    document.body,
  )
}
