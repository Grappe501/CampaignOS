/**
 * Canonical automation / orchestration domain (CampaignOS Self-Driving Layer).
 * Single source for trigger kinds, queue status, and routing — not in components.
 */

export const AUTOMATION_SEVERITIES = ['info', 'watch', 'high', 'critical'] as const
export type AutomationSeverity = (typeof AUTOMATION_SEVERITIES)[number]

export const AUTOMATION_CONFIDENCE = ['low', 'medium', 'high'] as const
export type AutomationConfidence = (typeof AUTOMATION_CONFIDENCE)[number]

/** High-level trigger families (deterministic registry). */
export const AUTOMATION_TRIGGER_TYPES = [
  'event_staffing_pressure',
  'approval_queue_backlog',
  'post_event_followup_debt',
  'geographic_command_pressure',
  'command_critical_mass',
  'volunteer_load_hotspot',
  'gotv_site_critical_coverage',
  'gotv_county_cluster_weak',
] as const

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number]

export const AUTOMATION_QUEUE_STATUS = ['open', 'snoozed', 'awaiting_approval', 'closed'] as const
export type AutomationQueueStatus = (typeof AUTOMATION_QUEUE_STATUS)[number]

export const AUTOMATION_APPROVAL_STATE = [
  'not_required',
  'pending',
  'approved',
  'rejected',
] as const
export type AutomationApprovalState = (typeof AUTOMATION_APPROVAL_STATE)[number]

export const AUTOMATION_INTERVENTION_KINDS = [
  'route',
  'task_suggestion',
  'reminder_suggestion',
  'approval_request',
  'escalation',
  'advisory',
] as const
export type AutomationInterventionKind = (typeof AUTOMATION_INTERVENTION_KINDS)[number]

export const AUTOMATION_EXECUTION_MODES = [
  'auto_tracked',
  'requires_approval',
  'advisory_only',
] as const
export type AutomationExecutionMode = (typeof AUTOMATION_EXECUTION_MODES)[number]

export const AUTOMATION_TARGET_TYPES = ['event', 'county', 'campaign', 'volunteer', 'none'] as const
export type AutomationTargetType = (typeof AUTOMATION_TARGET_TYPES)[number]

export const AUTOMATION_CLOSED_REASONS = [
  'completed',
  'dismissed',
  'failed',
  'superseded',
  'rejected',
  'expired',
] as const
export type AutomationClosedReason = (typeof AUTOMATION_CLOSED_REASONS)[number]

export type AutomationTriggerFiring = {
  trigger_type: AutomationTriggerType
  dedupe_key: string
  severity: AutomationSeverity
  confidence: AutomationConfidence
  title: string
  explanation: string
  owner_role_hint: string
  target_type: AutomationTargetType | null
  target_id: string | null
  metadata?: Record<string, unknown>
}

export type AutomationActionRecommendation = AutomationTriggerFiring & {
  intervention_kind: AutomationInterventionKind
  execution_mode: AutomationExecutionMode
  route_path: string | null
}

export type AutomationActionRow = {
  id: string
  campaign_id: string
  dedupe_key: string
  trigger_type: string
  severity: AutomationSeverity
  confidence: AutomationConfidence
  title: string
  explanation: string
  owner_role_hint: string | null
  intervention_kind: AutomationInterventionKind
  execution_mode: AutomationExecutionMode
  route_path: string | null
  target_type: AutomationTargetType | null
  target_id: string | null
  status: AutomationQueueStatus
  approval_state: AutomationApprovalState
  snoozed_until: string | null
  metadata: Record<string, unknown>
  closed_reason: AutomationClosedReason | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export function severityOrder(s: AutomationSeverity): number {
  const o: Record<AutomationSeverity, number> = {
    info: 0,
    watch: 1,
    high: 2,
    critical: 3,
  }
  return o[s] ?? 0
}
