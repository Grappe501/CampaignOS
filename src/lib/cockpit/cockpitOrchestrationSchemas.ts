/**
 * AI orchestration preparation (Phase 3) — **schemas only**; no runtime orchestrator.
 * Campaign-level Event AI mesh types live in `src/lib/eventAi/` (V3 packet + orchestration envelope).
 *
 * Do **not** surface these as “live automation” in UI until an engine exists; they exist so
 * future simulation/suggestion pipelines share stable types with the cockpit digest layer.
 */

import type { CockpitModuleId } from './cockpitWorkspaceSchemas'

/** Versioned envelope for cross-system context packets. */
export type CockpitOrchestrationPacketV1 = {
  v: 1
  generated_at_ms: number
  /** Source modules that contributed rows (advisory). */
  source_modules: CockpitModuleId[]
  /** Bounded headline stack for planner consumption. */
  headline_stack: string[]
  /** Optional correlation keys when entity IDs exist (opaque strings). */
  entity_correlation_ids?: string[]
}

/** Placeholder — no simulation service is wired; do not label UI as “what-if results”. */
export type CockpitSimulationRequestStub = {
  id: string
  scenario: 'approval_delay' | 'staffing_shock' | 'calendar_slip' | 'comms_failure'
  target_module: CockpitModuleId
  payload_hint: string | null
}

/** Placeholder — persistence/audit for accept/dismiss is future work. */
export type CockpitOrchestrationSuggestionStub = {
  id: string
  title: string
  module: CockpitModuleId
  confidence: 'low' | 'medium' | 'high'
  status: 'proposed' | 'accepted' | 'dismissed'
}
