import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'
import type {
  AgentJonesAreaScore,
  AgentJonesCalendarSummary,
  AgentJonesCampaignManagerCommand,
  AgentJonesCampaignPhaseSummary,
  AgentJonesCountdownSummary,
  AgentJonesCoverageSummary,
  AgentJonesDeskRoutingSummary,
  AgentJonesEscalationSummary,
  AgentJonesEventDeploymentSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesGotvSummary,
  AgentJonesInterventionSequence,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesSegmentationSummary,
  AgentJonesTradeoffSummary,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole } from './agentJonesRoleDesk'

function stripSessionProxySuffix(label: string): string {
  return label.replace(/\s*\(visible session[^)]*\)\s*$/i, '').trim() || label
}

function buildCoverageCalendarPressureLine(input: {
  coverage: AgentJonesCoverageSummary | null
  calendarSummary: AgentJonesCalendarSummary | null
}): string | null {
  const parts: string[] = []
  const cov = input.coverage
  if (cov?.readiness_headline) {
    parts.push(cov.readiness_headline.slice(0, 200))
  }
  if (cov?.event_staffing_pressure_count != null && cov.event_staffing_pressure_count > 0) {
    parts.push(
      `Visible assignment staffing pressure count: ${cov.event_staffing_pressure_count} (boards only).`,
    )
  }
  const cal = input.calendarSummary
  if (cal?.governance_warning_count != null && cal.governance_warning_count > 0) {
    parts.push(
      `Timing layer: ${cal.governance_warning_count} governance/escalation signal(s) in this session.`,
    )
  } else if (cal?.upcoming_count_7d != null && cal.upcoming_count_7d > 0) {
    parts.push(
      `~7d assignment timing items (visible): ${cal.upcoming_count_7d} — not a full org calendar.`,
    )
  }
  if (!parts.length) return null
  return parts.join(' ')
}

function pickIntervention(input: {
  escalation: AgentJonesEscalationSummary | null
  field: AgentJonesFieldIntelligenceSummary
  snap: AgentJonesLeadershipSnapshotContext | null
  coverageLine: string | null
}): string | null {
  const ex = input.escalation
  if (ex && (ex.cross_desk_issue_count ?? 0) >= 2) {
    return 'Sequence one cross-desk escalation route to completion before adding geographic or program scope.'
  }
  if (input.field.top_field_risks?.[0]) {
    return `Clear the top visible field risk first, then re-check supervised board and KPI strip.`
  }
  if (input.snap?.weakest_kpi_name && (input.snap.weakest_kpi_pct_of_target ?? 0) < 50) {
    return `Double down on “${input.snap.weakest_kpi_name}” with coordinator-visible execution before new turf asks.`
  }
  if (input.coverageLine) {
    return 'Resolve visible coverage/staffing pressure on the coordinator surface before promising outcomes by area.'
  }
  if (ex?.escalation_routes?.[0]) {
    return `Work ${ex.escalation_routes[0].slice(0, 160)}`
  }
  return null
}

export function buildAgentJonesCampaignManagerCommand(input: {
  role: AgentJonesNormalizedRole
  field: AgentJonesFieldIntelligenceSummary
  geo: AgentJonesGeoIntelligence | null
  escalation: AgentJonesEscalationSummary | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  coverage: AgentJonesCoverageSummary | null
  calendarSummary: AgentJonesCalendarSummary | null
}): AgentJonesCampaignManagerCommand | null {
  if (input.role !== 'campaign_manager' && input.role !== 'assistant_campaign_manager') {
    return null
  }

  const lines: string[] = []
  lines.push(
    'CM command mode: supervised backlog, KPI weakest lane, roster exceptions, then cross-desk sequencing — volume second.',
  )

  const snap = input.leadershipSnapshot
  let opportunity: string | null = null
  if (snap?.weakest_kpi_name && snap.weakest_kpi_pct_of_target != null) {
    opportunity = `Largest visible lift: shore up “${snap.weakest_kpi_name}” (${snap.weakest_kpi_pct_of_target}% of target) with honest board data.`
    lines.push(opportunity)
  } else if (snap && snap.active_kpi_count > 0 && snap.kpis_below_half_target === 0) {
    opportunity =
      'KPI strip looks balanced in this window — hold execution rhythm and protect captains from scope creep.'
    lines.push(opportunity)
  }

  let risk: string | null = input.field.top_field_risks?.[0] ?? null
  if (risk) {
    lines.push(`Top execution risk (visible): ${risk}`)
  } else if (input.escalation && (input.escalation.cross_desk_issue_count ?? 0) >= 2) {
    risk = 'Cross-desk pressure — sequencing matters more than volume.'
    lines.push(risk)
  }

  const riskAreaRaw = input.field.weakest_area_label?.trim() ?? null
  const oppAreaRaw = input.field.strongest_area_label?.trim() ?? null
  const top_risk_area_hint = riskAreaRaw ? stripSessionProxySuffix(riskAreaRaw) : null
  const top_opportunity_area_hint = oppAreaRaw ? stripSessionProxySuffix(oppAreaRaw) : null

  if (input.geo?.primary_area_label) {
    lines.push(
      `Geographic anchor in session: ${input.geo.primary_area_label} — do not generalize to unwatched turf.`,
    )
  }

  const coverage_task_pressure_line = buildCoverageCalendarPressureLine({
    coverage: input.coverage,
    calendarSummary: input.calendarSummary,
  })
  if (coverage_task_pressure_line) {
    lines.push(`Coverage & timing (visible): ${coverage_task_pressure_line.slice(0, 280)}`)
  }

  const field_readiness_framing = input.field.area_readiness_summary
    ? input.field.area_readiness_summary.slice(0, 260)
    : null
  if (field_readiness_framing) {
    lines.push(`Field readiness (honest limits): ${field_readiness_framing}`)
  }

  const cross =
    input.escalation?.top_escalation_headline ??
    (input.escalation?.escalation_routes?.length
      ? `Escalation paths open: ${input.escalation.escalation_routes[0]}`
      : null)
  if (cross) {
    lines.push(`Cross-desk: ${cross}`)
  }

  const recommended_intervention = pickIntervention({
    escalation: input.escalation,
    field: input.field,
    snap,
    coverageLine: coverage_task_pressure_line,
  })
  if (recommended_intervention) {
    lines.push(`Intervention: ${recommended_intervention}`)
  }

  return {
    command_lines: lines.slice(0, 8),
    top_opportunity_hint: opportunity,
    top_risk_hint: risk,
    cross_desk_note: cross,
    top_risk_area_hint,
    top_opportunity_area_hint,
    recommended_intervention,
    field_readiness_framing,
    coverage_task_pressure_line,
  }
}

function modeWord(m: string): string {
  return m.replace(/_/g, ' ')
}

/**
 * v3.3 Pass 2 — layer comparative ranking, segmentation posture, and event deployment onto CM/ACM command.
 */
export function enrichCampaignManagerCommandPass2(
  base: AgentJonesCampaignManagerCommand,
  input: {
    area_ranking?: AgentJonesAreaScore[]
    segmentation_summary?: AgentJonesSegmentationSummary
    event_deployment?: AgentJonesEventDeploymentSummary
    campaign_phase?: AgentJonesCampaignPhaseSummary | null
    countdown_summary?: AgentJonesCountdownSummary | null
    gotv_summary?: AgentJonesGotvSummary | null
    tradeoff_summary?: AgentJonesTradeoffSummary | null
    intervention_sequence?: AgentJonesInterventionSequence | null
    desk_routing?: AgentJonesDeskRoutingSummary | null
  },
): AgentJonesCampaignManagerCommand {
  const lines = [...base.command_lines]
  let recommended_area_focus: string | null = null
  let segmentation_posture_line: string | null = null
  let event_deployment_line: string | null = null

  const ranked = input.area_ranking?.length
    ? sortAgentJonesAreaRanking(input.area_ranking)
    : []
  const top = ranked[0]
  if (top) {
    const head = (top.recommendation_headline ?? '').trim().slice(0, 100)
    recommended_area_focus = `${top.area_label} (${top.priority_band}, ${top.area_type})${head ? ` — ${head}` : ''}`
    if (
      top.priority_band === 'critical' ||
      top.priority_band === 'high' ||
      top.priority_band === 'watch'
    ) {
      lines.push(`HQ area focus (v3.3 rank): ${recommended_area_focus}`)
    }
  }

  const seg = input.segmentation_summary
  if (seg?.primary_mode) {
    const sec = seg.secondary_mode ? `; secondarily ${modeWord(seg.secondary_mode)}` : ''
    segmentation_posture_line = `Turnout/persuasion posture (operational heuristic): emphasize ${modeWord(seg.primary_mode)}${sec} — not voter-file truth.`
    lines.push(segmentation_posture_line)
  }
  if (seg?.turnout_persuasion_balance?.trim()) {
    lines.push(`Balance: ${seg.turnout_persuasion_balance.trim().slice(0, 240)}`)
  }

  const ev = input.event_deployment
  if (ev) {
    const parts: string[] = []
    if (ev.highest_priority_event_label?.trim()) {
      parts.push(`Event: ${ev.highest_priority_event_label.trim().slice(0, 120)}`)
    }
    if (ev.staffing_pressure_count != null && ev.staffing_pressure_count > 0) {
      parts.push(`Staffing pressure (visible): ${ev.staffing_pressure_count}`)
    }
    if (ev.weak_field_overlap_note?.trim()) {
      parts.push(ev.weak_field_overlap_note.trim().slice(0, 200))
    } else if (ev.weak_field_area_label?.trim()) {
      parts.push(`Weak-field proxy: ${ev.weak_field_area_label.trim().slice(0, 100)}`)
    } else if (ev.overlap_with_field_pressure?.[0]) {
      parts.push(`Field overlap: ${ev.overlap_with_field_pressure[0].slice(0, 140)}`)
    }
    if (parts.length) {
      event_deployment_line = parts.join(' · ').slice(0, 340)
      lines.push(`Deployment / staffing: ${event_deployment_line}`)
    }
  }

  const tr34 = input.tradeoff_summary ?? null
  const seq34 = input.intervention_sequence ?? null
  const dr34 = input.desk_routing ?? null

  if (tr34?.top_tradeoff_headline?.trim()) {
    lines.push(`Tradeoff (v3.4): ${tr34.top_tradeoff_headline.trim().slice(0, 260)}`)
  }
  if (tr34?.preferred_primary_action?.trim()) {
    lines.push(`Push now (heuristic, HQ): ${tr34.preferred_primary_action.trim().slice(0, 220)}`)
  }
  if (tr34?.deferred_secondary_action?.trim()) {
    lines.push(`Defer / later: ${tr34.deferred_secondary_action.trim().slice(0, 220)}`)
  }

  if (seq34?.sequence_headline?.trim()) {
    lines.push(`Sequence (v3.4): ${seq34.sequence_headline.trim().slice(0, 220)}`)
  }
  const seqSteps = seq34?.ordered_steps ?? []
  for (const step of seqSteps.slice(0, 2)) {
    const s = step?.trim()
    if (s) lines.push(`Step: ${s.slice(0, 220)}`)
  }
  if (seq34?.downstream_dependencies?.[0]?.trim()) {
    lines.push(`Then unblock: ${seq34.downstream_dependencies[0].trim().slice(0, 200)}`)
  }

  if (dr34?.route_headline?.trim()) {
    lines.push(`Desk routing (v3.4): ${dr34.route_headline.trim().slice(0, 220)}`)
  }
  if (dr34?.first_owner_role && dr34?.second_owner_role) {
    lines.push(
      `Act first → second (coaching labels, not permissions): ${dr34.first_owner_role} → ${dr34.second_owner_role}.`,
    )
  }
  const esc0 = dr34?.escalation_route?.[0]?.trim()
  if (esc0) {
    lines.push(`Escalation path (visible): ${esc0.slice(0, 200)}`)
  }

  const ph34 = input.campaign_phase
  if (ph34?.campaign_mode && ph34.mode_headline?.trim()) {
    lines.push(
      `Campaign phase (v3.4): ${ph34.campaign_mode.replace(/_/g, ' ')} — ${ph34.mode_headline.trim().slice(0, 200)}`,
    )
  }
  const cd34 = input.countdown_summary
  if (cd34?.countdown_pressure_headline?.trim()) {
    lines.push(`Countdown (v3.4): ${cd34.countdown_pressure_headline.trim().slice(0, 200)}`)
  } else if (cd34?.countdown_scope_note?.trim()) {
    lines.push(`Timing note (v3.4): ${cd34.countdown_scope_note.trim().slice(0, 200)}`)
  }
  const gv34 = input.gotv_summary
  if (gv34?.turnout_risk_headline?.trim()) {
    lines.push(`GOTV (session proxies): ${gv34.turnout_risk_headline.trim().slice(0, 200)}`)
  } else if (gv34?.volunteer_deployment_headline?.trim()) {
    lines.push(`GOTV deployment: ${gv34.volunteer_deployment_headline.trim().slice(0, 200)}`)
  }
  const gotvNext = gv34?.best_next_gotv_actions?.[0]?.trim()
  if (gotvNext) {
    lines.push(`GOTV next check: ${gotvNext.slice(0, 180)}`)
  }

  let recommended_intervention = base.recommended_intervention
  if (!recommended_intervention?.trim() && top?.priority_band === 'critical') {
    recommended_intervention = `Stabilize comparative priority “${top.area_label.slice(0, 80)}” before new geographic or event scope.`
  }
  if (!recommended_intervention?.trim() && ev?.recommended_event_action?.trim()) {
    recommended_intervention = ev.recommended_event_action.trim().slice(0, 360)
  }
  if (!recommended_intervention?.trim() && seq34?.ordered_steps?.[0]?.trim()) {
    recommended_intervention = seq34.ordered_steps[0].trim().slice(0, 360)
  }
  if (!recommended_intervention?.trim() && tr34?.preferred_primary_action?.trim()) {
    recommended_intervention = tr34.preferred_primary_action.trim().slice(0, 360)
  }
  if (!recommended_intervention?.trim() && dr34?.route_headline?.trim()) {
    recommended_intervention = dr34.route_headline.trim().slice(0, 360)
  }

  return {
    ...base,
    command_lines: lines.slice(0, 22),
    recommended_area_focus,
    segmentation_posture_line,
    event_deployment_line,
    recommended_intervention: recommended_intervention ?? base.recommended_intervention,
  }
}
