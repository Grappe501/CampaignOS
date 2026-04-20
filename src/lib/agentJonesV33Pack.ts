import { buildAgentJonesAreaRanking } from './agentJonesAreaScoring'
import { buildAgentJonesCampaignTheaterSummary } from './agentJonesCampaignTheater'
import { buildAgentJonesCommandFusionSummary } from './agentJonesCommandFusion'
import type {
  AgentJonesCalendarSummary,
  AgentJonesCampaignManagerCommand,
  AgentJonesCoverageSummary,
  AgentJonesDemographicSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
  AgentJonesTaskPressureSummary,
  AgentJonesVolunteerMissionContext,
  AgentJonesAreaScore,
} from './agentJonesContextV2'
import { buildAgentJonesEventDeploymentSummary } from './agentJonesEventDeployment'
import { agentJonesV32CommandScope } from './agentJonesV32Pack'
import { buildAgentJonesSegmentationSummary } from './agentJonesSegmentation'

export type AgentJonesV33Pack = {
  area_ranking?: AgentJonesAreaScore[]
  /** Honest limits when geography/ranking depth is thin (Pass 1). */
  area_ranking_note?: string
  segmentation_summary?: AgentJonesSegmentationSummary
  event_deployment?: AgentJonesEventDeploymentSummary
  command_fusion?: AgentJonesCommandFusionSummary
  campaign_theater?: AgentJonesCampaignTheaterSummary
}

export function buildAgentJonesV33Pack(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  demographic: AgentJonesDemographicSummary | null
  calendarSummary: AgentJonesCalendarSummary | null
  taskPressure: AgentJonesTaskPressureSummary | null
  volunteerMission: AgentJonesVolunteerMissionContext | null
  campaignManagerCommand: AgentJonesCampaignManagerCommand | null
}): AgentJonesV33Pack {
  const scoped = agentJonesV32CommandScope({
    surface: input.surface,
    normalizedRole: input.operating.normalized_role,
    userScope: input.operating.user_scope,
  })
  if (!scoped) return {}

  const area_ranking = buildAgentJonesAreaRanking({
    geo: input.geo,
    field: input.field,
    coverage: input.coverage,
  })

  const hasGeoAnchor = Boolean(input.geo?.primary_area_label?.trim())
  const hasDistinctGeoLists =
    (input.geo?.undercovered_area_labels?.length ?? 0) +
      (input.geo?.high_opportunity_area_labels?.length ?? 0) >
    0
  const hasFieldProxy = Boolean(input.field?.weakest_area_label?.trim())

  let area_ranking_note: string | undefined
  if (area_ranking.length === 0) {
    if (!hasGeoAnchor && !hasFieldProxy) {
      area_ranking_note =
        'Comparative area ranking unavailable — no roster geography anchor or visible field stress proxy in this session.'
    } else {
      area_ranking_note =
        'Could not derive distinct ranked rows from current summaries — use coordinator boards and geography cards for area work.'
    }
  } else if (area_ranking.length === 1 && !hasDistinctGeoLists) {
    area_ranking_note =
      'Single ranked area in this session — order is directional only; multi-area comparison needs more distinct labels or signals in context.'
  }

  const segmentation_summary =
    buildAgentJonesSegmentationSummary({
      geo: input.geo,
      field: input.field,
      coverage: input.coverage,
      demographic: input.demographic,
      area_ranking,
      calendarSummary: input.calendarSummary,
    }) ?? undefined

  const event_deployment =
    buildAgentJonesEventDeploymentSummary({
      calendarSummary: input.calendarSummary,
      coverage: input.coverage,
      field: input.field,
    }) ?? undefined

  const command_fusion =
    buildAgentJonesCommandFusionSummary({
      geo: input.geo,
      field: input.field,
      coverage: input.coverage,
      calendarSummary: input.calendarSummary,
      taskPressure: input.taskPressure,
      volunteerMission: input.volunteerMission,
      campaignManagerCommand: input.campaignManagerCommand,
      eventDeployment: event_deployment,
    }) ?? undefined

  const campaign_theater =
    buildAgentJonesCampaignTheaterSummary({
      geo: input.geo,
      field: input.field,
      operating: input.operating,
      leadershipSnapshot: input.leadershipSnapshot,
      area_ranking: area_ranking.length ? area_ranking : null,
    }) ?? undefined

  const out: AgentJonesV33Pack = {}
  if (area_ranking.length) out.area_ranking = area_ranking
  if (area_ranking_note) out.area_ranking_note = area_ranking_note
  if (segmentation_summary) out.segmentation_summary = segmentation_summary
  if (event_deployment) out.event_deployment = event_deployment
  if (command_fusion) out.command_fusion = command_fusion
  if (campaign_theater) out.campaign_theater = campaign_theater
  return out
}

/** Fingerprint for session_coaching — keep compact for server epoch cap. */
export function buildAgentJonesV33IntelEpoch(pack: AgentJonesV33Pack | null): string {
  if (!pack) return ''
  const ar = pack.area_ranking ?? []
  const seg = pack.segmentation_summary
  const ed = pack.event_deployment
  const cf = pack.command_fusion
  const th = pack.campaign_theater
  return [
    ar.map((r) => `${r.area_label}:${r.priority_band}`).join(';'),
    (pack.area_ranking_note ?? '').slice(0, 48),
    seg?.primary_mode ?? '',
    String(ed?.staffing_pressure_count ?? ''),
    cf?.top_combined_pressure_headline?.slice(0, 48) ?? '',
    String(cf?.coverage_staffing_pressure_count ?? ''),
    String(cf?.governance_timing_signal_count ?? ''),
    th?.command_headline?.slice(0, 48) ?? '',
    (th?.multi_area_note ?? '').slice(0, 32),
  ].join('|')
}
