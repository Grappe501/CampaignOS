/**
 * Core orchestration concepts — structured, versioned, advisory only.
 * App state remains authoritative; this layer describes synthesized views.
 */

import type { CockpitModuleId } from '../cockpit/cockpitWorkspaceSchemas'

export type EventAiConfidenceBand = 'high' | 'medium' | 'low' | 'sparse'

export type EventAiExplanation = {
  id: string
  title: string
  detail: string
  /** Grounding note: which subsystem supplied evidence */
  source_hint:
    | 'leadership_briefing'
    | 'event_row'
    | 'cockpit_graph'
    | 'similar_events'
    | 'tasks'
    | 'comms_pipeline'
    | 'other'
}

export type EventAiConfidence = {
  band: EventAiConfidenceBand
  /** Human-readable why confidence is limited */
  limitation_lines: string[]
}

/** Versioned envelope for any orchestration-facing intelligence payload. */
export type EventAiIntelligenceEnvelopeV1 = {
  v: 1
  generated_at_ms: number
  campaign_id: string
  /** Correlation ids (event IDs, task IDs, opaque). */
  entity_ids: string[]
  headline: string
  module_touchpoints: CockpitModuleId[]
}

/** Retrieval slice — deterministic “similar event” path today; vector path later. */
export type EventAiRetrievalContextV1 = {
  v: 1
  generated_at_ms: number
  /** No embeddings stored in client bundle for this release — hash of inputs for refresh dedupe. */
  source_fingerprint: string
  match_summaries: EventAiRetrievalMatch[]
  /**
   * When matches are empty, scored too low, or the pool cannot support ranking —
   * clients must surface this instead of implying “no similar programs exist.”
   */
  fallback_note: string | null
}

export type EventAiRetrievalMatch = {
  id: string
  peer_event_id: string
  label: string
  match_kind: 'analog' | 'warning' | 'caution' | 'success_pattern'
  score_0_100: number
  why_matched: string[]
  useful_because: string
}

/** Graph packet — inter-module + optional event anchor. */
export type EventAiRelationshipGraphPacketV1 = {
  v: 1
  anchor_event_id: string | null
  edge_summaries: string[]
  module_ids: CockpitModuleId[]
}

export type EventAiAuditDisposition = 'accepted' | 'ignored' | 'deferred'

export type EventAiRecommendationAuditRecordV1 = {
  v: 1
  id: string
  created_at_ms: number
  resolved_at_ms: number | null
  disposition: EventAiAuditDisposition
  recommendation_type: string
  related_entity_ids: string[]
  source_mode: string
  explanation_digest: string
}
