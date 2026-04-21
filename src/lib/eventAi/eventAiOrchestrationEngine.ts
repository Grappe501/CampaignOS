/**
 * Event AI Orchestration Engine — composes packets, graph summaries, retrieval, alignment.
 */

import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CampaignCalendarEventRecord } from '../campaignCalendarArchitecture'
import type { AgentJonesCockpitFocus } from '../agentJonesContextV2'
import type { AgentJonesCockpitMissionDigest } from '../agentJonesContextV2'
import type { AgentJonesEventIntelligenceLayer } from '../agentJonesEventIntelligenceBridge'
import type { CockpitModuleId } from '../cockpit/cockpitWorkspaceSchemas'
import { buildCockpitConsequences, type CockpitConsequence } from '../cockpit/cockpitConsequenceEngine'
import { mergeAffectedModules } from '../cockpit/cockpitConsequenceEngine'
import { moduleIdsConnectedToEventAnchor, summarizeGraphForPacket } from './eventAiRelationshipGraph'
import { buildEventAiRetrievalContext } from './eventAiRetrieval'
import { buildDepartmentAlignmentLines } from './eventAiDepartmentAlignment'
import { buildGrowthExpansionLines } from './eventAiGrowthIntelligence'
import { inferEventAiOrchestrationMode, type EventAiOrchestrationModeId } from './eventAiModeRegistry'
import type { EventAiSimulationScenarioId } from './eventAiSimulationSchemas'
import {
  createRecommendationStub,
  dedupeEventAiRecommendations,
  mapTimeSensitivityToImpactEstimate,
  type EventAiRecommendationRecord,
} from './eventAiRecommendationRegistry'

function relatedEntityIdsForRecommendation(
  campaignScope: string,
  focused: CampaignCalendarEventRecord | null | undefined,
): string[] {
  if (focused?.event_id) {
    return [campaignScope, focused.event_id].filter(
      (x) => typeof x === 'string' && x.length > 0,
    )
  }
  return [campaignScope]
}

export type EventAiOrchestrationBundleInput = {
  /** Correlation scope: prefer campaign id from program events via `resolveEventAiCampaignScope`. */
  campaign_id: string
  leadership_snapshot?: LeadershipBriefingSnapshot | null
  cockpit_focus?: AgentJonesCockpitFocus | null
  cockpit_mission_digest?: AgentJonesCockpitMissionDigest | null
  event_desk_layer?: AgentJonesEventIntelligenceLayer | null
  calendar_pool?: readonly CampaignCalendarEventRecord[] | null
  focused_event_record?: CampaignCalendarEventRecord | null
}

export type EventAiRetrievalWireEntry = {
  label: string
  match_kind: string
  why_matched: string
  score_0_100: number
}

export type EventAiOrchestrationBundle = {
  generated_at_ms: number
  campaign_id: string
  active_mode: EventAiOrchestrationModeId
  consequences: CockpitConsequence[]
  cross_module_ids: CockpitModuleId[]
  graph_edge_lines: string[]
  retrieval_fingerprint: string | null
  retrieval_matches: EventAiRetrievalWireEntry[]
  retrieval_fallback_note: string | null
  department_alignment: string[]
  growth_expansion: string[]
  simulation_scenarios_available: EventAiSimulationScenarioId[]
  recommendation_stubs: EventAiRecommendationRecord[]
  mesh_headline: string
  audit_note: string
}

const BASE_SCENARIOS: EventAiSimulationScenarioId[] = [
  'approval_delay',
  'volunteer_lead_dropout',
  'comms_slip_48h',
  'event_date_shift_1d',
  'overlapping_events',
  'department_step_incomplete',
  'scale_event_type_counties',
  'reassign_leadership_circle',
]

function simulationScenariosForContext(
  snapshot: LeadershipBriefingSnapshot | null | undefined,
): EventAiSimulationScenarioId[] {
  const out = [...BASE_SCENARIOS]
  const c = snapshot?.counts
  if (c && c.approval_pending < 1) {
    return out.filter((s) => s !== 'approval_delay')
  }
  return out
}

/**
 * Heavy lifting is O(peers × events) for retrieval — callers should memoize on
 * leadership `generated_at_ms`, focused event id, and digest text (see cockpit / event desk hooks).
 */
export function buildEventAiOrchestrationBundle(input: EventAiOrchestrationBundleInput): EventAiOrchestrationBundle {
  const snapshot = input.leadership_snapshot

  const consequences = snapshot ? buildCockpitConsequences(snapshot) : []
  const mods = mergeAffectedModules(consequences)
  const crisis =
    input.cockpit_mission_digest?.strip_mode === 'crisis' ||
    input.cockpit_mission_digest?.strip_mode === 'high_volume'

  const active_mode = inferEventAiOrchestrationMode({
    consequences,
    cockpit_strip_crisis: Boolean(crisis),
    event_desk_layer: input.event_desk_layer,
  })

  const graphSeeds = moduleIdsConnectedToEventAnchor(10)
  const graph_edge_lines = summarizeGraphForPacket(graphSeeds, 8)

  let retrieval_fingerprint: string | null = null
  let retrieval_matches: EventAiRetrievalWireEntry[] = []
  let retrieval_fallback_note: string | null = null

  if (input.focused_event_record && input.calendar_pool && input.calendar_pool.length > 1) {
    const ctx = buildEventAiRetrievalContext(input.focused_event_record, input.calendar_pool, 5)
    retrieval_fingerprint = ctx.source_fingerprint
    retrieval_fallback_note = ctx.fallback_note
    retrieval_matches = ctx.match_summaries.map((m) => ({
      label: m.label,
      match_kind: m.match_kind,
      why_matched: [m.useful_because, ...m.why_matched.slice(0, 2)].join(' · ').slice(0, 300),
      score_0_100: m.score_0_100,
    }))
  } else if (input.focused_event_record && (!input.calendar_pool || input.calendar_pool.length <= 1)) {
    retrieval_fallback_note =
      'Peer comparison needs at least one other program event in the calendar pool.'
  }

  const department_alignment = snapshot ? buildDepartmentAlignmentLines(snapshot, 5) : []
  const growth_expansion = snapshot ? buildGrowthExpansionLines(snapshot, 4) : []

  const stubs: EventAiRecommendationRecord[] = []
  const top = consequences[0]
  if (top) {
    const scopeKey = input.campaign_id.replace(/[^a-z0-9_-]/gi, '').slice(0, 40)
    stubs.push(
      createRecommendationStub({
        id: `cc_${top.id}_${scopeKey || 'scope'}`,
        type: top.suggested_owner === 'governance' ? 'approval' : 'staffing',
        source_mode: active_mode,
        related_entity_ids: relatedEntityIdsForRecommendation(
          input.campaign_id,
          input.focused_event_record,
        ),
        explanation: top.impact_summary.slice(0, 400),
        impact_estimate: mapTimeSensitivityToImpactEstimate(top.time_sensitivity),
        confidence: top.severity === 'critical' || top.severity === 'high' ? 'high' : 'medium',
        suggested_owner: top.suggested_owner,
        suggested_action_path: 'Review in CampaignOS — AI does not apply changes.',
      }),
    )
  }

  const cockpitHint = input.cockpit_mission_digest?.cross_system_pressure_line?.slice(0, 180) ?? ''
  const focus = input.cockpit_focus
  const focusLine = focus
    ? `Layout ${focus.center_mode}: ${focus.center_primary_module_id}${focus.center_secondary_module_id ? ` + ${focus.center_secondary_module_id}` : ''}`
    : ''
  const eventHint = input.event_desk_layer?.briefing_one_liner?.slice(0, 160) ?? ''
  const mesh_headline = [
    focusLine && `Cockpit ${focusLine}`,
    cockpitHint && `Pressure: ${cockpitHint}`,
    eventHint && `Event desk: ${eventHint}`,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 400) || 'Event AI mesh online — advisory synthesis from visible campaign state.'

  return {
    generated_at_ms: Date.now(),
    campaign_id: input.campaign_id,
    active_mode,
    consequences,
    cross_module_ids: mods,
    graph_edge_lines,
    retrieval_fingerprint,
    retrieval_matches,
    retrieval_fallback_note,
    department_alignment,
    growth_expansion,
    simulation_scenarios_available: simulationScenariosForContext(snapshot),
    recommendation_stubs: dedupeEventAiRecommendations(stubs),
    mesh_headline,
    audit_note:
      'Advisory orchestration layer — CampaignOS records are authoritative; AI does not mutate approvals, staffing, comms sends, or finance.',
  }
}
