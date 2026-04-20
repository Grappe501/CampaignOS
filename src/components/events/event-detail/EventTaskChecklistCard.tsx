import { useState } from 'react'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import type {
  EventStageSlug,
  EventTaskInstance,
  EventTaskTemplate,
} from '../../../lib/eventTaskTemplateConfig'
import { formatEventStageSlug } from './eventDetailUtils'

type TaskBlock = { stage: EventStageSlug; tasks: EventTaskTemplate[] }

export type AdhocEventTaskRow = { id: string; title: string }

type EventTaskChecklistCardProps = {
  effectiveType: CampaignEventTypeKey
  tasksByStage: TaskBlock[]
  instances: EventTaskInstance[] | null
  completedTemplateSlugs: ReadonlySet<string>
  onToggleTemplateComplete: (slug: string) => void | Promise<void>
  adhocTasks: readonly AdhocEventTaskRow[]
  onAddAdhocTask: (title: string) => void
  tasksLoading?: boolean
  tasksError?: Error | null
}

function dueCell(
  t: EventTaskTemplate,
  instances: EventTaskInstance[] | null,
): string {
  const offsetParts: string[] = []
  if (t.dueOffsetDays != null) offsetParts.push(`${t.dueOffsetDays}d`)
  if (t.dueOffsetHours != null) offsetParts.push(`${t.dueOffsetHours}h`)
  const offset = offsetParts.length > 0 ? offsetParts.join(' ') : '—'
  if (!instances) return offset
  const inst = instances.find((i) => i.templateSlug === t.slug)
  if (!inst?.dueAtIso) return offset
  const local = new Date(inst.dueAtIso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${offset} → ${local}`
}

export default function EventTaskChecklistCard({
  effectiveType,
  tasksByStage,
  instances,
  completedTemplateSlugs,
  onToggleTemplateComplete,
  adhocTasks,
  onAddAdhocTask,
  tasksLoading = false,
  tasksError = null,
}: EventTaskChecklistCardProps) {
  const [adhocDraft, setAdhocDraft] = useState('')

  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-task-checklist"
      aria-labelledby="event-task-checklist-heading"
    >
      <h2 id="event-task-checklist-heading" className="event-coordinator-desk__h2">
        Task checklist
      </h2>
      {tasksLoading ? (
        <p className="event-coordinator-desk__meta" role="status" aria-live="polite">
          Syncing task rows from Supabase…
        </p>
      ) : null}
      {tasksError ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          Tasks could not be updated: {tasksError.message}
        </p>
      ) : null}
      <p className="event-coordinator-desk__placeholder">
        Config-driven templates for <code>{effectiveType}</code>. Completion is saved to{' '}
        <code>campaign_event_task_instances</code> and drives readiness.
      </p>
      <div className="event-record-desk__table-wrap">
        <table className="event-record-desk__table">
          <caption className="sr-only">Task templates by stage</caption>
          <thead>
            <tr>
              <th scope="col">Required</th>
              <th scope="col">Slug</th>
              <th scope="col">Task</th>
              <th scope="col">Stage</th>
              <th scope="col">Owner</th>
              <th scope="col">Due</th>
              <th scope="col">Depends</th>
              <th scope="col">Tags</th>
              <th scope="col">Esc.</th>
              <th scope="col">Done</th>
            </tr>
          </thead>
          <tbody>
            {tasksByStage.flatMap((block) =>
              block.tasks.map((t) => (
                <tr key={t.slug}>
                  <td>{t.required ? 'Yes' : '—'}</td>
                  <td>
                    <code className="event-record-desk__mono-sm">{t.slug}</code>
                  </td>
                  <td>
                    {t.title}
                    {t.description ? (
                      <span className="event-detail-task__desc"> — {t.description}</span>
                    ) : null}
                  </td>
                  <td>{formatEventStageSlug(t.stage)}</td>
                  <td>
                    <code>{t.ownerRole}</code>
                  </td>
                  <td>{dueCell(t, instances)}</td>
                  <td>
                    {t.dependencySlugs?.length ? (
                      <code className="event-record-desk__mono-sm">
                        {t.dependencySlugs.join(', ')}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{t.tags?.length ? t.tags.join(', ') : '—'}</td>
                  <td>{t.escalationAfterHours != null ? `${t.escalationAfterHours}h` : '—'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={completedTemplateSlugs.has(t.slug)}
                      onChange={() => onToggleTemplateComplete(t.slug)}
                      aria-label={`Mark done: ${t.title}`}
                    />
                  </td>
                </tr>
              )),
            )}
            {adhocTasks.map((row) => (
              <tr key={row.id}>
                <td>—</td>
                <td>
                  <code className="event-record-desk__mono-sm">adhoc</code>
                </td>
                <td>{row.title}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>adhoc</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="event-task-checklist__adhoc"
        onSubmit={(e) => {
          e.preventDefault()
          const t = adhocDraft.trim()
          if (!t) return
          onAddAdhocTask(t)
          setAdhocDraft('')
        }}
      >
        <label className="event-task-checklist__adhoc-label">
          <span>Add task from scheduling / field notes</span>
          <input
            type="text"
            name="adhoc_title"
            value={adhocDraft}
            onChange={(e) => setAdhocDraft(e.target.value)}
            placeholder="e.g. Confirm AV with venue"
            className="event-task-checklist__adhoc-input"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn-touch">
          Add task
        </button>
      </form>

      <p className="event-coordinator-desk__meta">
        Completion rule: <code>manual</code> unless extended to auto rules when fields/status exist.
      </p>
    </section>
  )
}
