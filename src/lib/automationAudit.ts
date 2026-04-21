/**
 * Audit event kinds (mirror DB check constraint — for clients and logs).
 */

export const AUTOMATION_AUDIT_EVENT_KINDS = [
  'trigger_logged',
  'action_created',
  'status_change',
  'approval',
  'snooze',
  'dismiss',
  'complete',
  'sync_eval',
] as const

export type AutomationAuditEventKind = (typeof AUTOMATION_AUDIT_EVENT_KINDS)[number]
