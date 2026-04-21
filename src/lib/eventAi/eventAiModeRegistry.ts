/**
 * Explicit Agent Jones orchestration modes — tone/priority hints for prompts.
 * Implemented as hints in context + system prompt, not separate public APIs (unless extended later).
 */

import type { CockpitConsequence } from '../cockpit/cockpitConsequenceEngine'
import type { AgentJonesEventIntelligenceLayer } from '../agentJonesEventIntelligenceBridge'

export const EVENT_AI_ORCHESTRATION_MODES = [
  'event_mission_brief',
  'event_plan_review',
  'event_risk_diagnosis',
  'event_staffing_analysis',
  'event_communications_analysis',
  'event_approval_review',
  'event_delta_review',
  'event_after_action_debrief',
  'event_template_upgrade_review',
  'cross_event_orchestration_review',
  'leadership_attention_brief',
  'department_alignment_review',
  'growth_and_expansion_review',
] as const

export type EventAiOrchestrationModeId = (typeof EVENT_AI_ORCHESTRATION_MODES)[number]

const MODE_LABELS: Record<EventAiOrchestrationModeId, string> = {
  event_mission_brief: 'Event mission brief',
  event_plan_review: 'Event plan review',
  event_risk_diagnosis: 'Event risk diagnosis',
  event_staffing_analysis: 'Staffing analysis',
  event_communications_analysis: 'Communications analysis',
  event_approval_review: 'Approval review',
  event_delta_review: 'Delta / what changed',
  event_after_action_debrief: 'After-action debrief',
  event_template_upgrade_review: 'Template upgrade review',
  cross_event_orchestration_review: 'Cross-event orchestration',
  leadership_attention_brief: 'Leadership attention',
  department_alignment_review: 'Department alignment',
  growth_and_expansion_review: 'Growth & expansion',
}

export function labelForEventAiMode(mode: EventAiOrchestrationModeId): string {
  return MODE_LABELS[mode] ?? mode
}

/**
 * Selects a mode from consequence IDs + event desk signals so lenses stay distinct
 * (not every surface collapses to “mission brief”).
 */
export function inferEventAiOrchestrationMode(input: {
  consequences: readonly CockpitConsequence[]
  cockpit_strip_crisis: boolean
  event_desk_layer: AgentJonesEventIntelligenceLayer | null | undefined
}): EventAiOrchestrationModeId {
  if (input.cockpit_strip_crisis) {
    return 'cross_event_orchestration_review'
  }

  const layer = input.event_desk_layer
  if (layer?.after_action_line && /after-action|after action|documentation|debrief/i.test(layer.after_action_line)) {
    return 'event_after_action_debrief'
  }
  if (layer?.delta_lines?.length) {
    return 'event_delta_review'
  }

  const top = input.consequences[0]?.id
  switch (top) {
    case 'appr_backlog':
    case 'appr_gate':
      return 'event_approval_review'
    case 'comms_risk_cluster':
      return 'event_communications_analysis'
    case 'staffing_strain':
    case 'staffing_watch':
      return 'event_staffing_analysis'
    case 'war_critical':
    case 'live_density':
      return 'event_risk_diagnosis'
    case 'afteraction_debt':
      return 'department_alignment_review'
    default:
      break
  }

  if (layer) {
    return 'event_mission_brief'
  }

  return 'leadership_attention_brief'
}
