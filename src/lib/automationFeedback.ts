/**
 * Completion / outcome helpers (queue semantics — no ML).
 */

import type { AutomationClosedReason, AutomationQueueStatus } from './automationDomain'

export function statusAfterOperatorComplete(): { status: AutomationQueueStatus; closed_reason: AutomationClosedReason } {
  return { status: 'closed', closed_reason: 'completed' }
}

export function statusAfterDismiss(): { status: AutomationQueueStatus; closed_reason: AutomationClosedReason } {
  return { status: 'closed', closed_reason: 'dismissed' }
}

export function statusAfterExpire(): { status: AutomationQueueStatus; closed_reason: AutomationClosedReason } {
  return { status: 'closed', closed_reason: 'expired' }
}
