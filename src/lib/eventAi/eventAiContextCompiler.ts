/**
 * Compiles orchestration bundles into bounded Agent Jones wire context (server-validated).
 */

import type { AgentJonesEventAiOrchestration } from '../agentJonesContextV2'
import {
  EVENT_AI_INTELLIGENCE_PACKET_VERSION,
  EVENT_AI_ORCHESTRATION_CONTEXT_VERSION,
} from './eventAiPacketVersions'
import type { EventAiOrchestrationBundle } from './eventAiOrchestrationEngine'

export function compileAgentJonesEventAiOrchestration(
  bundle: EventAiOrchestrationBundle,
  input: {
    scope: AgentJonesEventAiOrchestration['scope']
    completeness_pct: number
    data_gap_warnings: string[]
  },
): AgentJonesEventAiOrchestration {
  const risks = bundle.consequences.map((c) => c.impact_summary.slice(0, 220))
  const recDigest = bundle.recommendation_stubs.map(
    (r) => `[${r.type}] ${r.explanation.slice(0, 180)}`,
  )

  const retrieval_matches = bundle.retrieval_matches.slice(0, 6).map((m) => ({
    label: m.label.slice(0, 200),
    match_kind: m.match_kind.slice(0, 48),
    why_matched: m.why_matched.slice(0, 280),
  }))

  return {
    packet_version: EVENT_AI_INTELLIGENCE_PACKET_VERSION,
    context_version: EVENT_AI_ORCHESTRATION_CONTEXT_VERSION,
    scope: input.scope,
    active_mode: bundle.active_mode,
    completeness_pct: Math.max(0, Math.min(100, Math.round(input.completeness_pct))),
    data_gap_warnings: input.data_gap_warnings.slice(0, 8),
    mesh_headline: bundle.mesh_headline.slice(0, 420),
    connected_systems_in_play: bundle.cross_module_ids.slice(0, 14),
    top_cross_system_risks: risks.slice(0, 6),
    retrieval_matches,
    relationship_edges_summary: bundle.graph_edge_lines.slice(0, 10),
    simulation_ready_scenarios: bundle.simulation_scenarios_available.map(String),
    alignment_gap_lines: bundle.department_alignment.slice(0, 6),
    growth_expansion_lines: bundle.growth_expansion.slice(0, 5),
    recommendation_digest_lines: recDigest.slice(0, 6),
    audit_note: bundle.audit_note.slice(0, 420),
    retrieval_fallback_note: bundle.retrieval_fallback_note
      ? bundle.retrieval_fallback_note.slice(0, 280)
      : null,
  }
}
