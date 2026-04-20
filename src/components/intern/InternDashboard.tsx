import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import AppHeader from '../AppHeader'
import AppFooter from '../AppFooter'
import FloatingAgentJones from '../FloatingAgentJones'
import { useProfile } from '../../hooks/useProfile'
import { useInternLayer } from '../../hooks/useInternLayer'
import { useVolunteerTasks } from '../../hooks/useVolunteerTasks'
import {
  escalateVolunteer,
  logContactAttempt,
  markPipelinePlaced,
  reassignVolunteer,
} from '../../lib/internPipelineEngine'
import type { ContactMethod, ContactOutcome } from '../../lib/internPipelineEngine'
import { isDevAuthBypassEnabled } from '../../lib/devAuth'

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

type InternDashboardProps = {
  onDevSessionClear?: () => void
}

export default function InternDashboard({
  onDevSessionClear,
}: InternDashboardProps) {
  const { profile, loading: profileLoading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const role = profile?.primary_role != null ? String(profile.primary_role) : null
  const isIntern = role?.toLowerCase() === 'intern'

  const intern = useInternLayer(profileId, role)
  const tasks = useVolunteerTasks(profileId)

  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<ContactMethod>('call')
  const [outcome, setOutcome] = useState<ContactOutcome>('spoke')
  const [notes, setNotes] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const agentInternMerged = useMemo(() => {
    if (!intern.agentInternContext) return null
    return {
      ...intern.agentInternContext,
      leadership_task_title: tasks.nextBest?.title ?? null,
    }
  }, [intern.agentInternContext, tasks.nextBest?.title])

  const onSignOut = useCallback(() => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut().then(() => {
      window.location.assign('/login')
    })
  }, [onDevSessionClear])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      await intern.refetch()
      await tasks.refetch()
    } finally {
      setBusy(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="app-viewport">
        <p className="subtitle" style={{ padding: 24 }}>
          Loading…
        </p>
      </div>
    )
  }

  if (!isIntern) {
    return (
      <div className="app-viewport">
        <AppHeader onSignOut={isDevAuthBypassEnabled() ? undefined : onSignOut} />
        <main className="app-main" style={{ padding: 20 }}>
          <p className="subtitle">Intern desk is for accounts with role “intern”.</p>
          <Link to="/dashboard">Back to dashboard</Link>
        </main>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="app-viewport">
      <AppHeader onSignOut={onSignOut} showInternDesk />
      <main className="app-main intern-desk-main" style={{ padding: '16px 16px 96px' }}>
        <p className="subtitle" style={{ margin: 0, fontWeight: 700 }}>
          Intern desk
        </p>
        <h1 style={{ margin: '6px 0 12px', fontSize: '1.35rem' }}>Volunteers & follow-ups</h1>
        <p className="subtitle" style={{ margin: '0 0 16px' }}>
          <Link to="/dashboard">Open full volunteer dashboard</Link>
          {' · '}
          First contact goal: 72h · Reassign if still quiet after +24h (up to 3 rounds) · then escalation.
        </p>

        {intern.error ? (
          <p className="subtitle" role="alert" style={{ color: 'var(--accent)' }}>
            {intern.error}
          </p>
        ) : null}
        {tasks.error ? (
          <p className="subtitle" role="alert" style={{ color: 'var(--accent)' }}>
            {tasks.error}
          </p>
        ) : null}

        <section className="card stack-section" style={{ marginBottom: 16 }}>
          <h2 className="subtitle" style={{ fontWeight: 800, margin: 0 }}>
            Your mission tasks
          </h2>
          {tasks.loading ? (
            <p className="subtitle">Loading tasks…</p>
          ) : tasks.active.length === 0 ? (
            <p className="subtitle">No active tasks — check back after sync.</p>
          ) : (
            <ul className="intern-task-list">
              {tasks.active.map((t) => (
                <li key={t.id} className="intern-task-list__item">
                  <div>
                    <strong>{t.title}</strong>
                    <span className="subtitle" style={{ display: 'block' }}>
                      {t.template_key} · {t.status}
                    </span>
                  </div>
                  <div className="intern-task-list__actions">
                    <button
                      type="button"
                      className="btn-touch"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await tasks.claim(t.id)
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
                          await tasks.complete(t.id, null)
                          await refetch()
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
                          await tasks.decline(t.id, declineReason || 'declined')
                        })
                      }
                    >
                      Decline & reassign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <label className="subtitle" style={{ display: 'block', marginTop: 8 }}>
            Optional decline note
            <input
              type="text"
              className="input-like"
              style={{ width: '100%', marginTop: 4 }}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Shift conflict, capacity, etc."
              maxLength={240}
            />
          </label>
        </section>

        <section className="card stack-section" style={{ marginBottom: 16 }}>
          <h2 className="subtitle" style={{ fontWeight: 800, margin: 0 }}>
            Assigned volunteers ({intern.pipelines.length})
            {intern.overdueCount > 0 ? (
              <span style={{ color: 'var(--accent)', marginLeft: 8 }}>
                · {intern.overdueCount} overdue first contact
              </span>
            ) : null}
          </h2>
          {intern.loading ? (
            <p className="subtitle">Loading pipeline…</p>
          ) : intern.pipelines.length === 0 ? (
            <p className="subtitle">No active assignments right now.</p>
          ) : (
            <ul className="intern-pipeline-list">
              {intern.pipelines.map((p) => {
                const dueMs = new Date(p.first_contact_due_at).getTime()
                const overdue =
                  p.status === 'pending' &&
                  Number.isFinite(dueMs) &&
                  intern.nowMs > dueMs
                return (
                  <li
                    key={p.id}
                    className={`intern-pipeline-list__item${overdue ? ' intern-pipeline-list__item--due' : ''}`}
                  >
                    <div>
                      <strong>Volunteer {shortId(p.volunteer_profile_id)}</strong>
                      <span className="subtitle" style={{ display: 'block' }}>
                        {p.status} · attempts {p.attempt_count} · reassigns {p.reassignment_count}
                      </span>
                      <span className="subtitle" style={{ display: 'block' }}>
                        First contact due: {new Date(p.first_contact_due_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="intern-pipeline-list__actions">
                      <button
                        type="button"
                        className="btn-touch"
                        disabled={busy}
                        onClick={() => setSelectedPipeline(p.id)}
                      >
                        Log attempt
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
                        className="btn-touch"
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

          {selectedPipeline ? (
            <div className="intern-log-attempt" style={{ marginTop: 12 }}>
              <h3 className="subtitle" style={{ fontWeight: 700 }}>
                Log contact
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <label>
                  Method
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as ContactMethod)}
                  >
                    <option value="call">call</option>
                    <option value="text">text</option>
                    <option value="email">email</option>
                  </select>
                </label>
                <label>
                  Outcome
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as ContactOutcome)}
                  >
                    <option value="no_answer">no_answer</option>
                    <option value="left_message">left_message</option>
                    <option value="spoke">spoke</option>
                    <option value="scheduled_followup">scheduled_followup</option>
                  </select>
                </label>
              </div>
              <textarea
                className="input-like"
                style={{ width: '100%', minHeight: 64, marginTop: 8 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Short notes (optional)"
                maxLength={2000}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-touch"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await logContactAttempt(selectedPipeline, method, outcome, notes)
                      setNotes('')
                      setSelectedPipeline(null)
                    })
                  }
                >
                  Save attempt
                </button>
                <button
                  type="button"
                  className="btn-touch"
                  onClick={() => setSelectedPipeline(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
      <AppFooter />
      <FloatingAgentJones
        progressSlice="matched_ready"
        profile={profile}
        voterLoading={false}
        voterMatched={Boolean(profile?.linked_voter_id)}
        volunteerMission={tasks.agentMissionContext}
        dailyActivation={null}
        internLayer={agentInternMerged}
      />
    </div>
  )
}
