/**
 * Operational Control Layer — relationship contract (Final Pass).
 *
 * Canonical joins used across Rapid Actions, staffing visibility, and volunteer sustainability:
 * - event_id → campaign_events.id, campaign_event_staffing_assignments.event_id, volunteer_opportunities.event_id
 * - staffing_requirement_id → campaign_event_staffing_assignments.id (role row; marketplace mirrors via staffing_requirement_id)
 * - volunteer_id / assigned_user_id → campaign_profiles.id on assignment rows
 * - approval gating: approval_required + operational_status === 'approval_needed' (see eventSubmissionApproval)
 * - readiness_score & health snapshots: campaign_events.readiness_score + event_health_history
 *
 * All three engines MUST read assignments from `campaign_event_staffing_assignments` + matrix templates
 * (eventStaffingMatrix) — not from row.staffing_state alone.
 */

/** Entity keys referenced across action / visibility / sustainability surfaces */
export type OperationalEntityKey =
  | 'event_id'
  | 'staffing_requirement_id'
  | 'assigned_user_id'
  | 'staff_role_slug'
  | 'approval_request_event_id'
  | 'task_template_slug'
  | 'county_id'

/** Normalized coverage presentation (heatmap + drill-downs) */
export type OperationalCoveragePresentation =
  | 'live'
  | 'pending_request'
  | 'provisional'
  | 'confirmed'
  | 'blocked'
