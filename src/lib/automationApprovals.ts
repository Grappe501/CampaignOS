/**
 * Approval workflow helpers (queue row state — human decisions only).
 */

import type { AutomationApprovalState, AutomationExecutionMode, AutomationQueueStatus } from './automationDomain'

export function queueStatusForNewAction(
  mode: AutomationExecutionMode,
): AutomationQueueStatus {
  return mode === 'requires_approval' ? 'awaiting_approval' : 'open'
}

export function canApprove(role: string | null | undefined): boolean {
  const r = String(role ?? '').toLowerCase()
  return (
    r === 'admin' ||
    r === 'campaign_manager' ||
    r === 'staff' ||
    r === 'coordinator' ||
    r === 'event_coordinator'
  )
}

export function normalizeApprovalOnReject(): { approval_state: AutomationApprovalState; status: AutomationQueueStatus } {
  return { approval_state: 'rejected', status: 'closed' }
}

export function normalizeApprovalOnApprove(): { approval_state: AutomationApprovalState; status: AutomationQueueStatus } {
  return { approval_state: 'approved', status: 'open' }
}
