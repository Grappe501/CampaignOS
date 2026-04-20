import { useCallback, useEffect, useState } from 'react'
import {
  fetchVolunteerTaskTemplateOptions,
  supervisorEnqueueMission,
  type VolunteerTaskTemplateOption,
} from '../../lib/supervisorTasks'

export default function CoordinatorMissionDispatch({
  onDispatched,
}: {
  onDispatched: () => void | Promise<void>
}) {
  const [templates, setTemplates] = useState<VolunteerTaskTemplateOption[]>([])
  const [assigneeId, setAssigneeId] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const t = await fetchVolunteerTaskTemplateOptions()
      if (!cancelled) {
        setTemplates(t)
        if (t[0]?.template_key) setTemplateKey(t[0].template_key)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { ok, error } = await supervisorEnqueueMission(assigneeId, templateKey)
      if (!ok) {
        setMessage(error ?? 'Could not assign mission.')
        return
      }
      setMessage('Mission queued (or already active for that template). Refresh if you do not see it.')
      setAssigneeId('')
      await onDispatched()
    } finally {
      setBusy(false)
    }
  }, [assigneeId, templateKey, onDispatched])

  return (
    <section
      className="card stack-section coordinator-card coordinator-dispatch"
      aria-labelledby="coord-dispatch-title"
    >
      <h2 id="coord-dispatch-title" className="coordinator-section-title">
        Dispatch mission
      </h2>
      <p className="subtitle coordinator-section-lede">
        Uses <code>volunteer_assign_task</code> — you may only assign to volunteers on teams you
        supervise. Duplicate active templates are skipped by the server.
      </p>
      <div className="coordinator-dispatch-grid">
        <label className="field-block">
          <span className="coordinator-field-label">Assignee profile ID</span>
          <input
            className="input-stretch"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="uuid from roster / team tooling"
            autoComplete="off"
          />
        </label>
        <label className="field-block">
          <span className="coordinator-field-label">Template</span>
          <select
            className="input-stretch"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            {templates.length === 0 ? (
              <option value="">Loading templates…</option>
            ) : (
              templates.map((t) => (
                <option key={t.template_key} value={t.template_key}>
                  {t.title} ({t.template_key})
                </option>
              ))
            )}
          </select>
        </label>
      </div>
      <button
        type="button"
        className="btn-touch btn-primary"
        style={{ marginTop: 12 }}
        disabled={busy || !assigneeId.trim() || !templateKey}
        onClick={() => void submit()}
      >
        {busy ? 'Assigning…' : 'Assign mission'}
      </button>
      {message ? (
        <p className="subtitle" role="status" style={{ marginTop: 12, marginBottom: 0 }}>
          {message}
        </p>
      ) : null}
    </section>
  )
}
