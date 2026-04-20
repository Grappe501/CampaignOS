import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesCoverageSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesLeadershipCommand,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole } from './agentJonesRoleDesk'

function shouldSurfaceEscalationInLeadership(
  surface: AgentJonesSurface | null | undefined,
  role: AgentJonesNormalizedRole,
): boolean {
  if (surface === 'admin_desk' || surface === 'coordinator_desk') return true
  if (role === 'campaign_manager' || role === 'assistant_campaign_manager') return true
  return false
}

export function isAgentJonesLeadershipPackRole(r: AgentJonesNormalizedRole): boolean {
  return (
    r === 'admin' ||
    r === 'campaign_manager' ||
    r === 'assistant_campaign_manager' ||
    r === 'candidate' ||
    r === 'coordinator'
  )
}

function deskHealthAttentionLine(
  deskHealth: AgentJonesOperatingContext['desk_health'],
): string | null {
  const parts: string[] = []
  const label: Record<keyof typeof deskHealth, string> = {
    volunteer_lane: 'Volunteer',
    intern_lane: 'Intern',
    coordinator_lane: 'Coordinator',
    leadership_lane: 'Leadership',
  }
  for (const key of Object.keys(deskHealth) as (keyof typeof deskHealth)[]) {
    const v = deskHealth[key]
    if (v === 'urgent' || v === 'watch') {
      parts.push(`${label[key]} ${v}`)
    }
  }
  if (!parts.length) return null
  return `Desk lanes under stress (visible): ${parts.join('; ')}.`
}

function lookFirstLine(input: {
  surface: AgentJonesSurface
  role: AgentJonesNormalizedRole
}): string | null {
  if (input.surface === 'admin_desk' || input.role === 'admin') {
    return 'Look first: exception queue and desk rollouts on this admin surface — stay inside what the page shows.'
  }
  if (input.surface === 'candidate_desk' || input.role === 'candidate') {
    return 'Look first: campaign health snapshot and weakest KPI before any outward narrative.'
  }
  if (input.surface === 'coordinator_desk' || input.role === 'coordinator') {
    return 'Look first: supervised mission ops, blocked/overdue lanes, then intern pipeline counts.'
  }
  if (input.role === 'campaign_manager' || input.role === 'assistant_campaign_manager') {
    return 'Look first: coordinator supervised board reads and KPI strip — execution truth beats hallway certainty.'
  }
  return null
}

function calendarPressureLine(cal: AgentJonesCalendarSummary | null): string | null {
  if (!cal) return null
  if (cal.governance_warning_count != null && cal.governance_warning_count > 0) {
    return `Timing layer: ${cal.governance_warning_count} governance / escalation signal(s) in this session (not a full calendar).`
  }
  if (cal.upcoming_count_7d != null && cal.upcoming_count_7d > 0) {
    return `${cal.upcoming_count_7d} assignment-related timing item(s) in the ~7d window (visible deadlines only).`
  }
  return null
}

export function buildAgentJonesLeadershipCommand(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  calendarSummary: AgentJonesCalendarSummary | null
}): AgentJonesLeadershipCommand | null {
  const role = input.operating.normalized_role
  if (!isAgentJonesLeadershipPackRole(role)) return null

  const lines: string[] = []
  if (input.surface === 'admin_desk' || role === 'admin') {
    lines.push(
      'Admin lens: governance, exceptions, and client-visible desk health — not full-fleet org telemetry.',
    )
  } else if (role === 'campaign_manager' || role === 'assistant_campaign_manager') {
    lines.push(
      'HQ / campaign-manager lens: field execution from visible assignments, KPIs, and coordinator summaries — stay execution-grounded.',
    )
  } else if (role === 'candidate') {
    lines.push(
      'Principal lens: narrative should track the KPI and coordinator reads visible in this session only.',
    )
  } else if (role === 'coordinator') {
    lines.push(
      'Coordinator lens: supervised board and intern signals in this session — clear blocked/overdue before new volunteer asks.',
    )
  }

  const look = lookFirstLine({ surface: input.surface, role })
  if (look) lines.push(look)

  const cs = input.operating.command_summary
  if (cs.recent_changes[0]) {
    lines.push(`What changed: ${cs.recent_changes[0]}`)
  }
  if (cs.on_track[0]) {
    lines.push(`On track: ${cs.on_track[0]}`)
  }

  const att = cs.attention_now
  if (att[0]) lines.push(`Top pressure: ${att[0]}`)
  if (att[1]) lines.push(`Also watch: ${att[1]}`)

  const snap = input.leadershipSnapshot
  const showKpiStrip =
    snap &&
    snap.active_kpi_count > 0 &&
    (input.surface === 'candidate_desk' ||
      input.surface === 'admin_desk' ||
      input.surface === 'coordinator_desk' ||
      role === 'campaign_manager' ||
      role === 'assistant_campaign_manager')
  if (showKpiStrip && snap) {
    if (snap.weakest_kpi_name && snap.weakest_kpi_pct_of_target != null) {
      lines.push(
        `Weakest KPI visible: “${snap.weakest_kpi_name}” at ${snap.weakest_kpi_pct_of_target}% of target.`,
      )
    } else if (snap.kpis_below_half_target > 0) {
      lines.push(`${snap.kpis_below_half_target} KPI lane(s) under half of target in this window.`)
    }
  } else {
    const kt = input.operating.kpi_telemetry
    if (
      kt.active_kpi_count != null &&
      kt.active_kpi_count > 0 &&
      kt.below_half != null &&
      kt.below_half > 0
    ) {
      const w =
        kt.weakest_name && kt.weakest_pct_of_target != null
          ? ` Weakest visible: “${kt.weakest_name}” ~${kt.weakest_pct_of_target}% of target.`
          : ''
      lines.push(`KPI pressure (telemetry visible here): ${kt.below_half} lane(s) under half.${w}`)
    }
  }

  const ops = input.coordinatorOps
  if (
    ops &&
    ops.has_supervisor_scope &&
    (input.surface === 'coordinator_desk' || role === 'coordinator' || role === 'campaign_manager' || role === 'assistant_campaign_manager')
  ) {
    if (ops.overdue_count > 0 || ops.blocked_count > 0) {
      lines.push(
        `Supervised board: ${ops.blocked_count} blocked, ${ops.overdue_count} overdue — triage lanes before new asks.`,
      )
    }
  }

  if (input.operating.exception_summary.pending_review) {
    lines.push('Roster exception still pending — voter-gated execution should stay paused.')
  }

  const dhLine = deskHealthAttentionLine(input.operating.desk_health)
  if (dhLine) lines.push(dhLine)

  const calLine = calendarPressureLine(input.calendarSummary)
  if (calLine) lines.push(calLine)

  if (lines.length === 0) return null

  let intervention: string | null = null
  const laneUrgent = Object.values(input.operating.desk_health).some((v) => v === 'urgent')
  if (input.operating.exception_summary.pending_review) {
    intervention = 'Review exceptions and coordinator notes before pushing field volume.'
  } else if (ops && ops.overdue_count > 0) {
    intervention = 'Clear the oldest overdue supervised assignment row first.'
  } else if (ops && ops.blocked_count > 0) {
    intervention =
      'Make a decision on the oldest blocked supervised row — unblock execution before adding programs.'
  } else if (
    laneUrgent &&
    (input.surface === 'admin_desk' || role === 'admin')
  ) {
    intervention =
      'Stabilize urgent desk lanes visible in this session before org-wide governance moves.'
  } else if (snap?.weakest_kpi_name) {
    intervention = `Align messaging and coordinator air cover on “${snap.weakest_kpi_name}”.`
  } else if (input.operating.kpi_telemetry.weakest_name) {
    intervention = `Ground the next leadership touch on “${input.operating.kpi_telemetry.weakest_name}” using visible KPI cards only.`
  } else if (att[0]) {
    intervention = 'Address the top attention line, then re-scan on-track items so tone stays balanced.'
  }

  return {
    synthesis_lines: lines.slice(0, 6),
    recommended_intervention: intervention,
  }
}

/** Appends v3.2 field/geo/coverage (and Pass 2 escalation for admin/coord/CM) after v3.1 synthesis. */
export function enrichLeadershipCommandWithV32(input: {
  base: AgentJonesLeadershipCommand | null
  operating: AgentJonesOperatingContext | null
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  escalation?: AgentJonesEscalationSummary | null
  surface?: AgentJonesSurface | null
}): AgentJonesLeadershipCommand | null {
  const { base, operating, geo, field, coverage, escalation, surface } = input
  if (!base || !operating || !isAgentJonesLeadershipPackRole(operating.normalized_role)) {
    return base
  }

  const add: string[] = []
  const primary = geo?.primary_area_label?.trim()
  if (primary) {
    add.push(
      `Roster geography anchor (session): ${primary} — not a county/precinct analytics engine; use field and coverage cards for visible pressure only.`,
    )
  }
  const weak = field?.weakest_area_label?.trim()
  if (weak) {
    add.push(`Area stress proxy (visible): ${weak}.`)
  } else if (field?.top_field_risks?.[0]) {
    add.push(`Field signal (visible): ${field.top_field_risks[0].slice(0, 240)}`)
  }
  const rh = coverage?.readiness_headline?.trim()
  if (rh && !add.some((l) => l.includes(rh.slice(0, 40)))) {
    add.push(`Coverage readiness (boards): ${rh.slice(0, 220)}`)
  }

  if (
    escalation &&
    shouldSurfaceEscalationInLeadership(surface ?? undefined, operating.normalized_role)
  ) {
    const head = escalation.top_escalation_headline?.trim()
    if (head) {
      add.push(`Cross-desk escalation (visible): ${head}`)
    }
    if (
      escalation.cross_desk_issue_count != null &&
      escalation.cross_desk_issue_count >= 2
    ) {
      add.push(
        `${escalation.cross_desk_issue_count} escalation theme(s) active — sequence one desk path before opening another.`,
      )
    } else if (escalation.escalation_routes?.[0]) {
      const r0 = escalation.escalation_routes[0].trim()
      if (r0 && !add.some((l) => l.includes(r0.slice(0, 30)))) {
        add.push(`Escalation route (visible): ${r0.slice(0, 220)}`)
      }
    }
  }

  if (!add.length) return base
  return {
    ...base,
    synthesis_lines: [...base.synthesis_lines, ...add].slice(0, 9),
  }
}
