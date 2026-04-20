import { buildAgentJonesCampaignPhaseSummary } from './agentJonesCampaignPhase'
import { buildAgentJonesCountdownSummary } from './agentJonesCountdown'
import { buildAgentJonesDeskRoutingSummary } from './agentJonesDeskRouting'
import { buildAgentJonesGotvSummary } from './agentJonesGotvSignals'
import { buildAgentJonesInterventionSequence } from './agentJonesInterventionSequence'
import { buildAgentJonesTradeoffSummary } from './agentJonesTradeoffs'
import type {
  AgentJonesCalendarSummary,
  AgentJonesCampaignPhaseSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesCountdownSummary,
  AgentJonesCoverageSummary,
  AgentJonesDeskRoutingSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGotvSummary,
  AgentJonesInterventionSequence,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
  AgentJonesTradeoffSummary,
} from './agentJonesContextV2'
import type { AgentJonesV33Pack } from './agentJonesV33Pack'
import { agentJonesV32CommandScope } from './agentJonesV32Pack'

export type AgentJonesV34Pack = {
  campaign_phase?: AgentJonesCampaignPhaseSummary
  countdown_summary?: AgentJonesCountdownSummary
  tradeoff_summary?: AgentJonesTradeoffSummary
  intervention_sequence?: AgentJonesInterventionSequence
  gotv_summary?: AgentJonesGotvSummary
  desk_routing?: AgentJonesDeskRoutingSummary
}

export function buildAgentJonesV34Pack(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  v33: AgentJonesV33Pack | null
  calendarSummary: AgentJonesCalendarSummary | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  escalation: AgentJonesEscalationSummary | null
}): AgentJonesV34Pack {
  if (
    !agentJonesV32CommandScope({
      surface: input.surface,
      normalizedRole: input.operating.normalized_role,
      userScope: input.operating.user_scope,
    })
  ) {
    return {}
  }

  const v33 = input.v33
  const campaign_phase =
    buildAgentJonesCampaignPhaseSummary({
      calendarSummary: input.calendarSummary,
      segmentation: v33?.segmentation_summary,
      area_ranking: v33?.area_ranking,
      leadershipSnapshot: input.leadershipSnapshot,
    }) ?? undefined

  const countdown_summary =
    buildAgentJonesCountdownSummary({
      calendarSummary: input.calendarSummary,
    }) ?? undefined

  const tradeoff_summary =
    buildAgentJonesTradeoffSummary({
      phase: campaign_phase ?? null,
      segmentation: v33?.segmentation_summary,
      field: input.field,
      coverage: input.coverage,
      eventDeployment: v33?.event_deployment,
      commandFusion: v33?.command_fusion,
    }) ?? undefined

  const intervention_sequence =
    buildAgentJonesInterventionSequence({
      operating: input.operating,
      coordinatorOps: input.coordinatorOps,
      escalation: input.escalation,
      field: input.field,
      area_ranking: v33?.area_ranking,
      phase: campaign_phase ?? null,
      commandFusion: v33?.command_fusion,
    }) ?? undefined

  const gotv_summary =
    buildAgentJonesGotvSummary({
      phase: campaign_phase ?? null,
      area_ranking: v33?.area_ranking,
      field: input.field,
      coverage: input.coverage,
      eventDeployment: v33?.event_deployment,
    }) ?? undefined

  const desk_routing =
    buildAgentJonesDeskRoutingSummary({
      surface: input.surface,
      operating: input.operating,
      coordinatorOps: input.coordinatorOps,
      escalation: input.escalation,
      phase: campaign_phase ?? null,
    }) ?? undefined

  const out: AgentJonesV34Pack = {}
  if (campaign_phase) out.campaign_phase = campaign_phase
  if (countdown_summary) out.countdown_summary = countdown_summary
  if (tradeoff_summary) out.tradeoff_summary = tradeoff_summary
  if (intervention_sequence) out.intervention_sequence = intervention_sequence
  if (gotv_summary) out.gotv_summary = gotv_summary
  if (desk_routing) out.desk_routing = desk_routing
  return out
}

/** Compact fingerprint for session_coaching (v3.4 layer). */
export function buildAgentJonesV34IntelEpoch(pack: AgentJonesV34Pack | null): string {
  if (!pack || Object.keys(pack).length === 0) return ''
  const ph = pack.campaign_phase
  const cd = pack.countdown_summary
  const tr = pack.tradeoff_summary
  const seq = pack.intervention_sequence
  const gv = pack.gotv_summary
  const dr = pack.desk_routing
  return [
    ph?.campaign_mode ?? '',
    String(ph?.days_to_next_major_milestone ?? ''),
    (cd?.countdown_window ?? '') + String(cd?.days_remaining ?? ''),
    (tr?.top_tradeoff_headline ?? '').slice(0, 40),
    (seq?.sequence_headline ?? '').slice(0, 40),
    String(gv?.gotv_mode_active ?? ''),
    (dr?.route_headline ?? '').slice(0, 40),
  ].join('|')
}
