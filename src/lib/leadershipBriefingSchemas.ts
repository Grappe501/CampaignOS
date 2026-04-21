/**
 * Leadership / executive briefing — structured digests (client-built; advisory).
 */

import type { LeadershipBriefingEmphasis } from './leadershipBriefingAccess'
import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { ApprovalPrecheckResult } from './approvalPrecheckEngine'

export type LeadershipTrendDirection = 'improving' | 'stable' | 'declining' | 'unknown'

export type LeadershipKpiTrendCard = {
  id: string
  label: string
  window: 'next_7d' | 'next_30d' | 'trailing_7d' | 'trailing_prior_visit'
  trend: LeadershipTrendDirection
  value_display: string
  explanation: string
  /** Grounding: trend only meaningful when a prior browser snapshot exists for this metric family. */
  trend_basis: 'delta_vs_prior' | 'no_prior'
  /** Human delta when prior exists, e.g. "−2 vs prior" */
  delta_note: string | null
}

export type LeadershipExecutivePulse = {
  overall_operational_status: 'strong' | 'watch' | 'concern' | 'no_data'
  overall_line: string
  top_strategic_concern: string | null
  strongest_positive: string | null
  highest_priority_decision: string | null
  staffing_strain_headline: string | null
  comms_bottleneck: string | null
}

export type LeadershipExecutiveCounts = {
  active_program_events: number
  live_now: number
  upcoming_7d: number
  upcoming_30d: number
  /** Count of events with war-room adjusted health band CRITICAL (aligned with multi-event board). */
  critical_risk_events: number
  approval_pending: number
  staffing_incomplete_events: number
  communications_risk_events: number
  /** Follow-up open on completed rows + browser closure-incomplete rollup (may overlap an event). */
  postevent_followup_gaps: number
  postevent_followup_records: number
  postevent_closure_incomplete_digest: number
  /** Compared to last persisted visit (browser) when available */
  trend_vs_prior: LeadershipTrendDirection
  trend_explanation: string | null
  /** Aggregate pressure index (same weighting as trend vs prior); for transparency only. */
  aggregate_pressure_score: number
}

export type LeadershipBriefingMeta = {
  summary_confidence: 'high' | 'medium' | 'low'
  /** When lower confidence: missing staffing map, no prior KPI snapshot, sparse outcome metrics, etc. */
  data_quality_notes: string[]
  trend_basis: 'browser_prior_snapshot' | 'none'
  /** When prior snapshot exists — may be stale for interpretation only */
  prior_snapshot_age_ms: number | null
}

export type LeadershipStrategicRiskRow = {
  event_id: string
  title: string
  event_type: string
  start_at: string
  health_score: number
  status_band: string
  war_room_score: number
  intervention_urgency: string
  top_signal: string
  recommendation: string
}

export type LeadershipDecisionItem = {
  event_id: string
  title: string
  risk_level: string | null
  submitted_at: string | null
  precheck: ApprovalPrecheckResult
  suggested_move: string
  attention_needed: boolean
}

export type LeadershipUpcomingRow = {
  record: CampaignCalendarEventRecord
  health_score: number
  status_band: string
  leadership_attention: boolean
  attention_reason: string | null
  top_risk: string
  recommendation: string
}

export type LeadershipStaffingSustainability = {
  coverage_headline: string
  unstaffed_or_at_risk: number
  partially_staffed: number
  counties_weak_bench: Array<{ county_id: string | null; label: string; events_at_risk: number }>
  owner_hotspots: number
  volunteer_multi_event_strain: number
}

export type LeadershipCommsMediaSummary = {
  headline: string
  events_comms_not_ready: number
  recap_backlog_hint: string
  mobilize_drift_events: number
  digest_comms_open_steps: number
}

export type LeadershipOutcomeMetricsConfidence = 'sparse' | 'partial' | 'full'

export type LeadershipOutcomesSummary = {
  completed_recent_30d: number
  followup_pending: number
  avg_volunteer_outcome: number | null
  avg_voter_contact_outcome: number | null
  /** Logged sample sizes behind optional averages. */
  outcome_sample: { volunteer_n: number; voter_contact_n: number }
  metrics_confidence: LeadershipOutcomeMetricsConfidence
  /** Plain-language caution when averages are thin or unavailable. */
  metrics_confidence_note: string | null
  learning_lines: string[]
}

export type LeadershipRecommendation = {
  title: string
  detail: string
  route_hint: '/events/war-room' | '/events/review-requests' | '/events/calendar' | '/events'
}

/** Full page snapshot — reusable for on-screen + Agent Jones bridge. */
export type LeadershipBriefingSnapshot = {
  generated_at_ms: number
  emphasis: LeadershipBriefingEmphasis
  meta: LeadershipBriefingMeta
  pulse: LeadershipExecutivePulse
  counts: LeadershipExecutiveCounts
  kpi_trends: LeadershipKpiTrendCard[]
  strategic_risks: LeadershipStrategicRiskRow[]
  decision_queue: LeadershipDecisionItem[]
  upcoming_critical: LeadershipUpcomingRow[]
  staffing: LeadershipStaffingSustainability
  comms: LeadershipCommsMediaSummary
  outcomes: LeadershipOutcomesSummary
  recommendations: LeadershipRecommendation[]
  /** Deterministic Agent Jones / morning check-in lines (advisory). */
  agent_jones_executive_lines: string[]
  daily_digest_compact: string
  daily_digest_expanded: string
}
