import type {
  AgentJonesCoordinatorOpsContext,
  AgentJonesEscalationSummary,
  AgentJonesInternLayerContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
} from './agentJonesContextV2'

export function buildAgentJonesEscalationSummary(input: {
  operating: AgentJonesOperatingContext
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  internLayer: AgentJonesInternLayerContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
}): AgentJonesEscalationSummary | null {
  const op = input.operating
  const routes: string[] = []
  const themes = new Set<string>()
  let blockedDownstream = 0

  if (op.exception_summary.pending_review) {
    themes.add('exception')
    routes.push('Roster exception → coordinator / admin review before voter-gated execution')
    blockedDownstream += 1
  }

  const ops = input.coordinatorOps
  if (ops?.has_supervisor_scope && ops.overdue_count > 0) {
    themes.add('coord_overdue')
    routes.push('Supervised overdue rows → coordinator desk triage and volunteer air cover')
    blockedDownstream += ops.overdue_count
  }
  if (ops?.has_supervisor_scope && ops.blocked_count > 0) {
    themes.add('coord_blocked')
    routes.push('Blocked supervised assignments → policy/capacity decision on coordinator surface')
    blockedDownstream += ops.blocked_count
  }

  const internOd = input.internLayer?.overdue_first_contact_count ?? 0
  if (internOd > 0) {
    themes.add('intern')
    routes.push('Intern first-contact overdue → intern lead + coordinator visibility')
    blockedDownstream += internOd
  }

  const snap = input.leadershipSnapshot
  if (snap && snap.kpis_below_half_target >= 3) {
    themes.add('kpi')
    routes.push('Multiple KPI lanes under half → leadership / candidate desk + coordinator execution')
  }

  const urgentLanes = Object.values(op.desk_health).filter((v) => v === 'urgent').length
  if (urgentLanes >= 2) {
    themes.add('lanes')
    routes.push('Multiple urgent desk lanes → sequence fixes before adding cross-desk asks')
  }

  if (routes.length === 0) return null

  const cross_desk_issue_count = Math.min(8, themes.size)
  const top =
    cross_desk_issue_count >= 2
      ? 'Several desks show pressure at once — pick one escalation path and close it before opening another.'
      : 'Single-desk escalation visible — resolve at source before broadcasting outward.'

  return {
    cross_desk_issue_count,
    top_escalation_headline: top,
    escalation_routes: routes.slice(0, 4),
    blocked_downstream_work_count: blockedDownstream > 0 ? Math.min(500, blockedDownstream) : null,
  }
}
