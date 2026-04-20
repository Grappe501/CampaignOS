import type {
  AgentJonesCalendarSummary,
  AgentJonesCampaignManagerCommand,
  AgentJonesCoverageSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesLeadershipSnapshotContext,
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
