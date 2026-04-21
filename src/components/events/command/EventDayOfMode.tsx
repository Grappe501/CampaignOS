import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import type {
  EventDayOfWorkspace,
  FieldCheckInStatus,
  FieldIssueCategory,
  FieldIssueSeverity,
  RunOfShowSegmentStatus,
  DayOfPhaseState,
} from '../../../lib/eventDayOfSchemas'
import {
  buildInitialDayOfWorkspace,
  buildDayOfBriefingLines,
  currentAndNextSegment,
  effectiveDayOfPhase,
  mergeAssignmentsIntoCheckins,
  scheduleSegmentsForEventStart,
  withSegmentStatus,
  withCheckInStatus,
  addFieldIssue,
  resolveFieldIssue,
  withClosureItem,
  withPhaseOverride,
  withSignupAck,
  withDebriefNotes,
} from '../../../lib/eventDayOfExecutionService'
import { evaluateFieldClosureRisk } from '../../../lib/eventDayOfClosureSignals'
import { loadEventDayWorkspace, saveEventDayWorkspace } from '../../../lib/eventDayOfLocalStorage'
import { canMutateFieldExecution } from '../../../lib/eventFieldExecutionPermissions'
import type { CampaignProfile } from '../../../hooks/useProfile'
import type { EventHealthStatusBand } from '../../../lib/eventHealthScoreService'
import { campaignEventRecordSectionPath } from '../../../lib/campaignEventSystem'
import {
  formatFieldCheckInStatus,
  formatFieldIssueStatus,
  formatRunOfShowSegmentStatus,
} from '../../../lib/eventDayOfUiLabels'

type Props = {
  record: CampaignCalendarEventRecord
  effectiveType: CampaignEventTypeKey
  profile: CampaignProfile | null
  staffingAssignments: readonly StaffingAssignmentLike[]
  healthScore: number
  healthStatus: EventHealthStatusBand
  gapMessages: readonly string[]
}

const PHASES: DayOfPhaseState[] = [
  'pre_open',
  'setup',
  'live',
  'winding_down',
  'teardown',
  'debrief_ready',
]

const ROS_STATUS_ORDER: readonly RunOfShowSegmentStatus[] = ['pending', 'active', 'complete', 'delayed', 'skipped']

const CHECK_IN_STATUS_ORDER: readonly FieldCheckInStatus[] = ['expected', 'checked_in', 'late', 'absent', 'backup_active']

export default function EventDayOfMode({
  record,
  effectiveType,
  profile,
  staffingAssignments,
  healthScore,
  healthStatus,
  gapMessages,
}: Props) {
  void effectiveType
  const canEdit = useMemo(() => canMutateFieldExecution(profile), [profile])
  const [ws, setWs] = useState<EventDayOfWorkspace | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDetail, setIssueDetail] = useState('')
  const [issueCat, setIssueCat] = useState<FieldIssueCategory>('logistics')
  const [issueSev, setIssueSev] = useState<FieldIssueSeverity>('medium')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    const existing = loadEventDayWorkspace(record.event_id)
    let base = existing ?? buildInitialDayOfWorkspace(record, staffingAssignments)
    base = mergeAssignmentsIntoCheckins(base, staffingAssignments)
    const segs = scheduleSegmentsForEventStart(base.segments, record.start_at)
    setWs({ ...base, segments: segs })
    // Intentionally narrow: full `record` refetch should not wipe field workspace; id + start + roster drive sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync keys above
  }, [record.event_id, record.start_at, staffingAssignments])

  const persist = useCallback((updater: (w: EventDayOfWorkspace) => EventDayOfWorkspace) => {
    setWs((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      const ok = saveEventDayWorkspace(next)
      window.setTimeout(() => {
        setSaveError(
          ok ? null : 'Could not save to browser storage (often quota). Retry after clearing space or export notes elsewhere.',
        )
      }, 0)
      return next
    })
  }, [])

  const phase = ws ? effectiveDayOfPhase(ws, record, nowMs) : 'pre_open'
  const { current: curSeg, next: nextSeg } = useMemo(
    () => (ws ? currentAndNextSegment(ws.segments, nowMs) : { current: null, next: null }),
    [ws, nowMs],
  )

  const briefingLines = useMemo(() => {
    if (!ws) return []
    return buildDayOfBriefingLines({ record, ws, phase })
  }, [record, ws, phase])

  const closureRisk = useMemo(() => (ws ? evaluateFieldClosureRisk(ws) : null), [ws])

  const startTimeMissing = useMemo(() => {
    const s = new Date(record.start_at).getTime()
    return Number.isNaN(s)
  }, [record.start_at])

  const locationFallbackLines = useMemo(() => {
    const lines: { label: string; href: string; external?: boolean }[] = []
    if (record.address_or_virtual?.trim()) {
      lines.push({
        label: 'Open map for address',
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.address_or_virtual.trim())}`,
        external: true,
      })
    } else if (record.postal_code?.trim()) {
      lines.push({
        label: 'Open map for ZIP / area',
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.postal_code.trim())}`,
        external: true,
      })
    }
    if (record.virtual_url?.trim()) {
      lines.push({ label: 'Virtual / join link', href: record.virtual_url.trim(), external: true })
    }
    return lines
  }, [record.address_or_virtual, record.postal_code, record.virtual_url])

  const recentAudit = useMemo(() => (ws ? [...ws.audit].slice(-8) : []), [ws])

  if (!ws) {
    return (
      <section className="event-coordinator-desk__section event-day-of-mode" id="event-record-field">
        <p className="event-coordinator-desk__meta" role="status">
          Loading field execution…
        </p>
      </section>
    )
  }

  const healthClass =
    healthStatus === 'CRITICAL'
      ? 'event-day-of-mode__health--risk'
      : healthStatus === 'AT_RISK'
        ? 'event-day-of-mode__health--warn'
        : 'event-day-of-mode__health--ok'

  return (
    <section className="event-coordinator-desk__section event-day-of-mode" id="event-record-field">
      <header className="event-day-of-mode__head">
        <div>
          <p className="event-coordinator-desk__eyebrow">Field execution</p>
          <h2 className="event-coordinator-desk__h2">Day-of operations</h2>
          <p className="event-coordinator-desk__meta">
            Onsite control surface — data saves to <strong>browser storage</strong> (v1). Messaging actions use the same
            delivery rules as comms. Jump:{' '}
            <Link to={campaignEventRecordSectionPath(record.event_id, 'communications')}>Comms &amp; media</Link>
            {' · '}
            <Link to={`/ops/signup-sheets?eventId=${encodeURIComponent(record.event_id)}`}>Signup sheets</Link>
            {' · '}
            <Link to="/events">Command desk</Link>.
          </p>
        </div>
        <div className={`event-day-of-mode__health ${healthClass}`} role="status">
          <span className="event-day-of-mode__health-k">Health</span>
          <span className="event-day-of-mode__health-v">
            {healthScore} · {healthStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      {saveError ? (
        <p className="seg-cal__banner seg-cal__banner--warn" role="alert">
          {saveError}{' '}
          <button type="button" className="event-coordinator-desk__btn" onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      {startTimeMissing ? (
        <p className="seg-cal__banner seg-cal__banner--warn" role="status">
          Event start time is missing or invalid — run-of-show times cannot align. Set start time on the event overview.
        </p>
      ) : null}

      {!canEdit ? (
        <p className="seg-cal__banner" role="status">
          View-only — coordinator roles can update run-of-show, check-in, and issues.
        </p>
      ) : null}

      <p className="event-coordinator-desk__meta" role="status">
        Schedule rows below stay aligned to the event start time when staffing or start time updates (local sync).
      </p>

      <div className="event-day-of-mode__toolbar">
        <label className="event-day-of-mode__phase">
          Phase override
          <select
            className="btn-touch"
            value={ws.phase_override ?? ''}
            disabled={!canEdit}
            onChange={(e) => {
              const v = e.target.value as DayOfPhaseState | ''
              persist((w) => withPhaseOverride(w, v === '' ? null : v))
            }}
          >
            <option value="">Clock-based ({phase.replace(/_/g, ' ')})</option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="event-day-of-mode__grid">
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Live timeline</h3>
          <p className="event-panel__body">
            <strong>Current segment:</strong> {curSeg ? curSeg.label : '—'}
          </p>
          <p className="event-panel__body">
            <strong>Up next:</strong> {nextSeg ? nextSeg.label : '—'}
          </p>
          {gapMessages.length ? (
            <ul className="event-day-of-mode__alerts">
              {gapMessages.map((g, i) => (
                <li key={`gap-${i}`}>{g}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Run of show</h3>
          <ul className="event-day-of-mode__ros">
            {ws.segments.map((s) => (
              <li key={s.id}>
                <div className="event-day-of-mode__ros-row">
                  <span>{s.label}</span>
                  <span className="event-day-of-mode__mono">
                    {s.scheduled_start_at
                      ? new Date(s.scheduled_start_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
                <select
                  className="btn-touch"
                  disabled={!canEdit}
                  value={s.status}
                  onChange={(e) => {
                    const st = e.target.value as RunOfShowSegmentStatus
                    persist((w) => withSegmentStatus(w, s.id, st))
                  }}
                  aria-label={`${s.label} status`}
                >
                  {ROS_STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {formatRunOfShowSegmentStatus(st)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Check-in (staffing reality)</h3>
          {ws.check_ins.length === 0 ? (
            <p className="event-panel__body" role="status">
              No staffing assignments on this event yet — add roles on the staffing surface to drive check-in rows. Until then,
              this panel stays intentionally empty.
            </p>
          ) : (
            <ul className="event-day-of-mode__ci">
              {ws.check_ins.map((c) => (
                <li key={c.id}>
                  <strong>{c.label}</strong>
                  <select
                    className="btn-touch"
                    disabled={!canEdit}
                    value={c.status}
                    onChange={(e) => {
                      const st = e.target.value as FieldCheckInStatus
                      persist((w) => withCheckInStatus(w, c.id, st))
                    }}
                    aria-label={`${c.label} check-in`}
                  >
                    {CHECK_IN_STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>
                        {formatFieldCheckInStatus(st)}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="event-day-of-mode__card event-day-of-mode__card--wide">
        <h3 className="event-panel__h3">Field issue log</h3>
        <form
          className="event-day-of-mode__issue-form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canEdit || !issueTitle.trim()) return
            persist((w) =>
              addFieldIssue(w, {
                category: issueCat,
                severity: issueSev,
                title: issueTitle,
                detail: issueDetail,
                linked_segment_id: curSeg?.id ?? null,
              }),
            )
            setIssueTitle('')
            setIssueDetail('')
          }}
        >
          <input
            type="text"
            className="event-day-of-mode__input"
            name="field_issue_title"
            placeholder="Short title (Enter to submit)"
            value={issueTitle}
            disabled={!canEdit}
            onChange={(e) => setIssueTitle(e.target.value)}
          />
          <textarea
            className="event-day-of-mode__textarea"
            name="field_issue_detail"
            placeholder="What happened, what's blocked, who's needed"
            rows={2}
            value={issueDetail}
            disabled={!canEdit}
            onChange={(e) => setIssueDetail(e.target.value)}
          />
          <div className="event-day-of-mode__issue-actions">
            <select
              className="btn-touch"
              value={issueCat}
              disabled={!canEdit}
              onChange={(e) => setIssueCat(e.target.value as FieldIssueCategory)}
              aria-label="Issue category"
            >
              <option value="staffing">Staffing</option>
              <option value="logistics">Logistics</option>
              <option value="venue">Venue</option>
              <option value="timing">Timing</option>
              <option value="communications">Communications</option>
              <option value="checkin">Check-in</option>
              <option value="weather">Weather</option>
              <option value="media">Media</option>
              <option value="escalation">Escalation</option>
              <option value="other">Other</option>
            </select>
            <select
              className="btn-touch"
              value={issueSev}
              disabled={!canEdit}
              onChange={(e) => setIssueSev(e.target.value as FieldIssueSeverity)}
              aria-label="Issue severity"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button type="submit" className="event-coordinator-desk__btn" disabled={!canEdit || !issueTitle.trim()}>
              Log issue
            </button>
          </div>
        </form>
        {ws.issues.length === 0 ? (
          <p className="event-panel__body" role="status">
            No field issues logged — clear state. Log anything that affects safety, timing, attendees, or assets.
          </p>
        ) : (
          <ul className="event-day-of-mode__issues">
            {ws.issues.map((i) => (
              <li key={i.id}>
                <span className="event-day-of-mode__badge">{i.severity}</span> <strong>{i.title}</strong> —{' '}
                {formatFieldIssueStatus(i.status)}
                <div className="subtitle">{i.detail}</div>
                {i.status !== 'resolved' && canEdit ? (
                  <button
                    type="button"
                    className="event-coordinator-desk__btn"
                    onClick={() => persist((w) => resolveFieldIssue(w, i.id))}
                  >
                    Mark resolved
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="event-day-of-mode__grid">
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Onsite communications</h3>
          <p className="event-panel__body">
            Urgent sends and delivery audit trail live in the coordinator communications layer (same permission gates). Open the{' '}
            <Link to={campaignEventRecordSectionPath(record.event_id, 'communications')}>communications center</Link> to send and
            confirm receipts.
          </p>
        </div>
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Media capture</h3>
          <p className="event-panel__body">
            Upload photos, clips, and press-ready assets in the communications center media library so closure and debrief match
            what the field actually captured.{' '}
            <Link to={`${campaignEventRecordSectionPath(record.event_id, 'communications')}#event-record-communications`}>
              Open media workflow
            </Link>
          </p>
        </div>
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Signup handoff</h3>
          <label className="subtitle">
            <input
              type="checkbox"
              checked={ws.signup_sheet_handoff_ack}
              disabled={!canEdit}
              onChange={(e) => persist((w) => withSignupAck(w, e.target.checked))}
            />{' '}
            Sheets collected or ingestion queued
          </label>
        </div>
        <div className="event-day-of-mode__card">
          <h3 className="event-panel__h3">Location context</h3>
          <p className="event-panel__body">
            {record.venue_name ? <>{record.venue_name}</> : <>Venue TBD — set on overview.</>}
            <br />
            {record.address_or_virtual ? <>{record.address_or_virtual}</> : <>No street address on file.</>}
          </p>
          {locationFallbackLines.length ? (
            <ul className="event-day-of-mode__loc-links">
              {locationFallbackLines.map((x) => (
                <li key={x.href}>
                  <a href={x.href} target="_blank" rel="noreferrer">
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : !record.address_or_virtual?.trim() && !record.postal_code?.trim() && !record.virtual_url?.trim() ? (
            <p className="event-coordinator-desk__meta" role="status">
              Map links appear when an address, postal code, or virtual URL exists on the event record.
            </p>
          ) : null}
          {record.public_location_notes ? (
            <p className="subtitle">Notes: {record.public_location_notes}</p>
          ) : null}
        </div>
      </div>

      <div className="event-day-of-mode__card event-day-of-mode__card--wide">
        <h3 className="event-panel__h3">Closure + debrief handoff</h3>
        {closureRisk && closureRisk.integrityWarnings.length > 0 ? (
          <ul className="event-day-of-mode__alerts" role="status">
            {closureRisk.integrityWarnings.map((w, i) => (
              <li key={`cl-warn-${i}`}>{w}</li>
            ))}
          </ul>
        ) : null}
        {closureRisk && closureRisk.missingClosureLabels.length > 0 ? (
          <p className="event-coordinator-desk__meta" role="status">
            Still open: {closureRisk.missingClosureLabels.slice(0, 6).join('; ')}
            {closureRisk.missingClosureLabels.length > 6 ? '…' : ''}
          </p>
        ) : null}
        <ul className="event-day-of-mode__closure">
          {ws.closure.items.map((it) => (
            <li key={it.id}>
              <label>
                <input
                  type="checkbox"
                  checked={it.done}
                  disabled={!canEdit}
                  onChange={(e) => persist((w) => withClosureItem(w, it.id, e.target.checked))}
                />{' '}
                {it.label}
              </label>
            </li>
          ))}
        </ul>
        <label className="subtitle" style={{ display: 'block', marginTop: 8 }}>
          Debrief notes
          <textarea
            className="event-day-of-mode__textarea"
            rows={3}
            value={ws.closure.debrief_notes}
            disabled={!canEdit}
            onChange={(e) => persist((w) => withDebriefNotes(w, e.target.value))}
          />
        </label>
      </div>

      <div className="event-day-of-mode__card event-day-of-mode__card--wide">
        <h3 className="event-panel__h3">Recent field actions</h3>
        <p className="event-coordinator-desk__meta">
          Browser-local audit trail (up to 8 most recent). Coordinators can paste into tickets or CRM notes.
        </p>
        {recentAudit.length === 0 ? (
          <p className="event-panel__body" role="status">No actions recorded yet — changes to run-of-show, check-in, issues, and
            closure appear here.</p>
        ) : (
          <ul className="event-day-of-mode__audit">
            {recentAudit.map((a, idx) => (
              <li key={`${a.at}-${idx}`}>
                <span className="event-day-of-mode__mono">{new Date(a.at).toLocaleString()}</span> · {a.action}: {a.detail}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="event-day-of-mode__card event-day-of-mode__card--wide">
        <h3 className="event-panel__h3">Day-of briefing (paste)</h3>
        <pre className="event-day-of-mode__brief">{briefingLines.join('\n')}</pre>
        <p className="event-coordinator-desk__meta">
          Deterministic summary — usable if AI is offline. Copy into Agent Jones as extra context; automated layers stay server-side
          and advisory.
        </p>
      </div>
    </section>
  )
}
