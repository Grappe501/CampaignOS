/**
 * Multi-event / war-room command surface — domain types.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventHealthStatusBand } from './eventHealthScoreService'
import type { CommandPanelIssue, TodayCommandEventItem } from './todayCommandService'

export type WarRoomBucket =
  | 'live_now'
  | 'starting_soon'
  | 'next_24_hours'
  | 'next_72_hours'
  | 'at_risk'
  | 'approval_pending'
  | 'debrief_pending'
  | 'recently_completed_needing_followup'
  | 'later'

export type WarRoomViewMode = 'board' | 'timeline' | 'issues' | 'staffing' | 'comms' | 'geo'

export type WarRoomFilters = {
  countyId: string | null
  eventType: string | null
  ownerUserId: string | null
  healthBand: EventHealthStatusBand | 'any'
  objectiveContains: string
}

export type InterventionUrgency = 'now' | 'soon' | 'watch' | 'steady'

export type WarRoomEventRow = {
  item: TodayCommandEventItem
  bucket: WarRoomBucket
  war_room_priority_score: number
  intervention_urgency: InterventionUrgency
  intervention_reason_codes: string[]
  /** Deterministic explainability line derived from `intervention_reason_codes`. */
  intervention_reason_summary: string
  adjusted_health_score: number
  adjusted_status: EventHealthStatusBand
  field_reasons: string[]
  day_of_open_issues: number
  recommended_next_action: string
  /** ISO window label for timeline strip */
  timeline_anchor_ms: number
  /** Day-of workspace: current run-of-show label when live. */
  live_segment_label: string | null
}

export type OwnerCascadeRisk = {
  owner_user_id: string | null
  display_hint: string
  event_ids: string[]
  reason: string
}

/** Same volunteer appears on multiple near-term events (assignment-level signal). */
export type VolunteerStrainRisk = {
  user_id: string
  display_hint: string
  event_ids: string[]
  reason: string
}

export type WarRoomClosureBacklogItem = {
  record: CampaignCalendarEventRecord
  reasons: string[]
}

export type WarRoomSnapshot = {
  generated_at_ms: number
  rows: WarRoomEventRow[]
  top_urgent: WarRoomEventRow[]
  /** Subset for panels; see `cross_event_issues_total` for full command-issue count. */
  issues: CommandPanelIssue[]
  /** Total command issues before truncation (digest + approvals + heuristics). */
  cross_event_issues_total: number
  closure_backlog: WarRoomClosureBacklogItem[]
  /** Total past-end rows with closure/handoff gaps before UI truncation. */
  closure_backlog_total: number
  owner_cascade_risks: OwnerCascadeRisk[]
  volunteer_strain_risks: VolunteerStrainRisk[]
  /** Oldest pending governance request — for rapid actions that require `approval_request_event_id`. */
  pending_approval_event_id: string | null
  /** Rows at score-based “now” band (≥142); not the same as `top_urgent.length` (capped strip). */
  intervention_now_count: number
  agent_jones_brief_lines: string[]
  geo_groups: Array<{ county_id: string | null; label: string; row_count: number; min_health: number }>
}
