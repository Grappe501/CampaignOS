/**
 * Event AI Intelligence Packet V3 — unified cross-domain view for one program event.
 * Composes the legacy `EventIntelligencePacket` with operational extensions.
 */

import type { EventIntelligencePacket } from '../campaignEventDomain'
import type { EventAiConfidence } from './eventAiOrchestrationSchemas'
import { EVENT_AI_INTELLIGENCE_PACKET_VERSION } from './eventAiPacketVersions'

export type EventAiSignupIngestionState = 'unknown' | 'not_started' | 'partial' | 'complete' | 'failed'

export type EventAiIntelligencePacketV3 = {
  packet_version: typeof EVENT_AI_INTELLIGENCE_PACKET_VERSION
  generated_at_ms: number
  campaign_id: string
  /** Core domain packet — source-aligned fields */
  core: EventIntelligencePacket
  confidence: EventAiConfidence
  /** Subsystems — null when not loaded (honest sparsity) */
  approval_state: {
    summary: string
    pending_count_hint: number | null
  } | null
  staffing: {
    requirements_summary: string | null
    gap_summary: string | null
    heatmap_hint: string | null
  } | null
  volunteer_load: {
    warnings: string[]
    balancer_hint: string | null
  } | null
  communications: {
    plan_state: string | null
    press_media_state: string | null
  } | null
  media_library: {
    readiness: string | null
  } | null
  run_of_show: {
    state: string | null
  } | null
  issue_log: {
    open_count: number | null
    stale_count: number | null
  } | null
  day_of_live: {
    active: boolean
    lines: string[]
  } | null
  after_action: {
    score_line: string | null
    learning_gaps: string[]
  } | null
  similar_events: {
    top_match_ids: string[]
    pattern_notes: string[]
  } | null
  leadership_attention: {
    summary: string | null
  } | null
  candidate_schedule: {
    conflict_hint: string | null
  } | null
  finance_signal: {
    constraint_line: string | null
  } | null
  signup_sheet_ingestion: {
    state: EventAiSignupIngestionState
    note: string | null
  } | null
  follow_up_downstream: {
    open_followups: number | null
  } | null
  workbench_tasks: {
    open_task_titles: string[]
  } | null
  blockers: string[]
  deterministic_next_actions: string[]
}
