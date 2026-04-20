import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  buildTodayCommandSnapshot,
  groupCommandIssues,
  type CommandGroupingMode,
  type CommandPanelIssue,
  type TodayCommandEventItem,
} from '../../../lib/todayCommandService'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { fetchLatestHealthScoresForEvents } from '../../../lib/eventHealthHistoryDb'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import { buildRapidActionRecommendations } from '../../../lib/rapidActionOrchestrator'
import { buildVolunteerLoadMap } from '../../../lib/volunteerLoadBalancerService'
import { getRapidActionDefinition } from '../../../lib/rapidActionsService'

function statusClass(s: string): string {
  if (s === 'CRITICAL') return 'event-health-pill event-health-pill--critical'
  if (s === 'AT_RISK') return 'event-health-pill event-health-pill--risk'
  return 'event-health-pill event-health-pill--ready'
}

function EventRow({ item }: { item: TodayCommandEventItem }) {
  const e: CampaignCalendarEventRecord = item.record
  return (
    <li style={{ marginBottom: '0.65rem' }}>
      <span className={statusClass(item.status)} style={{ marginRight: 8 }}>
        {item.healthScore}
      </span>
      <Link to={campaignEventRecordPath(e.event_id)}>{e.title}</Link>
      <span className="subtitle" style={{ marginLeft: 6 }}>
        · {new Date(e.start_at).toLocaleString()}
      </span>
      {item.trend && item.trend !== 'stable' ? (
        <span className="subtitle" style={{ display: 'block', marginTop: 2 }}>
          Trend: {item.trend.replace(/_/g, ' ')}
        </span>
      ) : null}
      {item.gaps.length > 0 ? (
        <span className="subtitle" style={{ display: 'block', marginTop: 4 }}>
          {item.gaps[0].message}
        </span>
      ) : null}
    </li>
  )
}

function IssueRow({ issue }: { issue: CommandPanelIssue }) {
  const e = issue.record
  return (
    <li style={{ marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className={statusClass(issue.status)}>{issue.healthScore}</span>
        <Link to={`${campaignEventRecordPath(e.event_id)}#rapid-actions-command`} style={{ fontWeight: 600 }}>
          {e.title}
        </Link>
        {issue.stale ? (
          <span className="subtitle" style={{ textTransform: 'uppercase' }}>
            {issue.stale.replace(/_/g, ' ')}
          </span>
        ) : null}
      </div>
      <p className="subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.86rem' }}>
        <strong>Why here:</strong> {issue.whyHere}
      </p>
      <p className="subtitle" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>
        Owner: {issue.eventOwnerId ? 'assigned on record' : 'not assigned'} · escalate to{' '}
        {issue.escalationTarget.replace(/_/g, ' ')}
        {issue.issueAgeHours != null ? ` · age ${Math.round(issue.issueAgeHours)}h` : ''}
      </p>
    </li>
  )
}

type TodayCommandPanelProps = {
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap?: Map<string, StaffingAssignmentLike[]>
}

export default function TodayCommandPanel({ events, assignmentMap }: TodayCommandPanelProps) {
  const [digestOnly, setDigestOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<CommandGroupingMode>('urgency')
  const [priorMap, setPriorMap] = useState<Map<string, number>>(new Map())
  const [asOfMs, setAsOfMs] = useState(() => Date.now())

  const ids = useMemo(() => [...new Set(events.map((e) => e.event_id))], [events])

  useEffect(() => {
    let cancelled = false
    void fetchLatestHealthScoresForEvents(ids).then((m) => {
      if (!cancelled) {
        setPriorMap(m)
        setAsOfMs(Date.now())
      }
    })
    return () => {
      cancelled = true
    }
  }, [ids])

  const snap = useMemo(
    () =>
      buildTodayCommandSnapshot(events, asOfMs, {
        priorScores: priorMap,
        assignmentMap: assignmentMap ?? new Map(),
      }),
    [events, priorMap, asOfMs, assignmentMap],
  )

  const loadMap = useMemo(
    () => buildVolunteerLoadMap(events, assignmentMap ?? new Map(), asOfMs, 14),
    [events, assignmentMap, asOfMs],
  )

  const rapidRecs = useMemo(
    () =>
      buildRapidActionRecommendations({
        events,
        assignmentMap: assignmentMap ?? new Map(),
        loadMap,
        commandIssues: snap.issues,
        nowMs: asOfMs,
      }),
    [events, assignmentMap, loadMap, snap.issues, asOfMs],
  )

  const topIssues = useMemo(
    () => [...snap.issues].sort((a, b) => b.priority - a.priority).slice(0, 8),
    [snap.issues],
  )

  const topIssueIds = useMemo(() => new Set(topIssues.map((i) => i.id)), [topIssues])

  const restIssues = useMemo(
    () => snap.issues.filter((i) => !topIssueIds.has(i.id)),
    [snap.issues, topIssueIds],
  )

  const groupedRest = useMemo(
    () => groupCommandIssues(restIssues, groupBy),
    [restIssues, groupBy],
  )

  return (
    <section
      className="event-coordinator-desk__section event-command-today"
      aria-labelledby="today-command-heading"
      style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '1rem' }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <h2 id="today-command-heading" className="event-coordinator-desk__h2">
            Today&apos;s command panel
          </h2>
          <p className="event-coordinator-desk__meta">
            Prioritized by urgency and health. Trends compare to the last saved snapshot when
            available.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label className="subtitle" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={digestOnly}
              onChange={(ev) => setDigestOnly(ev.target.checked)}
            />
            Briefing only (hide grids)
          </label>
          <label className="subtitle">
            Group issues by{' '}
            <select
              className="btn-touch"
              value={groupBy}
              onChange={(ev) => setGroupBy(ev.target.value as CommandGroupingMode)}
            >
              <option value="urgency">Urgency</option>
              <option value="owner">Owner</option>
              <option value="county">County</option>
              <option value="event_type">Event type</option>
              <option value="issue_type">Issue type</option>
            </select>
          </label>
          <p className="event-coordinator-desk__meta" role="status">
            Updated {new Date(snap.generatedAtMs).toLocaleString()}
          </p>
        </div>
      </header>

      {!snap.empty && snap.pendingApprovals.length > 0 ? (
        <p className="seg-cal__banner" role="status" style={{ marginBottom: '0.75rem' }}>
          <strong>{snap.pendingApprovals.length}</strong> event request(s) awaiting approval — see the{' '}
          <a href="#event-approval-queue-heading">approval queue</a> below.
        </p>
      ) : null}

      {rapidRecs.length > 0 ? (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.65rem 0.75rem',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.15)',
          }}
          aria-label="Recommended rapid actions"
        >
          <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.92rem', margin: 0 }}>
            Recommended rapid actions
          </h3>
          <p className="subtitle" style={{ margin: '0.25rem 0 0.35rem', fontSize: '0.8rem' }}>
            Deterministic suggestions tied to the Rapid Actions catalog — open the event, then run the
            matching action from the bar above.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {rapidRecs.slice(0, 6).map((r) => {
              const def = getRapidActionDefinition(r.recommended_action_type)
              return (
                <li key={r.id} style={{ marginBottom: 6 }}>
                  <span
                    className="subtitle"
                    style={{ textTransform: 'uppercase', fontSize: '0.72rem', marginRight: 6 }}
                  >
                    {r.urgency}
                  </span>
                  {r.event_id ? (
                    <Link to={campaignEventRecordPath(r.event_id)} style={{ fontWeight: 600 }}>
                      {r.event_title ?? 'Event'}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600 }}>Program</span>
                  )}
                  <span className="subtitle" style={{ marginLeft: 6 }}>
                    → {def?.label ?? r.recommended_action_type}: {r.reason_summary}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {digestOnly ? (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.95rem', marginBottom: 12 }}>{snap.digest.briefingConcise}</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.92 }}>{snap.digest.briefingFull}</p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            <div>
              <dt className="subtitle">Today</dt>
              <dd style={{ margin: 0 }}>{snap.digest.eventsTodayCount}</dd>
            </div>
            <div>
              <dt className="subtitle">72h window</dt>
              <dd style={{ margin: 0 }}>{snap.digest.eventsNext72hCount}</dd>
            </div>
            <div>
              <dt className="subtitle">Critical</dt>
              <dd style={{ margin: 0 }}>{snap.digest.criticalIssuesCount}</dd>
            </div>
            <div>
              <dt className="subtitle">Approvals</dt>
              <dd style={{ margin: 0 }}>{snap.digest.pendingApprovalsCount}</dd>
            </div>
          </dl>
          {snap.digest.topRiskEvents.length ? (
            <>
              <h4 className="subtitle" style={{ margin: '0.75rem 0 0.35rem' }}>
                Top risk
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {snap.digest.topRiskEvents.map((r) => (
                  <li key={r.eventId}>
                    <Link to={campaignEventRecordPath(r.eventId)}>{r.title}</Link> · {r.score} — {r.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {snap.digest.fastestWins.length ? (
            <>
              <h4 className="subtitle" style={{ margin: '0.75rem 0 0.35rem' }}>
                Fastest wins
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {snap.digest.fastestWins.map((w) => (
                  <li key={w.eventId}>
                    <Link to={campaignEventRecordPath(w.eventId)}>{w.title}</Link> — {w.action}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {snap.empty ? (
        <p className="event-coordinator-desk__placeholder" role="status">
          No events in the current campaign list. Create or sync events to populate operational priorities.
        </p>
      ) : digestOnly ? null : (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem 1.25rem',
              marginTop: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
            role="status"
            aria-label="Snapshot counts"
          >
            <span className="subtitle">
              Today <strong>{snap.digest.eventsTodayCount}</strong>
            </span>
            <span className="subtitle">
              72h (attention) <strong>{snap.digest.eventsNext72hCount}</strong>
            </span>
            <span className="subtitle">
              Critical <strong>{snap.digest.criticalIssuesCount}</strong>
            </span>
            <span className="subtitle">
              Approvals <strong>{snap.digest.pendingApprovalsCount}</strong>
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              marginTop: '0.75rem',
            }}
          >
            <div>
              <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem' }}>
                Events today
              </h3>
              {snap.eventsToday.length === 0 ? (
                <p className="event-coordinator-desk__meta">Nothing scheduled for today.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {snap.eventsToday.map((it) => (
                    <EventRow key={it.record.event_id} item={it} />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem' }}>
                Next 72 hours (attention)
              </h3>
              {snap.next72Hours.length === 0 ? (
                <p className="event-coordinator-desk__meta">No at-risk signals in this window.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {snap.next72Hours.slice(0, 10).map((it) => (
                    <EventRow key={`${it.record.event_id}-72`} item={it} />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem' }}>
                Critical issues
              </h3>
              {snap.criticalIssues.length === 0 ? (
                <p className="event-coordinator-desk__meta">No critical leadership flags right now.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {snap.criticalIssues.slice(0, 12).map((it) => (
                    <EventRow key={`${it.record.event_id}-crit`} item={it} />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem' }}>
                Newly declining (vs snapshot)
              </h3>
              {snap.newlyDeclining.length === 0 ? (
                <p className="event-coordinator-desk__meta">No trend downgrades detected vs last snapshot.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {snap.newlyDeclining.map((it) => (
                    <EventRow key={`${it.record.event_id}-dec`} item={it} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {topIssues.length > 0 ? (
            <div style={{ marginTop: '1.1rem' }}>
              <h3 className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem' }}>
                Top issues right now
              </h3>
              <p className="event-coordinator-desk__meta">
                Highest priority signals first ({topIssues.length} of {snap.issues.length}).
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {topIssues.map((iss) => (
                  <IssueRow key={iss.id} issue={iss} />
                ))}
              </ul>
            </div>
          ) : null}

          {restIssues.length > 0 ? (
            <details className="event-coordinator-desk__details" style={{ marginTop: '0.85rem' }}>
              <summary className="event-coordinator-desk__h3" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>
                More issues by group ({restIssues.length} more)
              </summary>
              <p className="event-coordinator-desk__meta" style={{ marginTop: 8 }}>
                Grouped by {groupBy.replace(/_/g, ' ')}. “Stale” flags aging items or missing ownership.
              </p>
              {[...groupedRest.entries()].map(([key, list]) => (
                <div key={key} style={{ marginBottom: '0.75rem' }}>
                  <p className="subtitle" style={{ fontWeight: 600 }}>
                    {key}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {list.slice(0, 14).map((iss) => (
                      <IssueRow key={`${iss.id}-grp`} issue={iss} />
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          ) : null}
        </>
      )}
    </section>
  )
}
