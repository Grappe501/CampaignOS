/**
 * Rapid action definitions + permission filtering.
 */

import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'
import type {
  RapidActionContext,
  RapidActionDefinition,
  RapidActionPermissionTier,
  RapidActionType,
} from './rapidActionSchemas'

const ALL: RapidActionDefinition[] = [
  {
    action_type: 'assign_volunteer_to_role',
    label: 'Assign volunteer to role',
    description: 'Insert a staffing assignment row for this event (display name + role).',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Staffing assignment saved.',
    failure_message: 'Could not save staffing assignment.',
  },
  {
    action_type: 'reassign_volunteer_to_role',
    label: 'Reassign volunteer to role',
    description: 'Update the first matching staffing row for this role (name + optional user id).',
    target_entity_type: 'staffing_assignment',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Staffing row updated.',
    failure_message: 'Could not reassign.',
  },
  {
    action_type: 'confirm_provisional_coverage',
    label: 'Confirm provisional coverage',
    description: 'Mark invited rows for a role as confirmed when commitments are firm.',
    target_entity_type: 'staffing_gap',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Coverage confirmed on staffing rows.',
    failure_message: 'Could not confirm.',
  },
  {
    action_type: 'create_assignment',
    label: 'Create assignment',
    description: 'Same as assign — adds a row in campaign_event_staffing_assignments.',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Assignment created.',
    failure_message: 'Assignment failed.',
  },
  {
    action_type: 'create_shift_slot',
    label: 'Create shift slot',
    description: 'Add a labeled shift window to an assignment row.',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Shift slot recorded.',
    failure_message: 'Could not create shift slot.',
  },
  {
    action_type: 'fill_open_staffing_gap',
    label: 'Fill staffing gap',
    description: 'Jump to staffing matrix with context.',
    target_entity_type: 'staffing_gap',
    required_permission: 'field',
    confirmation_required: false,
    ui_mode: 'navigate_only',
    preconditions: ['event_id'],
    success_message: 'Opened staffing section.',
    failure_message: 'Navigation failed.',
  },
  {
    action_type: 'send_reminder',
    label: 'Send reminder',
    description: 'Log a reminder intent on the event notes (comms integration hooks here).',
    target_entity_type: 'event',
    required_permission: 'field',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Reminder logged on event record.',
    failure_message: 'Could not update notes.',
  },
  {
    action_type: 'resend_acknowledgment_request',
    label: 'Resend acknowledgment',
    description: 'Log a resend request for volunteer confirmations.',
    target_entity_type: 'volunteer',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'instant',
    preconditions: ['event_id'],
    success_message: 'Acknowledgment resend logged.',
    failure_message: 'Could not log acknowledgment resend.',
  },
  {
    action_type: 'generate_followup_task',
    label: 'Generate follow-up task',
    description: 'Insert an ad-hoc workflow task row for this event.',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Follow-up task created.',
    failure_message: 'Could not create task.',
  },
  {
    action_type: 'mark_issue_escalation',
    label: 'Mark for escalation',
    description: 'Append escalation flag to event notes.',
    target_entity_type: 'issue_panel',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Escalation recorded.',
    failure_message: 'Could not record escalation.',
  },
  {
    action_type: 'approve_request',
    label: 'Approve request',
    description: 'Run approval RPC for pending volunteer/neighborhood requests.',
    target_entity_type: 'approval_request',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['approval_request_event_id'],
    success_message: 'Event approved.',
    failure_message: 'Approval failed.',
  },
  {
    action_type: 'reject_request',
    label: 'Reject request',
    description: 'Reject pending request with notes.',
    target_entity_type: 'approval_request',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'modal',
    preconditions: ['approval_request_event_id'],
    success_message: 'Request rejected.',
    failure_message: 'Reject failed.',
  },
  {
    action_type: 'request_changes',
    label: 'Request changes',
    description: 'Log coordinator feedback on the event record.',
    target_entity_type: 'approval_request',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['approval_request_event_id'],
    success_message: 'Change request logged.',
    failure_message: 'Could not log change request.',
  },
  {
    action_type: 'add_missing_asset_task',
    label: 'Add missing asset task',
    description: 'Insert a logistics-style checklist task.',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Asset task added.',
    failure_message: 'Could not add asset task.',
  },
  {
    action_type: 'add_communication_step',
    label: 'Add communication step',
    description: 'Log a communication step on the event notes.',
    target_entity_type: 'communication',
    required_permission: 'field',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Communication step logged.',
    failure_message: 'Could not log communication.',
  },
  {
    action_type: 'create_backup_staffing_role',
    label: 'Add backup staffing row',
    description: 'Insert backup assignment for a role (invited).',
    target_entity_type: 'staffing_gap',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id', 'staff_role_slug'],
    success_message: 'Backup staffing row created.',
    failure_message: 'Could not add backup row.',
  },
  {
    action_type: 'duplicate_event_workflow_step',
    label: 'Duplicate workflow step',
    description: 'Clone a task instance by title (operational duplicate).',
    target_entity_type: 'event',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Workflow step duplicated.',
    failure_message: 'Duplicate failed.',
  },
  {
    action_type: 'open_event_playbook',
    label: 'Open event playbook',
    description: 'Navigate to command / documentation anchors.',
    target_entity_type: 'event',
    required_permission: 'viewer',
    confirmation_required: false,
    ui_mode: 'navigate_only',
    preconditions: ['event_id'],
    success_message: 'Opened playbook section.',
    failure_message: 'Navigation failed.',
  },
  {
    action_type: 'launch_quick_outreach_flow',
    label: 'Quick outreach flow',
    description: 'Open Mobilize / outreach context (navigate).',
    target_entity_type: 'event',
    required_permission: 'field',
    confirmation_required: false,
    ui_mode: 'navigate_only',
    preconditions: ['event_id'],
    success_message: 'Outreach context opened.',
    failure_message: 'Navigation failed.',
  },
  {
    action_type: 'create_note_risk_flag',
    label: 'Note / risk flag',
    description: 'Append structured risk text to notes.',
    target_entity_type: 'event',
    required_permission: 'field',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Risk note saved.',
    failure_message: 'Could not save note.',
  },
  {
    action_type: 'regenerate_recommendations',
    label: 'Regenerate recommendations',
    description: 'Refresh deterministic command recommendations (client).',
    target_entity_type: 'event',
    required_permission: 'viewer',
    confirmation_required: false,
    ui_mode: 'instant',
    preconditions: ['event_id'],
    success_message: 'Recommendations refreshed.',
    failure_message: 'Refresh failed.',
  },
  {
    action_type: 'convert_gap_to_marketplace_opportunity',
    label: 'Publish gap to marketplace',
    description: 'Create a volunteer_opportunity row tied to a staffing assignment.',
    target_entity_type: 'staffing_gap',
    required_permission: 'coordinator',
    confirmation_required: true,
    ui_mode: 'instant',
    preconditions: ['event_id', 'staff_role_slug'],
    success_message: 'Opportunity published.',
    failure_message: 'Marketplace insert failed.',
  },
  {
    action_type: 'mark_role_conditionally_covered',
    label: 'Mark conditionally covered',
    description: 'Note provisional coverage in event notes.',
    target_entity_type: 'staffing_gap',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id', 'staff_role_slug'],
    success_message: 'Conditional coverage noted.',
    failure_message: 'Could not save note.',
  },
  {
    action_type: 'assign_issue_owner',
    label: 'Assign issue owner',
    description: 'Reference owner on notes (full owner field edit is separate).',
    target_entity_type: 'issue_panel',
    required_permission: 'coordinator',
    confirmation_required: false,
    ui_mode: 'modal',
    preconditions: ['event_id'],
    success_message: 'Issue ownership note saved.',
    failure_message: 'Could not save.',
  },
  {
    action_type: 'navigate_staffing_section',
    label: 'Open staffing',
    description: 'Scroll to staffing section.',
    target_entity_type: 'event',
    required_permission: 'viewer',
    confirmation_required: false,
    ui_mode: 'navigate_only',
    preconditions: ['event_id'],
    success_message: 'Navigated.',
    failure_message: 'Navigation failed.',
  },
  {
    action_type: 'navigate_readiness_section',
    label: 'Open readiness',
    description: 'Scroll to readiness command card.',
    target_entity_type: 'event',
    required_permission: 'viewer',
    confirmation_required: false,
    ui_mode: 'navigate_only',
    preconditions: ['event_id'],
    success_message: 'Navigated.',
    failure_message: 'Navigation failed.',
  },
]

const TIER_ORDER: Record<RapidActionPermissionTier, number> = {
  viewer: 0,
  field: 1,
  coordinator: 2,
  management: 3,
}

/** Map profile role to rapid-action tier (client-side gate; server RPCs still enforce RLS). */
export function rapidActionTierFromProfile(primaryRole: string | null | undefined): RapidActionPermissionTier {
  if (canAccessEventCoordinatorDesk(primaryRole)) {
    const k = String(primaryRole ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
    if (k === 'admin' || k === 'staff') return 'management'
    if (k === 'candidate') return 'coordinator'
    return 'coordinator'
  }
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (k.includes('captain') || k.includes('lead') || k.includes('precinct')) return 'field'
  return 'viewer'
}

export function tierMeetsRequired(
  user: RapidActionPermissionTier,
  required: RapidActionPermissionTier,
): boolean {
  return TIER_ORDER[user] >= TIER_ORDER[required]
}

function preconditionsMet(
  ctx: RapidActionContext,
  keys: readonly string[],
): boolean {
  for (const k of keys) {
    const v = (ctx as Record<string, unknown>)[k]
    if (v == null || v === '') return false
  }
  return true
}

export function getRapidActionDefinition(type: RapidActionType): RapidActionDefinition | undefined {
  return ALL.find((a) => a.action_type === type)
}

export function listRapidActionsForContext(
  ctx: RapidActionContext,
  userTier: RapidActionPermissionTier,
): RapidActionDefinition[] {
  return ALL.filter((def) => {
    if (!tierMeetsRequired(userTier, def.required_permission)) return false
    return preconditionsMet(ctx, def.preconditions)
  })
}

export const RAPID_ACTION_CATALOG: readonly RapidActionDefinition[] = ALL
