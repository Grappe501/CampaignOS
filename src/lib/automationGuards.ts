/**
 * Guardrails: map severity + intervention to execution mode (deterministic).
 */

import type {
  AutomationExecutionMode,
  AutomationInterventionKind,
  AutomationSeverity,
} from './automationDomain'

export function executionModeFor(
  severity: AutomationSeverity,
  kind: AutomationInterventionKind,
): AutomationExecutionMode {
  if (kind === 'approval_request' || kind === 'escalation') return 'requires_approval'
  if (kind === 'route' && (severity === 'critical' || severity === 'high')) return 'auto_tracked'
  if (kind === 'route') return 'advisory_only'
  return 'advisory_only'
}
