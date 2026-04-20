import type {
  AgentJonesCoverageSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesOperatingContext,
  AgentJonesProactiveAlert,
  AgentJonesSurface,
} from './agentJonesContextV2'
import { dedupeAlertsByMeaningfulChange, sortAlertsBySeverity } from './agentJonesProactiveAlerts'

function leadershipishSurfaceAndRole(
  surface: AgentJonesSurface,
  role: AgentJonesOperatingContext['normalized_role'],
): boolean {
  if (
    surface === 'admin_desk' ||
    surface === 'candidate_desk' ||
    surface === 'coordinator_desk'
  ) {
    return true
  }
  return role === 'campaign_manager' || role === 'assistant_campaign_manager'
}

/** Extra proactive nudges from v3.2 field / escalation signals (merged with v3.1 alerts). */
export function buildAgentJonesV32ProactiveSupplements(input: {
  operating: AgentJonesOperatingContext
  commandScope: boolean
  surface: AgentJonesSurface
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  escalation: AgentJonesEscalationSummary | null
}): AgentJonesProactiveAlert[] {
  const out: AgentJonesProactiveAlert[] = []
  if (!input.commandScope) return out

  const push = (a: AgentJonesProactiveAlert) => {
    if (out.some((x) => x.id === a.id)) return
    out.push(a)
  }

  const lead = leadershipishSurfaceAndRole(input.surface, input.operating.normalized_role)

  const ex = input.escalation
  if (ex) {
    if ((ex.cross_desk_issue_count ?? 0) >= 2) {
      push({
        id: 'proactive-cross-desk-pressure',
        severity: 'high',
        title: 'Multiple cross-desk escalation paths active',
        explanation:
          ex.top_escalation_headline ??
          'Several desks show pressure — close one escalation lane honestly before opening another.',
        dismissible: true,
      })
    } else if (ex.escalation_routes?.length) {
      push({
        id: 'proactive-escalation-route-open',
        severity: 'medium',
        title: 'Cross-desk escalation path visible',
        explanation:
          (ex.top_escalation_headline ?? ex.escalation_routes[0]).slice(0, 320),
        dismissible: true,
      })
    }
  }

  const geo = input.geo?.primary_area_label
  const staff =
    input.coverage?.event_staffing_pressure_count ?? input.field?.volunteer_capacity_warning_count
  if (geo && staff != null && staff > 0) {
    push({
      id: 'proactive-area-staffing-visible',
      severity: 'medium',
      title: 'Visible assignment staffing pressure in your geography context',
      explanation: `${geo}: ${staff} not-yet-started or staffing-flagged row(s) on the visible board — captains may need air cover.`,
      route_hint: '/coordinator',
      target_id: 'coordinator-mission-ops',
      dismissible: true,
    })
  }

  const hp = input.field?.high_pressure_area_count ?? 0
  if (hp > 0) {
    push({
      id: 'proactive-field-high-pressure',
      severity: 'medium',
      title: 'High-pressure field signals (visible session)',
      explanation: `${hp} lane(s) combine exception, supervised backlog, KPI stress, or urgent desk health — stabilize before new geography or program asks.`,
      dismissible: true,
    })
  }

  const weakLabel = input.field?.weakest_area_label?.trim()
  if (weakLabel && lead) {
    push({
      id: 'proactive-undercovered-area-proxy',
      severity: 'medium',
      title: 'Under-covered / stressed area (session proxy)',
      explanation: `${weakLabel} — confirm on coordinator board; not a ranked turf list.`,
      route_hint: input.surface === 'coordinator_desk' ? '/coordinator' : null,
      target_id: input.surface === 'coordinator_desk' ? 'coordinator-mission-ops' : null,
      dismissible: true,
    })
  }

  const uc = input.field?.undercovered_area_count
  if (
    geo &&
    uc != null &&
    uc > 0 &&
    !out.some((x) => x.id === 'proactive-area-staffing-visible') &&
    !out.some((x) => x.id === 'proactive-undercovered-area-proxy')
  ) {
    push({
      id: 'proactive-coverage-gap-hint',
      severity: 'low',
      title: 'Coverage gap hint (session scope)',
      explanation: `Geography anchor ${geo} carries visible coverage/staffing warnings — confirm with coordinator board before promising turf outcomes.`,
      dismissible: true,
    })
  }

  const strong = input.field?.strongest_area_label?.trim()
  if (strong && lead && !weakLabel) {
    push({
      id: 'proactive-opportunity-area-proxy',
      severity: 'low',
      title: 'Relative opportunity anchor (session)',
      explanation: `${strong} — keep claims aligned to visible boards only.`,
      dismissible: true,
    })
  }

  const cov = input.coverage
  if (
    cov?.readiness_headline &&
    !(cov.event_staffing_pressure_count && cov.event_staffing_pressure_count > 0) &&
    !out.some((x) => x.id === 'proactive-area-staffing-visible')
  ) {
    push({
      id: 'proactive-coverage-readiness-headline',
      severity: 'low',
      title: 'Coverage readiness (visible boards)',
      explanation: cov.readiness_headline.slice(0, 320),
      dismissible: true,
    })
  }

  return out
}

export function mergeProactiveAlertLists(
  base: AgentJonesProactiveAlert[],
  extra: AgentJonesProactiveAlert[],
  max = 5,
): AgentJonesProactiveAlert[] {
  const byId = new Map<string, AgentJonesProactiveAlert>()
  for (const a of base) byId.set(a.id, a)
  for (const a of extra) {
    if (!byId.has(a.id)) byId.set(a.id, a)
  }
  return sortAlertsBySeverity(dedupeAlertsByMeaningfulChange([...byId.values()])).slice(0, max)
}
