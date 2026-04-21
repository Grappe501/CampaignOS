/**
 * Typed recommendation registry — in-memory + optional persistence sync.
 */

import type { CockpitConsequence } from '../cockpit/cockpitConsequenceEngine'
import type { EventAiAuditDisposition } from './eventAiOrchestrationSchemas'
import { EVENT_AI_REGISTRY_SCHEMA_VERSION } from './eventAiPacketVersions'
import type { EventAiOrchestrationModeId } from './eventAiModeRegistry'

export type EventAiRecommendationCategory =
  | 'staffing'
  | 'communications'
  | 'approval'
  | 'scheduling'
  | 'leadership_coordination'
  | 'escalation'
  | 'template_refinement'
  | 'growth_expansion'
  | 'department_alignment'
  | 'other'

export type EventAiRecommendationRecord = {
  schema_version: typeof EVENT_AI_REGISTRY_SCHEMA_VERSION
  id: string
  created_at_ms: number
  type: EventAiRecommendationCategory
  source_mode: EventAiOrchestrationModeId
  related_entity_ids: string[]
  explanation: string
  impact_estimate: string | null
  confidence: 'low' | 'medium' | 'high'
  suggested_owner: string | null
  suggested_action_path: string | null
  disposition: EventAiAuditDisposition | 'proposed'
  resolved_at_ms: number | null
}

export function createRecommendationStub(
  partial: Omit<EventAiRecommendationRecord, 'schema_version' | 'disposition' | 'resolved_at_ms'> & {
    id?: string
  },
): EventAiRecommendationRecord {
  const now = partial.created_at_ms ?? Date.now()
  return {
    schema_version: EVENT_AI_REGISTRY_SCHEMA_VERSION,
    id: partial.id ?? `rec_${String(now)}`,
    created_at_ms: now,
    disposition: 'proposed',
    resolved_at_ms: null,
    type: partial.type,
    source_mode: partial.source_mode,
    related_entity_ids: partial.related_entity_ids,
    explanation: partial.explanation,
    impact_estimate: partial.impact_estimate ?? null,
    confidence: partial.confidence,
    suggested_owner: partial.suggested_owner ?? null,
    suggested_action_path: partial.suggested_action_path ?? null,
  }
}

const TIME_IMPACT: Record<CockpitConsequence['time_sensitivity'], string> = {
  now: 'Time-critical (now)',
  today: 'Due today',
  this_week: 'Due this week',
  soon: 'Approaching',
  none: 'Not time-bound in briefing snapshot',
}

/** Maps cockpit consequence timing to a stable impact line (not duplicate prose). */
export function mapTimeSensitivityToImpactEstimate(
  ts: CockpitConsequence['time_sensitivity'],
): string {
  return TIME_IMPACT[ts] ?? 'See operational queue'
}

/** Drop near-duplicate lines when multiple stubs are emitted. */
export function dedupeEventAiRecommendations(
  rows: EventAiRecommendationRecord[],
): EventAiRecommendationRecord[] {
  const seen = new Set<string>()
  const out: EventAiRecommendationRecord[] = []
  for (const r of rows) {
    const k = `${r.type}|${r.explanation.trim().toLowerCase().slice(0, 160)}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}
