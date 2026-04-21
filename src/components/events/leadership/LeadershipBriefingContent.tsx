import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignProfile } from '../../../hooks/useProfile'
import { useCampaignEventsContext } from '../../../context/CampaignEventsContext'
import { useCampaignStaffingBulk } from '../../../hooks/useCampaignStaffingBulk'
import { useLeadershipExecutiveBriefing } from '../../../hooks/useLeadershipExecutiveBriefing'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { buildLeadershipBriefing } from '../../../lib/leadershipBriefingService'
import { emphasisFromRole } from '../../../lib/leadershipBriefingAccess'
import {
  loadLeadershipKpiPrior,
  persistLeadershipKpiPrior,
} from '../../../lib/leadershipBriefingKpiStorage'
import StaffingCoverageHeatmap from '../command/StaffingCoverageHeatmap'
import VolunteerLoadBalancerPanel from '../command/VolunteerLoadBalancerPanel'
import { buildCampaignOperatingPicture } from '../../../lib/cop/copAggregationService'
import { leadershipScope } from '../../../lib/cop/copScopes'
import CampaignOperatingPictureHealthStrip from '../../cop/CampaignOperatingPictureHealthStrip'
import { useGotvCommandLayer } from '../../../hooks/useGotvCommandLayer'
import { useVoterConversionLeadership } from '../../../hooks/useVoterConversionLeadership'
import VoterConversionFunnel from '../../voter-conversion/VoterConversionFunnel'
import ChasePriorityCard from '../../voter-conversion/ChasePriorityCard'
import BallotPlanRiskCard from '../../voter-conversion/BallotPlanRiskCard'
import { voterConversionLeadershipHeadline } from '../../../lib/voterConversionAnalytics'
import { buildCampaignMessageFramework } from '../../../lib/messageFramework'
import { useFinanceCommandLayer } from '../../../hooks/useFinanceCommandLayer'
import { useSimulationCommandLayer } from '../../../hooks/useSimulationCommandLayer'
import { financeHealthHeadline } from '../../../lib/financeAnalytics'

type Props = {
  profile: CampaignProfile | null
}

function formatPriorSnapshotAge(ms: number | null): string {
  if (ms == null) return ''
  const d = Math.floor(ms / 86400000)
  if (d >= 1) return `${d} day${d === 1 ? '' : 's'} ago`
  const h = Math.floor(ms / 3600000)
  if (h >= 1) return `${h} hour${h === 1 ? '' : 's'} ago`
  const m = Math.floor(ms / 60000)
  return `${Math.max(1, m)} min ago`
}

function metaConfidenceClass(
  c: 'high' | 'medium' | 'low',
): 'leadership-briefing-page__confidence--high' | 'leadership-briefing-page__confidence--medium' | 'leadership-briefing-page__confidence--low' {
  if (c === 'high') return 'leadership-briefing-page__confidence--high'
  if (c === 'medium') return 'leadership-briefing-page__confidence--medium'
  return 'leadership-briefing-page__confidence--low'
}

export default function LeadershipBriefingContent({ profile }: Props) {
  const { events, loading, refetch } = useCampaignEventsContext()
  const programEvents = useMemo(() => {
    return events.filter((e) => {
      const s = String(e.stage_status ?? '').toLowerCase()
      return s !== 'canceled' && s !== 'archived'
    })
  }, [events])
  const eventIds = useMemo(() => programEvents.map((e) => e.event_id), [programEvents])
  const { assignmentMap } = useCampaignStaffingBulk(eventIds)
  const { setBriefing } = useLeadershipExecutiveBriefing()

  const [asOfMs, setAsOfMs] = useState(() => Date.now())
  const priorKpiLoaded = useMemo(() => loadLeadershipKpiPrior(), [])
  const emphasis = emphasisFromRole(profile?.primary_role)
  const gotv = useGotvCommandLayer('default')
  const voterConv = useVoterConversionLeadership(profile?.primary_role)
  const financeCmd = useFinanceCommandLayer(profile?.primary_role)
  const simCmd = useSimulationCommandLayer(profile?.primary_role)
  const messageFramework = useMemo(() => buildCampaignMessageFramework(), [])

  const snapshot = useMemo(
    () =>
      buildLeadershipBriefing(programEvents, asOfMs, {
        emphasis,
        assignmentMap,
        priorKpi: priorKpiLoaded,
      }),
    [programEvents, asOfMs, assignmentMap, emphasis, priorKpiLoaded],
  )

  const campaignOperatingPicture = useMemo(
    () =>
      buildCampaignOperatingPicture({
        snapshot,
        scope: leadershipScope(),
        assignmentMapLoaded: true,
        kpiRows: null,
      }),
    [snapshot],
  )

  const snapshotRef = useRef(snapshot)

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    const id = window.setInterval(() => setAsOfMs(Date.now()), 120000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setBriefing(snapshot)
    return () => setBriefing(null)
  }, [snapshot, setBriefing])

  useEffect(() => {
    return () => {
      const s = snapshotRef.current
      persistLeadershipKpiPrior({
        active_program_count: s.counts.active_program_events,
        critical_event_count: s.counts.critical_risk_events,
        approval_pending_count: s.counts.approval_pending,
        staffing_gap_count: s.counts.staffing_incomplete_events,
        comms_risk_count: s.counts.communications_risk_events,
        postevent_gap_count: s.counts.postevent_followup_gaps,
        live_now_count: s.counts.live_now,
      })
    }
  }, [])

  const emphasisLabel =
    emphasis === 'candidate'
      ? 'Candidate'
      : emphasis === 'campaign_manager'
        ? 'Campaign manager'
        : emphasis === 'executive'
          ? 'Executive'
          : 'Operations'

  if (loading && events.length === 0) {
    return (
      <div className="leadership-briefing-page" id="leadership-briefing-root">
        <p className="event-coordinator-desk__meta" role="status">
          Loading events…
        </p>
      </div>
    )
  }

  return (
    <div className="leadership-briefing-page" id="leadership-briefing-root">
      <header className="leadership-briefing-page__hero">
        <div>
          <p className="event-coordinator-desk__eyebrow">Leadership reporting</p>
          <h1 className="event-coordinator-desk__title">Executive event briefing</h1>
          <p className="event-coordinator-desk__lede">
            {emphasisLabel} view — decision-ready signals from the same event lists as the coordinator desk, war room, and
            approvals queue. Advisory summaries; operational truth remains in event records and server RPCs.
          </p>
        </div>
        <div className="leadership-briefing-page__hero-actions">
          <button type="button" className="btn-touch" onClick={() => void refetch()}>
            Refresh data
          </button>
          <Link to="/events/war-room" className="btn-touch">
            War room
          </Link>
          <Link to="/events/review-requests" className="btn-touch">
            Approvals
          </Link>
          <Link to="/events/calendar" className="btn-touch">
            Calendar
          </Link>
          <Link to="/events" className="btn-touch">
            Coordinator desk
          </Link>
          <Link to="/events/finance-command" className="btn-touch">
            Finance command
          </Link>
          <Link to="/events/simulation-command" className="btn-touch">
            Simulation
          </Link>
        </div>
      </header>

      <CampaignOperatingPictureHealthStrip cop={campaignOperatingPicture} ready />

      {financeCmd.enabled ? (
        <section className="leadership-briefing-page__section" aria-labelledby="finance-command-heading">
          <h2 id="finance-command-heading" className="event-coordinator-desk__h2">
            Finance &amp; resource command
          </h2>
          {financeCmd.loading || financeCmd.voterConvLoading ? (
            <p className="event-coordinator-desk__meta" role="status">
              Loading finance snapshot…
            </p>
          ) : financeCmd.error ? (
            <p className="event-coordinator-desk__placeholder" role="alert">
              {financeCmd.error}
            </p>
          ) : (
            <>
              <p className="event-coordinator-desk__lede">
                {financeHealthHeadline(financeCmd.summary, financeCmd.roi)}
              </p>
              <Link to="/events/finance-command" className="btn-touch">
                Open finance command
              </Link>
            </>
          )}
        </section>
      ) : null}

      {financeCmd.enabled ? (
        <section className="leadership-briefing-page__section" aria-labelledby="simulation-command-heading">
          <h2 id="simulation-command-heading" className="event-coordinator-desk__h2">
            Strategy simulation
          </h2>
          {simCmd.dataLoading ? (
            <p className="event-coordinator-desk__meta" role="status">
              Loading simulation baseline…
            </p>
          ) : simCmd.error ? (
            <p className="event-coordinator-desk__placeholder" role="alert">
              {simCmd.error}
            </p>
          ) : (
            <>
              <p className="event-coordinator-desk__lede">
                Baseline readiness index <strong>{simCmd.builtInCompare.baseline_readiness}</strong> —{' '}
                {simCmd.builtInCompare.recommendation_line}
              </p>
              <Link to="/events/simulation-command" className="btn-touch">
                Open simulation command
              </Link>
            </>
          )}
        </section>
      ) : null}

      <section className="leadership-briefing-page__section" aria-labelledby="gotv-leadership-heading">
        <h2 id="gotv-leadership-heading" className="event-coordinator-desk__h2">
          Turnout command (polling &amp; early vote)
        </h2>
        <p className="event-coordinator-desk__lede">
          {gotv.analytics.headline} Phase: <strong>{gotv.phaseResolution.phase.replace(/_/g, ' ')}</strong>.
        </p>
        <p className="event-coordinator-desk__meta">
          Sites <strong>{gotv.analytics.total_sites}</strong> · red <strong>{gotv.analytics.red_site_count}</strong> ·
          orange <strong>{gotv.analytics.orange_site_count}</strong> · mean coverage{' '}
          <strong>{gotv.analytics.mean_coverage_pct}%</strong>
          {gotv.analytics.weakest_county_labels.length ? (
            <>
              {' '}
              · watch: {gotv.analytics.weakest_county_labels.join(', ')}
            </>
          ) : null}
        </p>
        <Link to="/events/county-ops#gotv-command" className="btn-touch">
          Open county turnout board
        </Link>
      </section>

      {voterConv.enabled ? (
        <section className="leadership-briefing-page__section" aria-labelledby="voter-conv-leadership-heading">
          <h2 id="voter-conv-leadership-heading" className="event-coordinator-desk__h2">
            Voter conversion (DB-backed)
          </h2>
          <p className="event-coordinator-desk__lede">{voterConversionLeadershipHeadline(voterConv.rollups)}</p>
          {voterConv.loading ? (
            <p className="event-coordinator-desk__meta">Loading conversion rollups…</p>
          ) : voterConv.error ? (
            <p className="event-coordinator-desk__placeholder" role="alert">
              {voterConv.error}
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              <VoterConversionFunnel rollups={voterConv.rollups} />
              <ChasePriorityCard rollups={voterConv.rollups} phaseResolution={gotv.phaseResolution} />
              <BallotPlanRiskCard rollups={voterConv.rollups} />
            </div>
          )}
          <p className="event-coordinator-desk__meta" style={{ marginTop: '0.75rem' }}>
            <Link to="/events/county-ops#voter-conversion-command" className="btn-touch btn-touch--ghost">
              County conversion command
            </Link>{' '}
            <Link to="/power5" className="btn-touch btn-touch--ghost">
              Power5 capture
            </Link>
          </p>
        </section>
      ) : null}

      <section className="leadership-briefing-page__section" aria-labelledby="message-discipline-heading">
        <h2 id="message-discipline-heading" className="event-coordinator-desk__h2">
          Field narrative &amp; message discipline
        </h2>
        <p className="event-coordinator-desk__lede">
          Canonical framework <strong>{messageFramework.version}</strong> — {messageFramework.narrative.slogan} Pillars
          stay encoded in-app; volunteers use the workbench for scripts, objections, and bounded AI drafts.
        </p>
        <ul className="event-coordinator-desk__meta" style={{ marginTop: '0.5rem' }}>
          {messageFramework.pillars.map((p) => (
            <li key={p.key}>
              <strong>{p.title}</strong> — {p.summary.slice(0, 120)}
              {p.summary.length > 120 ? '…' : ''}
            </li>
          ))}
        </ul>
        <p className="event-coordinator-desk__meta" style={{ marginTop: '0.75rem' }}>
          <Link to="/field-narrative" className="btn-touch">
            Open field narrative workbench
          </Link>
        </p>
      </section>

      <aside
        className={`leadership-briefing-page__confidence ${metaConfidenceClass(snapshot.meta.summary_confidence)}`}
        aria-label="Briefing data quality and confidence"
      >
        <p className="leadership-briefing-page__confidence-line">
          <strong>Summary confidence:</strong> {snapshot.meta.summary_confidence}
          {snapshot.meta.trend_basis === 'browser_prior_snapshot' ? (
            <>
              {' '}
              · Prior snapshot: {formatPriorSnapshotAge(snapshot.meta.prior_snapshot_age_ms)}
            </>
          ) : (
            <> · No prior KPI snapshot in this browser yet</>
          )}
        </p>
        {snapshot.meta.data_quality_notes.length > 0 ? (
          <ul className="leadership-briefing-page__confidence-notes">
            {snapshot.meta.data_quality_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="leadership-briefing-page__confidence-line leadership-briefing-page__confidence-line--muted">
            No data-quality warnings for this build.
          </p>
        )}
        <p className="leadership-briefing-page__confidence-line leadership-briefing-page__confidence-line--muted">
          Aggregate pressure index: {snapshot.counts.aggregate_pressure_score} (for trend context; lower is calmer).
        </p>
      </aside>

      <section className="leadership-briefing-page__section" aria-labelledby="exec-pulse-heading">
        <h2 id="exec-pulse-heading" className="event-coordinator-desk__h2">
          Executive pulse
        </h2>
        <div className="leadership-briefing-page__pulse-grid">
          <div
            className={`leadership-briefing-page__pulse leadership-briefing-page__pulse--${snapshot.pulse.overall_operational_status}`}
          >
            <p className="leadership-briefing-page__pulse-k">Operational status</p>
            <p className="leadership-briefing-page__pulse-v">{snapshot.pulse.overall_operational_status.replace(/_/g, ' ')}</p>
            <p className="leadership-briefing-page__pulse-sub">{snapshot.pulse.overall_line}</p>
          </div>
          <ul className="leadership-briefing-page__stat-grid" role="list">
            <li>
              <span className="leadership-briefing-page__sk">Active programs</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.active_program_events}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Live now</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.live_now}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Next 7d</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.upcoming_7d}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Critical band</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.critical_risk_events}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Approvals</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.approval_pending}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Staffing gaps</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.staffing_incomplete_events}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Comms risk</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.communications_risk_events}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Post-event gaps (total)</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.postevent_followup_gaps}</span>
            </li>
            <li>
              <span className="leadership-briefing-page__sk">Trend vs prior visit</span>
              <span className="leadership-briefing-page__sv">{snapshot.counts.trend_vs_prior}</span>
            </li>
          </ul>
        </div>
        <p className="leadership-briefing-page__note leadership-briefing-page__note--breakdown" role="status">
          Post-event breakdown: {snapshot.counts.postevent_followup_records} follow-up record(s) ·{' '}
          {snapshot.counts.postevent_closure_incomplete_digest} closure-incomplete (local digest rollup)
        </p>
        {snapshot.counts.trend_explanation ? (
          <p className="leadership-briefing-page__note">{snapshot.counts.trend_explanation}</p>
        ) : null}
        {snapshot.counts.active_program_events > 0 && snapshot.counts.critical_risk_events === 0 ? (
          <p className="leadership-briefing-page__calm" role="status">
            Critical band (war-room): none in the active list — sustain monitoring without escalation on health alone.
          </p>
        ) : null}
        <dl className="leadership-briefing-page__dl-executive">
          <div>
            <dt>Top concern</dt>
            <dd>{snapshot.pulse.top_strategic_concern ?? '—'}</dd>
          </div>
          <div>
            <dt>Strongest signal</dt>
            <dd>{snapshot.pulse.strongest_positive ?? '—'}</dd>
          </div>
          <div>
            <dt>Priority decision</dt>
            <dd>{snapshot.pulse.highest_priority_decision ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="kpi-trend-heading">
        <h2 id="kpi-trend-heading" className="event-coordinator-desk__h2">
          KPI trend hints
        </h2>
        <p className="subtitle">Compared to your last stored visit in this browser (not server history).</p>
        <ul className="leadership-briefing-page__trend-cards">
          {snapshot.kpi_trends.map((k) => (
            <li key={k.id}>
              <strong>{k.label}</strong>
              <span className={`leadership-briefing-page__trend leadership-briefing-page__trend--${k.trend}`}>
                {k.trend}
              </span>
              <span className="leadership-briefing-page__mono">{k.value_display}</span>
              {k.delta_note ? (
                <span className="leadership-briefing-page__delta-note" title="Delta vs last saved visit in this browser">
                  {k.delta_note}
                </span>
              ) : null}
              <p>{k.explanation}</p>
              {k.trend_basis === 'no_prior' ? (
                <p className="subtitle">No prior snapshot — treat trend as unknown until you revisit after a baseline save.</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="risk-board-heading">
        <h2 id="risk-board-heading" className="event-coordinator-desk__h2">
          Strategic risk board
        </h2>
        {snapshot.strategic_risks.length === 0 ? (
          <p className="event-coordinator-desk__placeholder" role="status">
            No active program events in the current campaign list.
          </p>
        ) : (
          <ul className="leadership-briefing-page__board">
            {snapshot.strategic_risks.map((r) => (
              <li key={r.event_id}>
                <div className="leadership-briefing-page__board-head">
                  <Link to={campaignEventRecordPath(r.event_id)}>{r.title}</Link>
                  <span className="leadership-briefing-page__mono">
                    P{r.war_room_score} · {r.intervention_urgency}
                  </span>
                </div>
                <p className="subtitle">
                  {r.event_type} · {new Date(r.start_at).toLocaleString()} · health {r.health_score} ({r.status_band})
                </p>
                <p>{r.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="decision-heading">
        <h2 id="decision-heading" className="event-coordinator-desk__h2">
          Approvals &amp; decisions
        </h2>
        {snapshot.decision_queue.length === 0 ? (
          <p className="event-coordinator-desk__placeholder" role="status">
            Governance queue clear — no pending volunteer/neighborhood submissions in this campaign list.
          </p>
        ) : (
          <ul className="leadership-briefing-page__decisions">
            {snapshot.decision_queue.map((d) => (
              <li key={d.event_id}>
                <div className="leadership-briefing-page__board-head">
                  <Link to={campaignEventRecordPath(d.event_id)}>{d.title}</Link>
                  <span className="leadership-briefing-page__mono">
                    Risk: {d.risk_level ?? '—'} · {d.precheck.outcome}
                  </span>
                </div>
                <p>{d.precheck.summary_line}</p>
                <p>
                  <strong>Suggested:</strong> {d.suggested_move}
                </p>
                <Link to="/events/review-requests" className="btn-touch">
                  Open approval queue
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="event-coordinator-desk__h2">
          Upcoming — leadership attention
        </h2>
        {snapshot.upcoming_critical.length === 0 ? (
          <p className="event-coordinator-desk__placeholder" role="status">
            No near-term leadership queue from the war-room urgent set — operational tempo looks manageable on this list, or
            expand filters on the coordinator desk.
          </p>
        ) : (
          <ul className="leadership-briefing-page__board">
            {snapshot.upcoming_critical.map((u) => (
              <li key={u.record.event_id}>
                <div className="leadership-briefing-page__board-head">
                  <Link to={campaignEventRecordPath(u.record.event_id)}>{u.record.title}</Link>
                  {u.leadership_attention ? <span className="leadership-briefing-page__flag">Attention</span> : null}
                </div>
                <p className="subtitle">{u.attention_reason}</p>
                <p>{u.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="leadership-briefing-page__section leadership-briefing-page__grid-two" aria-labelledby="staffing-heading">
        <div>
          <h2 id="staffing-heading" className="event-coordinator-desk__h2">
            Staffing &amp; sustainability
          </h2>
          <p>{snapshot.staffing.coverage_headline}</p>
          <ul className="leadership-briefing-page__inline-stats">
            <li>Unstaffed / at risk: {snapshot.staffing.unstaffed_or_at_risk}</li>
            <li>Partially staffed: {snapshot.staffing.partially_staffed}</li>
            <li>Owner hotspots: {snapshot.staffing.owner_hotspots}</li>
            <li>Volunteer multi-event strain: {snapshot.staffing.volunteer_multi_event_strain}</li>
          </ul>
          {snapshot.staffing.counties_weak_bench.length ? (
            <ul>
              {snapshot.staffing.counties_weak_bench.slice(0, 8).map((c) => (
                <li key={c.label}>
                  {c.label}: {c.events_at_risk} event(s)
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <h3 className="event-panel__h3">Coverage heatmap</h3>
          <StaffingCoverageHeatmap events={programEvents} assignmentMap={assignmentMap} />
          <h3 className="event-panel__h3">Volunteer load</h3>
          <VolunteerLoadBalancerPanel events={programEvents} assignmentMap={assignmentMap} />
        </div>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="comms-heading">
        <h2 id="comms-heading" className="event-coordinator-desk__h2">
          Communications &amp; media
        </h2>
        <p>{snapshot.comms.headline}</p>
        <ul className="leadership-briefing-page__inline-stats">
          <li>Near-term without cleared Mobilize path: {snapshot.comms.events_comms_not_ready}</li>
          <li>Open comms steps (digest): {snapshot.comms.digest_comms_open_steps}</li>
          <li>Mobilize drift flags: {snapshot.comms.mobilize_drift_events}</li>
        </ul>
        <p className="subtitle">{snapshot.comms.recap_backlog_hint}</p>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className="event-coordinator-desk__h2">
          Outcomes &amp; learning
        </h2>
        <p>
          Completed (≈30d): {snapshot.outcomes.completed_recent_30d} · Follow-up pending:{' '}
          {snapshot.outcomes.followup_pending}
          {snapshot.outcomes.avg_volunteer_outcome != null
            ? ` · Avg volunteer outcome (where logged): ${snapshot.outcomes.avg_volunteer_outcome}`
            : ''}
          {snapshot.outcomes.avg_voter_contact_outcome != null
            ? ` · Avg voter contact (where logged): ${snapshot.outcomes.avg_voter_contact_outcome}`
            : ''}
        </p>
        <p className="subtitle">
          Outcome sample: {snapshot.outcomes.outcome_sample.volunteer_n} volunteer field(s),{' '}
          {snapshot.outcomes.outcome_sample.voter_contact_n} voter-contact field(s) · Metrics confidence:{' '}
          {snapshot.outcomes.metrics_confidence}
        </p>
        {snapshot.outcomes.metrics_confidence_note ? (
          <p className="leadership-briefing-page__note" role="status">
            {snapshot.outcomes.metrics_confidence_note}
          </p>
        ) : null}
        <ul>
          {snapshot.outcomes.learning_lines.map((ln, i) => (
            <li key={i}>{ln}</li>
          ))}
        </ul>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="rec-heading">
        <h2 id="rec-heading" className="event-coordinator-desk__h2">
          Recommendations
        </h2>
        <ul className="leadership-briefing-page__recommendations">
          {snapshot.recommendations.map((r) => (
            <li key={r.route_hint + r.title}>
              <strong>{r.title}</strong> — {r.detail}{' '}
              <Link to={r.route_hint} className="btn-touch">
                Go
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="leadership-briefing-page__section" aria-labelledby="aj-heading">
        <h2 id="aj-heading" className="event-coordinator-desk__h2">
          Agent Jones — executive digest (deterministic)
        </h2>
        <p className="subtitle">
          Paste into Agent Jones or use when AI is offline. Server-side model receives the same structured snapshot as{' '}
          <code>event_operations_executive</code> when this page is open — advisory only.
        </p>
        <pre className="leadership-briefing-page__pre">{snapshot.agent_jones_executive_lines.join('\n')}</pre>
        <details className="leadership-briefing-page__details">
          <summary>Expanded digest</summary>
          <pre className="leadership-briefing-page__pre">{snapshot.daily_digest_expanded}</pre>
        </details>
      </section>

      <footer className="leadership-briefing-page__footer">
        <p className="subtitle">
          Drill-down from risk and decision rows into full event command, field, staffing, and communications sections using the
          event links above.
        </p>
      </footer>
    </div>
  )
}
