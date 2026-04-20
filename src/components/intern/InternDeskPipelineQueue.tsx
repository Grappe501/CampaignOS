import type { PipelineRow } from '../../hooks/useInternLayer'
import {
  escalateVolunteer,
  logContactAttempt,
  markPipelinePlaced,
  reassignVolunteer,
} from '../../lib/internPipelineEngine'
import type { ContactMethod, ContactOutcome } from '../../lib/internPipelineEngine'
import {
  escalationLabel,
  formatDueClockSummary,
  formatPipelineStatusLabel,
  formatVolunteerRef,
  isFirstContactOverdue,
} from './internDeskFormat'
import InternDeskLogAttemptForm from './InternDeskLogAttemptForm'

type Props = {
  pipelines: PipelineRow[]
  loading: boolean
  nowMs: number
  busy: boolean
  selectedPipeline: string | null
  method: ContactMethod
  outcome: ContactOutcome
  notes: string
  onSelectPipeline: (id: string | null) => void
  onMethodChange: (m: ContactMethod) => void
  onOutcomeChange: (o: ContactOutcome) => void
  onNotesChange: (s: string) => void
  run: (fn: () => Promise<void>) => Promise<void>
}

export default function InternDeskPipelineQueue({
  pipelines,
  loading,
  nowMs,
  busy,
  selectedPipeline,
  method,
  outcome,
  notes,
  onSelectPipeline,
  onMethodChange,
  onOutcomeChange,
  onNotesChange,
  run,
}: Props) {
  return (
    <section className="intern-desk-section card stack-section">
      <header className="intern-desk-section-head">
        <h3 className="intern-desk-section-title">Volunteer contact queue</h3>
        <p className="subtitle intern-desk-section-lede" style={{ margin: 0 }}>
          Assigned volunteers you owe a first touch or follow-up. Order is by first-contact
          due time — stay inside campaign SLAs (72h first contact; reassign after sustained
          silence; escalate when rules are exhausted).
        </p>
      </header>

      {loading ? (
        <p className="subtitle intern-desk-muted-loading" role="status">
          Loading your assignments…
        </p>
      ) : pipelines.length === 0 ? (
        <div className="intern-empty-state">
          <p className="subtitle" style={{ margin: 0 }}>
            No volunteers are assigned to you in the contact pipeline right now.
          </p>
          <p className="subtitle" style={{ margin: '8px 0 0' }}>
            When coordinators assign volunteers to you, they will appear here with due times
            and actions.
          </p>
        </div>
      ) : (
        <ul className="intern-pipeline-list">
          {pipelines.map((p) => {
            const overdue = isFirstContactOverdue(p.status, p.first_contact_due_at, nowMs)
            const esc = escalationLabel(p.escalation_level)
            const nextAction = p.next_action_due_at
              ? formatDueClockSummary(nowMs, p.next_action_due_at, 'next_action')
              : null
            return (
              <li
                key={p.id}
                className={`intern-pipeline-list__item${overdue ? ' intern-pipeline-list__item--due' : ''}${selectedPipeline === p.id ? ' intern-pipeline-list__item--active' : ''}`}
              >
                <div className="intern-pipeline-body">
                  <div className="intern-pipeline-title-row">
                    <strong className="intern-pipeline-volunteer">
                      {formatVolunteerRef(p.volunteer_profile_id)}
                    </strong>
                    <span
                      className={`intern-status-pill intern-status-pill--${p.status === 'pending' ? 'pending' : 'contacted'}`}
                    >
                      {formatPipelineStatusLabel(p.status)}
                    </span>
                  </div>
                  <dl className="intern-pipeline-meta">
                    <div>
                      <dt>First contact</dt>
                      <dd>
                        {formatDueClockSummary(nowMs, p.first_contact_due_at, 'first_contact')}
                        <span className="intern-pipeline-meta-abs">
                          {' '}
                          ({new Date(p.first_contact_due_at).toLocaleString()})
                        </span>
                      </dd>
                    </div>
                    {nextAction ? (
                      <div>
                        <dt>Follow-up</dt>
                        <dd>
                          {nextAction}
                          {p.next_action_due_at ? (
                            <span className="intern-pipeline-meta-abs">
                              {' '}
                              ({new Date(p.next_action_due_at).toLocaleString()})
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Activity</dt>
                      <dd>
                        {p.attempt_count} contact attempt
                        {p.attempt_count === 1 ? '' : 's'} · {p.reassignment_count}{' '}
                        reassignment
                        {p.reassignment_count === 1 ? '' : 's'}
                      </dd>
                    </div>
                    {esc ? (
                      <div className="intern-pipeline-escalation">
                        <dt>Flag</dt>
                        <dd>{esc}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="intern-pipeline-list__actions">
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={busy}
                    onClick={() => onSelectPipeline(p.id)}
                  >
                    {selectedPipeline === p.id ? 'Selected — form below' : 'Log attempt'}
                  </button>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await markPipelinePlaced(p.id)
                      })
                    }
                  >
                    Placed in lane
                  </button>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await reassignVolunteer(p.id)
                      })
                    }
                  >
                    Reassign
                  </button>
                  <button
                    type="button"
                    className="btn-touch intern-pipeline-action--risk"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await escalateVolunteer(p.id)
                      })
                    }
                  >
                    Escalate
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <InternDeskLogAttemptForm
        selectedPipelineId={selectedPipeline}
        busy={busy}
        method={method}
        outcome={outcome}
        notes={notes}
        onMethodChange={onMethodChange}
        onOutcomeChange={onOutcomeChange}
        onNotesChange={onNotesChange}
        onSave={() =>
          void run(async () => {
            if (!selectedPipeline) return
            await logContactAttempt(selectedPipeline, method, outcome, notes)
            onNotesChange('')
            onSelectPipeline(null)
          })
        }
        onCancel={() => onSelectPipeline(null)}
      />
    </section>
  )
}
