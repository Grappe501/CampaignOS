/**
 * Leadership / executive briefing — aggregates Today Command, War Room, approvals, and heuristics.
 * Deterministic; advisory; war-room row counts are the preferred alignment surface for critical risk.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { runApprovalPrecheck } from './approvalPrecheckEngine'
import { buildTodayCommandSnapshot } from './todayCommandService'
import { buildWarRoomSnapshot } from './multiEventWarRoomService'
import { listPendingApprovalEvents } from './eventApprovalService'
import type { LeadershipBriefingEmphasis } from './leadershipBriefingAccess'
import { countCriticalEventsFromWarRows } from './leadershipBriefingAggregates'
import type { LeadershipKpiPrior } from './leadershipBriefingKpiStorage'
import type {
  LeadershipBriefingMeta,
  LeadershipBriefingSnapshot,
  LeadershipCommsMediaSummary,
  LeadershipDecisionItem,
  LeadershipExecutiveCounts,
  LeadershipExecutivePulse,
  LeadershipKpiTrendCard,
  LeadershipOutcomesSummary,
  LeadershipRecommendation,
  LeadershipStaffingSustainability,
  LeadershipStrategicRiskRow,
  LeadershipTrendDirection,
  LeadershipUpcomingRow,
} from './leadershipBriefingSchemas'
import {
  completedNeedsFollowup,
  countyWeakBenchRollup,
  eventInNextDays,
  filterProgramEvents,
  isCommunicationsRisk,
  isHighVisibility,
  isStaffingGap,
  safeEventTitle,
} from './leadershipBriefingSelectors'
import { safeEventEndMs } from './multiEventWarRoomTime'

function trendDir(delta: number, threshold = 0.08): LeadershipTrendDirection {
  if (Math.abs(delta) < threshold) return 'stable'
  return delta > 0 ? 'improving' : 'declining'
}

function stressScore(k: {
  critical: number
  approvals: number
  staffing: number
  comms: number
}): number {
  return k.critical * 3 + k.approvals * 2 + k.staffing + k.comms
}

function buildBriefingMeta(args: {
  programEventsCount: number
  assignmentMapLoaded: boolean
  prior: LeadershipKpiPrior | null | undefined
  nowMs: number
}): LeadershipBriefingMeta {
  const notes: string[] = []
  let conf: LeadershipBriefingMeta['summary_confidence'] = 'high'
  if (args.programEventsCount === 0) {
    conf = 'low'
    notes.push('No active program events in the current campaign list.')
  }
  if (args.programEventsCount > 0 && !args.assignmentMapLoaded) {
    conf = conf === 'high' ? 'medium' : conf
    notes.push('Staffing assignment map not loaded — staffing and approval prechecks use roster fields only.')
  }
  if (!args.prior) {
    conf = conf === 'high' ? 'medium' : conf
    notes.push('No prior KPI snapshot in this browser — directional trend vs last visit is unavailable.')
  } else {
    const age = args.nowMs - args.prior.saved_at_ms
    if (age > 14 * 86400000) {
      notes.push('Prior KPI snapshot is older than 14 days — treat aggregate trend as loosely indicative.')
    }
  }
  return {
    summary_confidence: conf,
    data_quality_notes: notes.slice(0, 8),
    trend_basis: args.prior ? 'browser_prior_snapshot' : 'none',
    prior_snapshot_age_ms: args.prior ? args.nowMs - args.prior.saved_at_ms : null,
  }
}

function buildPulse(
  counts: LeadershipExecutiveCounts,
  emphasis: LeadershipBriefingEmphasis,
  ctx: { high_visibility_urgent: number },
): LeadershipExecutivePulse {
  const crit = counts.critical_risk_events
  const appr = counts.approval_pending
  const live = counts.live_now
  let overall: LeadershipExecutivePulse['overall_operational_status'] = 'strong'
  if (crit >= 3 || appr >= 5 || counts.staffing_incomplete_events >= 8) overall = 'concern'
  else if (crit >= 1 || appr >= 2 || live >= 3 || counts.staffing_incomplete_events >= 4) overall = 'watch'
  if (counts.active_program_events === 0) overall = 'no_data'

  const lines: Record<LeadershipBriefingEmphasis, string> = {
    executive: 'Executive lens: prioritize governance throughput, staffing sustainability, and calendar concentration — delegate execution.',
    campaign_manager: 'Campaign manager lens: unblock the approval queue, relieve staffing and volunteer collisions, and sequence Mobilize before hard deadlines.',
    candidate: 'Candidate lens: protect schedule equity — high-visibility and media-adjacent events first; push routine fixes to coordinators.',
    operations: 'Operations lens: track cross-event strain, owner overlaps, field closure hygiene, and volunteer sustainability.',
  }

  let topConcern: string | null =
    appr > 0
      ? `${appr} governance submission(s) awaiting decision — unblock to allow staffing and promotion work downstream.`
      : crit > 0
        ? `${crit} program(s) in critical health band on the war-room board — align owners and resources before dates slip.`
        : counts.staffing_incomplete_events > 0
          ? `${counts.staffing_incomplete_events} program(s) are not fully staffed — review heatmap and relieve duplicate assignments.`
          : null

  if (!topConcern && emphasis === 'candidate' && ctx.high_visibility_urgent > 0) {
    topConcern = `${ctx.high_visibility_urgent} high-visibility program(s) flagged urgent (war-room priority) — confirm message, staffing, and press readiness.`
  }

  const positive =
    counts.live_now > 0
      ? `${counts.live_now} program(s) in live execution — field tempo is active.`
      : counts.upcoming_7d > 0
        ? `${counts.upcoming_7d} program(s) starting within 7 days — pipeline loaded.`
        : 'No heavy near-term calendar pressure in this list.'

  let decision: string | null =
    appr > 0
      ? 'Next decision: process oldest approval requests first (governance policy permitting) to reduce downstream blockers.'
      : crit > 0
        ? 'Next decision: name single owners for critical-band programs before adding new commitments.'
        : 'Next decision: no leadership bottleneck flagged — keep coordinators empowered on routine execution.'

  if (emphasis === 'campaign_manager' && appr === 0 && crit > 0) {
    decision = 'Next decision: reassign or surge coordinator capacity toward critical-band events; avoid new intake until stable.'
  }

  const staffing =
    counts.staffing_incomplete_events > 0
      ? `Staffing: ${counts.staffing_incomplete_events} program(s) still in unstaffed, partial, or at-risk posture.`
      : null

  const comms =
    counts.communications_risk_events > 0
      ? `Communications: ${counts.communications_risk_events} near-term program(s) without cleared Mobilize publish path.`
      : null

  return {
    overall_operational_status: overall,
    overall_line: lines[emphasis],
    top_strategic_concern: topConcern,
    strongest_positive: positive,
    highest_priority_decision: decision,
    staffing_strain_headline: staffing,
    comms_bottleneck: comms,
  }
}

function buildKpiTrends(
  counts: LeadershipExecutiveCounts,
  prior: LeadershipKpiPrior | null | undefined,
): LeadershipKpiTrendCard[] {
  const cards: LeadershipKpiTrendCard[] = []

  const mk = (
    id: string,
    label: string,
    window: LeadershipKpiTrendCard['window'],
    cur: number,
    prevVal: number | undefined,
    invert: boolean,
    explain: string,
  ) => {
    const hasPrior = prevVal !== undefined
    const basis: LeadershipKpiTrendCard['trend_basis'] = hasPrior ? 'delta_vs_prior' : 'no_prior'
    let trend: LeadershipTrendDirection = 'unknown'
    let delta_note: string | null = null

    if (hasPrior) {
      const prev = prevVal as number
      const d = invert ? (prev - cur) / Math.max(1, prev) : (cur - prev) / Math.max(1, prev)
      trend = trendDir(d)
      const absDelta = cur - prev
      delta_note = `${absDelta >= 0 ? '+' : ''}${absDelta} vs prior`
    }

    const explanation = hasPrior
      ? `${explain} ${delta_note ? `(${delta_note}).` : ''}`
      : `${explain} No prior browser snapshot — directional trend not computed.`

    cards.push({
      id,
      label,
      window,
      trend,
      value_display: String(cur),
      explanation,
      trend_basis: basis,
      delta_note,
    })
  }

  mk(
    'critical',
    'Critical health events',
    'trailing_prior_visit',
    counts.critical_risk_events,
    prior?.critical_event_count,
    true,
    'War-room adjusted critical band count.',
  )
  mk(
    'approvals',
    'Pending approvals',
    'trailing_prior_visit',
    counts.approval_pending,
    prior?.approval_pending_count,
    true,
    'Governance queue (same list as review requests).',
  )
  mk(
    'staffing',
    'Staffing gap events',
    'trailing_prior_visit',
    counts.staffing_incomplete_events,
    prior?.staffing_gap_count,
    true,
    'Programs in unstaffed, partial, or at-risk staffing state.',
  )
  mk(
    'comms',
    'Comms risk (near-term)',
    'trailing_prior_visit',
    counts.communications_risk_events,
    prior?.comms_risk_count,
    true,
    'Upcoming windows without cleared Mobilize publish (excludes not_applicable).',
  )
  /** Invert like critical/gaps: more concurrent live windows usually means higher coordination load. */
  mk(
    'live',
    'Live now',
    'next_7d',
    counts.live_now,
    prior?.live_now_count,
    true,
    'Programs in live execution window (concurrent live = execution bandwidth pressure).',
  )

  return cards
}

export function buildLeadershipBriefing(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  options: {
    emphasis: LeadershipBriefingEmphasis
    assignmentMap?: Map<string, StaffingAssignmentLike[]>
    priorScores?: ReadonlyMap<string, number>
    priorKpi?: LeadershipKpiPrior | null
  },
): LeadershipBriefingSnapshot {
  const programEvents = filterProgramEvents(events)
  const assignmentMapLoaded = Boolean(options.assignmentMap && options.assignmentMap.size > 0)

  const cmd = buildTodayCommandSnapshot(programEvents, nowMs, {
    assignmentMap: options.assignmentMap,
    priorScores: options.priorScores,
  })
  const war = buildWarRoomSnapshot(programEvents, nowMs, {
    assignmentMap: options.assignmentMap,
    priorScores: options.priorScores,
  })
  const approvals = listPendingApprovalEvents(programEvents)

  const critical_risk_events = countCriticalEventsFromWarRows(war.rows)

  const live_now = war.rows.filter((r) => r.bucket === 'live_now').length
  const upcoming_7d = programEvents.filter((e) => eventInNextDays(e, nowMs, 7)).length
  const upcoming_30d = programEvents.filter((e) => eventInNextDays(e, nowMs, 30)).length
  const staffing_incomplete_events = programEvents.filter((e) => isStaffingGap(e)).length
  const communications_risk_events = programEvents.filter((e) => isCommunicationsRisk(e, nowMs)).length

  const postevent_followup_records = programEvents.filter((e) => completedNeedsFollowup(e)).length
  const postevent_closure_digest = cmd.digest.dayOfClosureIncompleteEvents ?? 0
  const postevent_followup_gaps = postevent_followup_records + postevent_closure_digest

  const prior = options.priorKpi
  const curStress = stressScore({
    critical: critical_risk_events,
    approvals: approvals.length,
    staffing: staffing_incomplete_events,
    comms: communications_risk_events,
  })
  const prevStress = prior
    ? stressScore({
        critical: prior.critical_event_count,
        approvals: prior.approval_pending_count,
        staffing: prior.staffing_gap_count,
        comms: prior.comms_risk_count,
      })
    : null

  let trend_vs_prior: LeadershipTrendDirection = 'unknown'
  let trend_explanation: string | null = null
  if (prevStress != null && prior) {
    const rel = (prevStress - curStress) / Math.max(1, prevStress)
    trend_vs_prior = trendDir(rel, 0.05)
    trend_explanation =
      trend_vs_prior === 'improving'
        ? `Aggregate pressure index fell vs your last saved visit (${curStress} now vs ${prevStress} prior; browser-stored).`
        : trend_vs_prior === 'declining'
          ? `Aggregate pressure index rose vs your last visit (${curStress} now vs ${prevStress} prior). Prioritize approvals and critical-band work.`
          : `Aggregate pressure is roughly unchanged (${curStress} vs ${prevStress}).`
  } else {
    trend_explanation =
      'Trend vs last visit requires a saved prior snapshot — leave and return, or use Refresh after baseline save on exit.'
  }

  const counts: LeadershipExecutiveCounts = {
    active_program_events: programEvents.length,
    live_now,
    upcoming_7d,
    upcoming_30d,
    critical_risk_events,
    approval_pending: approvals.length,
    staffing_incomplete_events,
    communications_risk_events,
    postevent_followup_gaps,
    postevent_followup_records,
    postevent_closure_incomplete_digest: postevent_closure_digest,
    trend_vs_prior,
    trend_explanation,
    aggregate_pressure_score: curStress,
  }

  const meta = buildBriefingMeta({
    programEventsCount: programEvents.length,
    assignmentMapLoaded,
    prior,
    nowMs,
  })

  const high_visibility_urgent = war.rows.filter((r) => {
    if (!isHighVisibility(r.item.record)) return false
    return r.intervention_urgency === 'now' || r.adjusted_status === 'CRITICAL'
  }).length

  const strategic_risks: LeadershipStrategicRiskRow[] = [...war.rows]
    .sort((a, b) => b.war_room_priority_score - a.war_room_priority_score)
    .slice(0, 12)
    .map((r) => ({
      event_id: r.item.record.event_id,
      title: safeEventTitle(r.item.record.title),
      event_type: r.item.record.event_type,
      start_at: r.item.record.start_at,
      health_score: r.adjusted_health_score,
      status_band: r.adjusted_status,
      war_room_score: r.war_room_priority_score,
      intervention_urgency: r.intervention_urgency,
      top_signal: r.intervention_reason_summary,
      recommendation: r.recommended_next_action,
    }))

  const decision_queue: LeadershipDecisionItem[] = approvals.slice(0, 16).map((e) => {
    const pre = runApprovalPrecheck(e, {
      peerEvents: programEvents,
      assignmentMap: options.assignmentMap,
    })
    const move =
      pre.outcome === 'blocked'
        ? 'Blocked — resolve readiness gaps before approval.'
        : pre.outcome === 'revise_recommended'
          ? 'Request revisions — submission not ready for publish.'
          : pre.outcome === 'pass_with_warnings'
            ? 'Approve with documented conditions and staffing follow-ups.'
            : 'Approve if governance policy satisfied.'
    return {
      event_id: e.event_id,
      title: safeEventTitle(e.title),
      risk_level: e.approval_risk_level ? String(e.approval_risk_level) : null,
      submitted_at: e.submitted_for_review_at ?? e.created_at,
      precheck: pre,
      suggested_move: move,
      attention_needed:
        String(e.approval_risk_level ?? '').toLowerCase() === 'high' || pre.outcome !== 'pass',
    }
  })

  const upcomingMap = new Map<string, LeadershipUpcomingRow>()
  for (const r of war.top_urgent) {
    const hv = isHighVisibility(r.item.record)
    const attention =
      r.intervention_urgency === 'now' ||
      r.adjusted_status === 'CRITICAL' ||
      isStaffingGap(r.item.record) ||
      (hv && isCommunicationsRisk(r.item.record, nowMs))
    upcomingMap.set(r.item.record.event_id, {
      record: r.item.record,
      health_score: r.adjusted_health_score,
      status_band: r.adjusted_status,
      leadership_attention: attention,
      attention_reason: attention
        ? r.intervention_reason_summary || 'Elevated war-room priority or visibility risk.'
        : null,
      top_risk: r.intervention_reason_summary,
      recommendation: r.recommended_next_action,
    })
  }
  const upcoming_critical = [...upcomingMap.values()].slice(0, 15)

  const countyRoll = countyWeakBenchRollup(programEvents)
  const counties_weak_bench = [...countyRoll.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([county_id, events_at_risk]) => ({
      county_id,
      label: county_id ?? 'No county',
      events_at_risk,
    }))

  const staffing: LeadershipStaffingSustainability = {
    coverage_headline:
      staffing_incomplete_events === 0
        ? 'Staffing posture: no gap states on roster fields (unstaffed / partial / at_risk) — still validate live shifts.'
        : `${staffing_incomplete_events} program(s) show staffing gap states before execution windows.`,
    unstaffed_or_at_risk: programEvents.filter((e) => {
      const s = String(e.staffing_state ?? '').toLowerCase()
      return s === 'unstaffed' || s === 'at_risk'
    }).length,
    partially_staffed: programEvents.filter((e) => String(e.staffing_state ?? '').toLowerCase() === 'partially_staffed')
      .length,
    counties_weak_bench,
    owner_hotspots: war.owner_cascade_risks.length,
    volunteer_multi_event_strain: war.volunteer_strain_risks.length,
  }

  const comms: LeadershipCommsMediaSummary = {
    headline:
      communications_risk_events === 0
        ? 'Near-term Mobilize publish path: no flagged gaps on roster for −48h…+168h windows (spot-check drift flags separately).'
        : `${communications_risk_events} near-term program(s) without published Mobilize state — promotion sequencing may be blocked.`,
    events_comms_not_ready: communications_risk_events,
    recap_backlog_hint:
      cmd.digest.commsRecapIncomplete > 0
        ? `${cmd.digest.commsRecapIncomplete} recap gap(s) in local comms workspace rollup (browser).`
        : 'No recap gaps in local comms rollup.',
    mobilize_drift_events: programEvents.filter((e) => e.mobilize_update_needed === true).length,
    digest_comms_open_steps: cmd.digest.commsOpenSteps,
  }

  const completed30 = programEvents.filter((e) => {
    const st = String(e.stage_status ?? '').toLowerCase()
    if (st !== 'completed') return false
    const end = safeEventEndMs(e)
    if (end == null) return false
    return nowMs - end < 30 * 86400000
  })
  let vSum = 0
  let vN = 0
  let cSum = 0
  let cN = 0
  for (const e of completed30) {
    if (e.volunteer_outcome != null) {
      vSum += e.volunteer_outcome
      vN++
    }
    if (e.voter_contact_outcome != null) {
      cSum += e.voter_contact_outcome
      cN++
    }
  }

  let metrics_confidence: LeadershipOutcomesSummary['metrics_confidence'] = 'sparse'
  if (vN >= 3 && cN >= 3) metrics_confidence = 'full'
  else if (vN >= 1 || cN >= 1) metrics_confidence = 'partial'

  const metrics_confidence_note =
    completed30.length === 0
      ? 'No completed events in the trailing ~30 day window in this list — outcome averages unavailable.'
      : metrics_confidence === 'sparse'
        ? 'Few outcome fields logged on completed events — do not treat any average as campaign-wide truth.'
        : metrics_confidence === 'partial'
          ? 'Averages use a small sample of completed events that have outcome fields populated.'
          : null

  const learning_lines: string[] = []
  if (staffing.owner_hotspots > 0) {
    learning_lines.push(
      `Owner overlap: ${staffing.owner_hotspots} same-owner prep collision(s) (48h band) — consider relief or delegation.`,
    )
  }
  if (staffing.volunteer_multi_event_strain > 0) {
    learning_lines.push(
      `Volunteer strain: ${staffing.volunteer_multi_event_strain} person(s) with assignments spanning multiple near-term programs.`,
    )
  }
  if (postevent_closure_digest > 0) {
    learning_lines.push(
      `Closure (browser field layer): ${postevent_closure_digest} incomplete closure signal(s) in local workspace rollup.`,
    )
  }

  const outcomes: LeadershipOutcomesSummary = {
    completed_recent_30d: completed30.length,
    followup_pending: postevent_followup_records,
    avg_volunteer_outcome: vN ? Math.round(vSum / vN) : null,
    avg_voter_contact_outcome: cN ? Math.round(cSum / cN) : null,
    outcome_sample: { volunteer_n: vN, voter_contact_n: cN },
    metrics_confidence,
    metrics_confidence_note,
    learning_lines: learning_lines.slice(0, 10),
  }

  const recommendations: LeadershipRecommendation[] = []
  if (approvals.length > 0) {
    recommendations.push({
      title: 'Governance queue',
      detail: 'Resolve pending submissions in approval order to unblock Mobilize and staffing sequencing.',
      route_hint: '/events/review-requests',
    })
  }
  if (war.rows.some((r) => r.bucket === 'live_now' || r.intervention_urgency === 'now')) {
    recommendations.push({
      title: 'War room',
      detail: 'Cross-event priority order matches coordinator interventions — use for live and near-live triage.',
      route_hint: '/events/war-room',
    })
  }
  recommendations.push({
    title: 'Calendar',
    detail: 'Verify timing, visibility segments, and capacity before adding programs.',
    route_hint: '/events/calendar',
  })
  recommendations.push({
    title: 'Coordinator desk',
    detail: 'Tactical execution and tasking — leadership page stays decision-first.',
    route_hint: '/events',
  })

  const pulse = buildPulse(counts, options.emphasis, { high_visibility_urgent: high_visibility_urgent })
  const kpi_trends = buildKpiTrends(counts, prior)

  const topRisk = strategic_risks[0]
  const daily_digest_compact = [
    pulse.top_strategic_concern,
    pulse.highest_priority_decision,
    topRisk
      ? `Top war-room priority: ${topRisk.title} (score ${topRisk.war_room_score}, ${topRisk.intervention_urgency}).`
      : 'No programs in the war-room risk board for this list.',
  ]
    .filter(Boolean)
    .join(' ')

  const daily_digest_expanded = [
    `Operational status: ${pulse.overall_operational_status}. ${pulse.strongest_positive ?? ''}`,
    `Aggregate pressure index: ${curStress} (lower is calmer; based on critical, approvals, staffing, comms-risk counts).`,
    staffing.coverage_headline,
    comms.headline,
    outcomes.metrics_confidence_note ?? '',
    learning_lines.length ? `Signals: ${learning_lines.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const agent_jones_executive_lines = [
    `Executive briefing · ${new Date(nowMs).toLocaleString()} · emphasis ${options.emphasis} · confidence ${meta.summary_confidence}.`,
    meta.data_quality_notes.length ? `Data notes: ${meta.data_quality_notes.join(' · ')}` : 'Data notes: none.',
    pulse.overall_line,
    `${counts.live_now} live · ${counts.critical_risk_events} critical (war-room band) · ${counts.approval_pending} approvals · ${counts.staffing_incomplete_events} staffing-gap roster states · ${counts.communications_risk_events} comms-risk (near-term).`,
    pulse.top_strategic_concern ?? 'No dominant single crisis — sustain tempo and monitoring.',
    `${trend_explanation ?? ''}`,
    'Advisory only. Server-side AI may extend this narrative; approvals and writes stay on governed routes and event records.',
  ]

  return {
    generated_at_ms: nowMs,
    emphasis: options.emphasis,
    meta,
    pulse,
    counts,
    kpi_trends,
    strategic_risks,
    decision_queue,
    upcoming_critical,
    staffing,
    comms,
    outcomes,
    recommendations,
    agent_jones_executive_lines,
    daily_digest_compact,
    daily_digest_expanded,
  }
}
