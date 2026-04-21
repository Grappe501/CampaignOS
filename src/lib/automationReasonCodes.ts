/**
 * Stable reason codes for automation explainability (logs, UI, Agent Jones).
 */

export const AUTOMATION_REASON = {
  STAFFING_GAP_NEAR_TERM: 'automation.staffing_gap_near_term',
  APPROVAL_BACKLOG: 'automation.approval_backlog',
  POST_EVENT_FOLLOWUP: 'automation.post_event_followup',
  GEO_PRESSURE_CRITICAL: 'automation.geo_pressure_critical',
  COMMAND_CRITICAL_MASS: 'automation.command_critical_mass',
  VOLUNTEER_OVERLOAD: 'automation.volunteer_overload',
  GOTV_SITE_CRITICAL: 'automation.gotv_site_critical',
  GOTV_COUNTY_CLUSTER: 'automation.gotv_county_cluster',
} as const

export type AutomationReasonCode = (typeof AUTOMATION_REASON)[keyof typeof AUTOMATION_REASON]
