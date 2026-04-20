import type {
  AgentJonesCalendarSummary,
  AgentJonesCampaignManagerCommand,
  AgentJonesContextV2,
  AgentJonesCoordinatorOpsContext,
  AgentJonesCoverageSummary,
  AgentJonesDemographicSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesInternLayerContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
  AgentJonesTaskPressureSummary,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole, AgentJonesUserScope } from './agentJonesRoleDesk'
import { buildAgentJonesCampaignManagerCommand } from './agentJonesCampaignManagerCommand'
import { buildAgentJonesCoverageIntelligence } from './agentJonesCoverageSignals'
import { buildAgentJonesDemographicSummary } from './agentJonesDemographicSignals'
import { buildAgentJonesEscalationSummary } from './agentJonesEscalationSignals'
import { buildAgentJonesFieldIntelligence } from './agentJonesFieldIntelligence'
import { buildAgentJonesGeoIntelligence } from './agentJonesGeoSignals'
import type { MatchedVoterDisplayRow } from './voterMatch'

export type AgentJonesV32Pack = {
  geo_intelligence: AgentJonesGeoIntelligence | null
  field_intelligence: AgentJonesFieldIntelligenceSummary | null
  coverage_intelligence: AgentJonesCoverageSummary | null
  demographic_summary: AgentJonesDemographicSummary | null
  escalation_summary: AgentJonesEscalationSummary | null
  campaign_manager_command: AgentJonesCampaignManagerCommand | null
}

/** @deprecated use AgentJonesV32Pack */
export type AgentJonesV32Pass1Pack = AgentJonesV32Pack

export function agentJonesV32CommandScope(input: {
  surface: AgentJonesSurface
  normalizedRole: AgentJonesNormalizedRole
  userScope: AgentJonesUserScope
}): boolean {
  if (
    input.surface === 'admin_desk' ||
    input.surface === 'candidate_desk' ||
    input.surface === 'coordinator_desk'
  ) {
    return true
  }
  if (input.userScope === 'campaign_wide') return true
  if (input.normalizedRole === 'coordinator') return true
  if (input.normalizedRole === 'county_lead' || input.normalizedRole === 'precinct_captain') {
    return true
  }
  return false
}

function enrichGeoWithField(
  geo: AgentJonesGeoIntelligence | null,
  field: AgentJonesFieldIntelligenceSummary | null,
): AgentJonesGeoIntelligence | null {
  if (!geo) return null
  const under: string[] = [...(geo.undercovered_area_labels ?? [])]
  const hi: string[] = [...(geo.high_opportunity_area_labels ?? [])]
  if (field?.weakest_area_label && (field.undercovered_area_count ?? 0) > 0) {
    under.push(field.weakest_area_label)
  }
  if (field?.strongest_area_label) {
    hi.push(field.strongest_area_label)
  }
  return {
    ...geo,
    ...(under.length ? { undercovered_area_labels: under.slice(0, 4) } : {}),
    ...(hi.length ? { high_opportunity_area_labels: hi.slice(0, 4) } : {}),
  }
}

export function buildAgentJonesV32Pack(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  matchedVoter: MatchedVoterDisplayRow | null
  voterMatched: boolean
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  volunteerMission: AgentJonesVolunteerMissionContext | null
  internLayer: AgentJonesInternLayerContext | null
  calendarSummary: AgentJonesCalendarSummary | null
  taskPressure: AgentJonesTaskPressureSummary | null
  campaign: AgentJonesContextV2['campaign'] | null | undefined
}): AgentJonesV32Pack {
  const geoBase = buildAgentJonesGeoIntelligence({
    matchedVoter: input.matchedVoter,
    voterMatched: input.voterMatched,
  })

  const cmd = agentJonesV32CommandScope({
    surface: input.surface,
    normalizedRole: input.operating.normalized_role,
    userScope: input.operating.user_scope,
  })

  if (!cmd) {
    return {
      geo_intelligence: geoBase,
      field_intelligence: null,
      coverage_intelligence: null,
      demographic_summary: null,
      escalation_summary: null,
      campaign_manager_command: null,
    }
  }

  const field = buildAgentJonesFieldIntelligence({
    operating: input.operating,
    coordinatorOps: input.coordinatorOps,
    leadershipSnapshot: input.leadershipSnapshot,
    volunteerMission: input.volunteerMission,
    calendarSummary: input.calendarSummary,
    taskPressure: input.taskPressure,
    geo: geoBase,
  })

  const coverage = buildAgentJonesCoverageIntelligence({
    calendarSummary: input.calendarSummary,
    coordinatorOps: input.coordinatorOps,
    operating: input.operating,
    geo: geoBase,
  })

  const geo = enrichGeoWithField(geoBase, field)

  const escalation = buildAgentJonesEscalationSummary({
    operating: input.operating,
    coordinatorOps: input.coordinatorOps,
    internLayer: input.internLayer,
    leadershipSnapshot: input.leadershipSnapshot,
  })

  const demographic_summary = buildAgentJonesDemographicSummary({
    geo,
    campaign: input.campaign,
    commandScope: true,
    normalizedRole: input.operating.normalized_role,
  })

  const campaign_manager_command = buildAgentJonesCampaignManagerCommand({
    role: input.operating.normalized_role,
    field,
    geo,
    escalation,
    leadershipSnapshot: input.leadershipSnapshot,
    coverage,
    calendarSummary: input.calendarSummary,
  })

  return {
    geo_intelligence: geo,
    field_intelligence: field,
    coverage_intelligence: coverage,
    demographic_summary,
    escalation_summary: escalation,
    campaign_manager_command,
  }
}

/** @deprecated use buildAgentJonesV32Pack */
export const buildAgentJonesV32Pass1Pack = buildAgentJonesV32Pack

/**
 * Compact fingerprint of v3.2 derived intel for session coaching.
 * Composed with `operating.signal_epoch` so avoid_repeating refreshes when area/escalation signals change materially.
 */
export function buildAgentJonesV32IntelEpoch(pack: AgentJonesV32Pack | null): string {
  if (!pack) return ''
  const g = pack.geo_intelligence
  const f = pack.field_intelligence
  const c = pack.coverage_intelligence
  const e = pack.escalation_summary
  const d = pack.demographic_summary
  const cm = pack.campaign_manager_command
  return [
    g?.primary_area_label ?? '',
    g?.scope_type ?? '',
    String(f?.high_pressure_area_count ?? ''),
    String(f?.undercovered_area_count ?? ''),
    String(f?.coordinator_pressure_count ?? ''),
    f?.weakest_area_label?.slice(0, 48) ?? '',
    f?.strongest_area_label?.slice(0, 48) ?? '',
    String(c?.event_staffing_pressure_count ?? ''),
    c?.readiness_headline?.slice(0, 48) ?? '',
    String(e?.cross_desk_issue_count ?? ''),
    d?.area_label ?? '',
    cm?.recommended_intervention?.slice(0, 40) ?? '',
  ].join('|')
}
