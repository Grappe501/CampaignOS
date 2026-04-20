import type { ContactMethod, ContactOutcome } from '../../lib/internPipelineEngine'

type Props = {
  selectedPipelineId: string | null
  busy: boolean
  method: ContactMethod
  outcome: ContactOutcome
  notes: string
  onMethodChange: (m: ContactMethod) => void
  onOutcomeChange: (o: ContactOutcome) => void
  onNotesChange: (s: string) => void
  onSave: () => void
  onCancel: () => void
}

const METHOD_LABELS: Record<ContactMethod, string> = {
  call: 'Phone call',
  text: 'Text / SMS',
  email: 'Email',
}

const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  no_answer: 'No answer',
  left_message: 'Left message',
  spoke: 'Spoke with volunteer',
  scheduled_followup: 'Scheduled follow-up',
}

export default function InternDeskLogAttemptForm({
  selectedPipelineId,
  busy,
  method,
  outcome,
  notes,
  onMethodChange,
  onOutcomeChange,
  onNotesChange,
  onSave,
  onCancel,
}: Props) {
  if (!selectedPipelineId) return null

  return (
    <div className="intern-log-attempt stack-section" style={{ marginTop: 14 }}>
      <h3 className="subtitle" style={{ fontWeight: 800, margin: 0 }}>
        Log contact attempt
      </h3>
      <p className="subtitle" style={{ margin: '6px 0 12px' }}>
        Records sync to the volunteer contact pipeline so coordinators see method, outcome,
        and notes.
      </p>
      <div className="intern-log-attempt-fields">
        <label className="intern-field">
          <span className="intern-field-label">Method</span>
          <select
            className="input-like"
            value={method}
            onChange={(e) => onMethodChange(e.target.value as ContactMethod)}
          >
            {(Object.keys(METHOD_LABELS) as ContactMethod[]).map((k) => (
              <option key={k} value={k}>
                {METHOD_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="intern-field">
          <span className="intern-field-label">Outcome</span>
          <select
            className="input-like"
            value={outcome}
            onChange={(e) => onOutcomeChange(e.target.value as ContactOutcome)}
          >
            {(Object.keys(OUTCOME_LABELS) as ContactOutcome[]).map((k) => (
              <option key={k} value={k}>
                {OUTCOME_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="intern-field intern-field--block" style={{ marginTop: 10 }}>
        <span className="intern-field-label">Notes (optional)</span>
        <textarea
          className="input-like"
          style={{ width: '100%', minHeight: 72, marginTop: 4 }}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="What you tried, best time to retry, or volunteer sentiment."
          maxLength={2000}
        />
      </label>
      <div className="intern-log-attempt-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn-touch btn-primary" disabled={busy} onClick={onSave}>
          Save attempt
        </button>
        <button type="button" className="btn-touch" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
