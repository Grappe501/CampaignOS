import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  canApproveEventRequests,
  sortPendingApprovalEvents,
  type ApprovalQueueSortMode,
} from '../../../lib/eventApprovalService'
import { approveCampaignEventRequestRpc, rejectCampaignEventRequestRpc } from '../../../lib/campaignEventsFromSupabase'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { buildDeterministicEventSummary } from '../../../lib/eventSummaryAI'
import { runApprovalPrecheck } from '../../../lib/approvalPrecheckEngine'
import { fetchApprovalAuditLog, insertCampaignEventApprovalAudit } from '../../../lib/eventApprovalAuditDb'
import type { CampaignProfile } from '../../../hooks/useProfile'

type EventApprovalQueueProps = {
  events: readonly CampaignCalendarEventRecord[]
  profile: CampaignProfile | null
  onRefetch: () => void | Promise<void>
}

export default function EventApprovalQueue({ events, profile, onRefetch }: EventApprovalQueueProps) {
  const [sortMode, setSortMode] = useState<ApprovalQueueSortMode>('oldest_request')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [conditions, setConditions] = useState<Record<string, string>>({})
  const [auditById, setAuditById] = useState<Record<string, Awaited<ReturnType<typeof fetchApprovalAuditLog>>>>({})
  const [openAuditId, setOpenAuditId] = useState<string | null>(null)
  const [clockMs, setClockMs] = useState(() => Date.now())

  const pending = useMemo(
    () => sortPendingApprovalEvents(events, sortMode, events),
    [events, sortMode],
  )
  const canAct = canApproveEventRequests(profile)

  const loadAudit = useCallback(async (eventId: string) => {
    const rows = await fetchApprovalAuditLog(eventId)
    setAuditById((m) => ({ ...m, [eventId]: rows }))
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (pending.length === 0) {
    return (
      <section
        className="event-coordinator-desk__section"
        aria-labelledby="approval-queue-heading"
        style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '1rem' }}
      >
        <h2 id="event-approval-queue-heading" className="event-coordinator-desk__h2">
          Approval queue
        </h2>
        <p className="event-coordinator-desk__meta" role="status">
          All clear — no volunteer or neighborhood event requests awaiting approval.
        </p>
      </section>
    )
  }

  return (
    <section
      className="event-coordinator-desk__section"
      aria-labelledby="approval-queue-heading"
      style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '1rem' }}
    >
      <h2 id="event-approval-queue-heading" className="event-coordinator-desk__h2">
        Approval queue ({pending.length})
      </h2>
      <p className="event-coordinator-desk__meta">
        Review the checklist, add notes, then approve or send back. Requests stay off the volunteer
        calendar until you approve.
      </p>
      <label className="subtitle" style={{ display: 'block', marginBottom: 8 }}>
        Sort by{' '}
        <select
          className="btn-touch"
          value={sortMode}
          onChange={(ev) => setSortMode(ev.target.value as ApprovalQueueSortMode)}
        >
          <option value="oldest_request">Oldest pending request</option>
          <option value="earliest_event">Earliest event date</option>
          <option value="highest_risk">Highest approval risk flag</option>
          <option value="precheck_worst">Lowest precheck score</option>
          <option value="submission_quality">Most checks failed</option>
        </select>
      </label>
      {err ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          {err}
        </p>
      ) : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {pending.map((e) => {
          const adv = buildDeterministicEventSummary(e)
          const pre = runApprovalPrecheck(e, { peerEvents: events })
          const failedPrecheck = pre.checks.filter((c) => !c.ok)
          const note = notes[e.event_id] ?? ''
          const cond = conditions[e.event_id] ?? ''
          const submittedAt = new Date(e.submitted_for_review_at ?? e.created_at).getTime()
          const ageHours = (clockMs - submittedAt) / 3600000
          const audit = auditById[e.event_id] ?? []
          return (
            <li
              key={e.event_id}
              style={{
                padding: '0.85rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline' }}>
                <span className="seg-cal__chip" title="Request-only — not live for volunteers until approved">
                  REQ
                </span>
                <Link to={campaignEventRecordPath(e.event_id)} style={{ fontWeight: 600 }}>
                  {e.title}
                </Link>
                <span className="subtitle">{e.event_type}</span>
                <span className="subtitle">· {new Date(e.start_at).toLocaleString()}</span>
              </div>
              <p className="subtitle" style={{ margin: '0.35rem 0' }}>
                {e.address_or_virtual?.trim() ? e.address_or_virtual : e.venue_name ?? 'Location TBD'}
              </p>
              <p className="subtitle" style={{ margin: '0.25rem 0' }}>
                Pending <strong>{ageHours.toFixed(1)}h</strong>
                {e.approval_risk_level ? (
                  <>
                    {' '}
                    · risk <strong>{e.approval_risk_level}</strong>
                  </>
                ) : null}
              </p>
              <div
                style={{
                  margin: '0.35rem 0',
                  padding: '0.5rem 0.65rem',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.88rem',
                }}
              >
                <strong>Readiness check ({pre.outcome})</strong> — {pre.readiness_precheck_score}/100 ·{' '}
                {pre.summary_line}
                <ul style={{ margin: '0.35rem 0 0 1rem' }}>
                  {failedPrecheck.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      {c.label}: {c.detail}
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ margin: '0.35rem 0', fontSize: '0.92rem' }}>{adv.summary}</p>
              {adv.bullets.length > 0 && failedPrecheck.length === 0 ? (
                <ul style={{ margin: '0.25rem 0 0.5rem 1rem', fontSize: '0.88rem' }}>
                  {adv.bullets.slice(0, 4).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              <p className="subtitle">
                Suggestion: <strong>{adv.recommendation}</strong>
              </p>
              <label className="subtitle" style={{ display: 'block', marginTop: 6 }}>
                Notes for your decision
                <textarea
                  className="btn-touch"
                  style={{ display: 'block', width: '100%', minHeight: 52, marginTop: 4 }}
                  value={note}
                  onChange={(ev) => setNotes((m) => ({ ...m, [e.event_id]: ev.target.value }))}
                />
              </label>
              <label className="subtitle" style={{ display: 'block', marginTop: 6 }}>
                Approve with conditions (optional — keeps follow-up visible)
                <textarea
                  className="btn-touch"
                  style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 4 }}
                  placeholder="Leave empty for a clean approval without residual conditions."
                  value={cond}
                  onChange={(ev) => setConditions((m) => ({ ...m, [e.event_id]: ev.target.value }))}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-touch"
                  disabled={!canAct || busyId === e.event_id}
                  onClick={() => {
                    setBusyId(e.event_id)
                    setErr(null)
                    void (async () => {
                      const c = cond.trim()
                      const { error } = await approveCampaignEventRequestRpc(
                        e.event_id,
                        note.trim() || null,
                        c || null,
                      )
                      if (error) setErr(error.message)
                      else {
                        await insertCampaignEventApprovalAudit({
                          eventId: e.event_id,
                          action: c ? 'approved_with_conditions' : 'approved',
                          notes: note.trim() || null,
                          metadata: { precheck_outcome: pre.outcome },
                        })
                      }
                      await onRefetch()
                      setBusyId(null)
                    })()
                  }}
                >
                  {cond.trim() ? 'Approve with conditions' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn-touch btn-touch--ghost"
                  disabled={!canAct || busyId === e.event_id}
                  onClick={() => {
                    setBusyId(e.event_id)
                    setErr(null)
                    void (async () => {
                      const { error } = await rejectCampaignEventRequestRpc(
                        e.event_id,
                        note.trim() ? `Revision / reject: ${note.trim()}` : null,
                      )
                      if (error) setErr(error.message)
                      else {
                        await insertCampaignEventApprovalAudit({
                          eventId: e.event_id,
                          action: 'rejected',
                          notes: note.trim() || null,
                          metadata: { precheck_outcome: pre.outcome },
                        })
                      }
                      await onRefetch()
                      setBusyId(null)
                    })()
                  }}
                >
                  Reject or send back
                </button>
                <button
                  type="button"
                  className="btn-touch btn-touch--ghost"
                  onClick={() => {
                    const next = openAuditId === e.event_id ? null : e.event_id
                    setOpenAuditId(next)
                    if (next && !auditById[e.event_id]?.length) void loadAudit(e.event_id)
                  }}
                >
                  Review history ({audit.length || '—'})
                </button>
                <Link to={campaignEventRecordPath(e.event_id)} className="btn-touch btn-touch--ghost">
                  Open record
                </Link>
              </div>
              {openAuditId === e.event_id && audit.length ? (
                <ul className="subtitle" style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.82rem' }}>
                  {audit.map((a) => (
                    <li key={a.id}>
                      {new Date(a.created_at).toLocaleString()} · {a.action}
                      {a.notes ? ` — ${a.notes}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!canAct ? (
                <p className="subtitle" role="note">
                  Your role can&apos;t approve from this screen in production — actions stay disabled.
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
