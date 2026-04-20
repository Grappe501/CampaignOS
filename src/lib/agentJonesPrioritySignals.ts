import type {
  AgentJonesOperatingContext,
  AgentJonesPrioritySignal,
  AgentJonesPrioritySignalCategory,
  AgentJonesPrioritySignalSeverity,
} from './agentJonesContextV2'

function inferCategory(id: string, label: string): AgentJonesPrioritySignalCategory {
  const s = `${id} ${label}`.toLowerCase()
  if (s.includes('exception') || s.includes('pending') || s.includes('roster')) {
    return 'exceptions'
  }
  if (s.includes('kpi') || s.includes('target') || s.includes('goal')) {
    return 'kpi'
  }
  if (s.includes('intern') || s.includes('pipeline') || s.includes('first-contact')) {
    return 'intern'
  }
  if (
    s.includes('coord') ||
    s.includes('assign') ||
    s.includes('blocked') ||
    s.includes('overdue') ||
    s.includes('supervis')
  ) {
    return 'coordinator'
  }
  if (s.includes('mission') || s.includes('stall') || s.includes('daily')) {
    return 'missions'
  }
  return 'readiness'
}

function mapSeverity(
  u: AgentJonesOperatingContext['urgent_signals'][number],
  pendingException: boolean,
): AgentJonesPrioritySignalSeverity {
  if (u.severity === 'urgent') return pendingException ? 'critical' : 'high'
  if (u.severity === 'watch') return 'medium'
  return 'low'
}

export function buildAgentJonesPrioritySignals(
  operating: AgentJonesOperatingContext,
): AgentJonesPrioritySignal[] {
  const pending = operating.exception_summary.pending_review
  return operating.urgent_signals.slice(0, 8).map((u) => ({
    id: u.id,
    severity: mapSeverity(u, pending),
    category: inferCategory(u.id, u.label),
    title: u.label.slice(0, 160),
    explanation: (u.explanation || u.label).slice(0, 320),
    owner_hint: u.owner_hint,
    route_hint: u.route_hint,
    target_id: null,
    confidence: 1 as const,
  }))
}
