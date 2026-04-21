/**
 * Simulation / what-if — structured I/O. AI may narrate impact; app executes nothing here.
 */

import type { CockpitModuleId } from '../cockpit/cockpitWorkspaceSchemas'

export type EventAiSimulationScenarioId =
  | 'approval_delay'
  | 'volunteer_lead_dropout'
  | 'comms_slip_48h'
  | 'event_date_shift_1d'
  | 'overlapping_events'
  | 'department_step_incomplete'
  | 'scale_event_type_counties'
  | 'reassign_leadership_circle'

export type EventAiSimulationInputCompleteness = 'full' | 'partial' | 'sparse'

export type EventAiSimulationRequestV1 = {
  v: 1
  id: string
  created_at_ms: number
  scenario: EventAiSimulationScenarioId
  /** Primary event or module focus */
  anchor_event_id: string | null
  target_module: CockpitModuleId | null
  /** User phrasing — bounded */
  operator_question: string | null
  /** Deterministic facts supplied by the app (not model-invented). */
  deterministic_inputs: string[]
  /** Built client-side from visible rows — omit or `sparse` forces assumption discipline in results. */
  input_completeness?: EventAiSimulationInputCompleteness
}

export type EventAiSimulationResultV1 = {
  v: 1
  request_id: string
  generated_at_ms: number
  projected_impacts: string[]
  affected_systems: string[]
  confidence: 'low' | 'medium' | 'high'
  major_assumptions: string[]
  suggested_mitigations: string[]
  likely_next_moves: string[]
  /** Narrative layer is advisory; structured fields above are canonical hints. */
  synthesis_note: string | null
  /** Standard reminder — not measured fact. */
  not_production_truth_disclaimer?: string
}

export type EventAiScenarioModelStubV1 = {
  v: 1
  scenario: EventAiSimulationScenarioId
  label: string
  /** Deterministic prep only — no Monte Carlo in this release */
  input_keys: string[]
}
