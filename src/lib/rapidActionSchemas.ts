/**
 * Rapid Actions metadata — operational command surface (Step 3.2).
 */

export type RapidActionTargetEntity =
  | 'event'
  | 'staffing_gap'
  | 'staffing_assignment'
  | 'volunteer'
  | 'approval_request'
  | 'issue_panel'
  | 'communication'
  | 'none'

/** Permission ladder: higher index = more capability. */
export type RapidActionPermissionTier = 'viewer' | 'field' | 'coordinator' | 'management'

export type RapidActionType =
  | 'assign_volunteer_to_role'
  | 'reassign_volunteer_to_role'
  | 'confirm_provisional_coverage'
  | 'create_assignment'
  | 'create_shift_slot'
  | 'fill_open_staffing_gap'
  | 'send_reminder'
  | 'resend_acknowledgment_request'
  | 'generate_followup_task'
  | 'mark_issue_escalation'
  | 'approve_request'
  | 'reject_request'
  | 'request_changes'
  | 'add_missing_asset_task'
  | 'add_communication_step'
  | 'create_backup_staffing_role'
  | 'duplicate_event_workflow_step'
  | 'open_event_playbook'
  | 'launch_quick_outreach_flow'
  | 'create_note_risk_flag'
  | 'regenerate_recommendations'
  | 'convert_gap_to_marketplace_opportunity'
  | 'mark_role_conditionally_covered'
  | 'assign_issue_owner'
  | 'navigate_staffing_section'
  | 'navigate_readiness_section'

export type RapidActionUiMode = 'instant' | 'modal' | 'navigate_only'

export type RapidActionDefinition = {
  action_type: RapidActionType
  label: string
  description: string
  target_entity_type: RapidActionTargetEntity
  required_permission: RapidActionPermissionTier
  /** If false, action runs without confirmation dialog. */
  confirmation_required: boolean
  ui_mode: RapidActionUiMode
  /** Context keys that must be present (non-null) for the action to appear. */
  preconditions: readonly string[]
  success_message: string
  failure_message: string
}

export type RapidActionContext = {
  source: 'event_command' | 'events_dashboard' | 'today_command' | 'approval_queue' | 'staffing_view' | 'heatmap' | 'calendar'
  event_id: string | null
  event_title: string | null
  /** Staff role slug when focused on a gap or assignment. */
  staff_role_slug: string | null
  /** Volunteer profile id when focused on a person. */
  volunteer_user_id: string | null
  approval_request_event_id: string | null
  issue_summary: string | null
  county_id: string | null
  owner_user_id: string | null
}

export type RapidActionAuditEntry = {
  action_type: RapidActionType
  initiated_by: string | null
  initiated_at: string
  affected_records: { table: string; id?: string; event_id?: string }[]
  state_delta_summary: string | null
  ok: boolean
  error_message?: string | null
}

export type RapidActionRecommendation = {
  id: string
  recommended_action_type: RapidActionType
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason_summary: string
  expected_impact: string
  owner_role: string
  linked_issue_id: string | null
  event_id: string | null
  event_title: string | null
}
