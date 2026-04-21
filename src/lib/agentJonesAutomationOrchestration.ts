/**
 * Bounded automation / orchestration digest for Agent Jones (advisory — no execution).
 */

import type { AutomationActionRow, AutomationTriggerFiring } from './automationDomain'
import { computeAutomationQueueMetrics } from './automationMetrics'
import { sortActionsBySeverityThenAge } from './automationSelectors'

export type AgentJonesAutomationOrchestrationSnapshot = {
  source: 'automation_orchestration_v1'
  generated_at_ms: number
  deterministic_trigger_count: number
  open_queue_count: number
  awaiting_approval_count: number
  top_triggers: { trigger_type: string; count: number }[]
  top_actions: {
    title: string
    severity: string
    owner_role_hint: string | null
    route_path: string | null
    explanation_one_line: string
    status?: string
  }[]
  pressure_lines: string[]
}

export function buildAgentJonesAutomationOrchestrationSnapshot(input: {
  generatedAtMs: number
  firings: readonly AutomationTriggerFiring[]
  openQueueRows?: readonly AutomationActionRow[] | null
}): AgentJonesAutomationOrchestrationSnapshot | null {
  const { generatedAtMs, firings } = input
  const open = input.openQueueRows ?? []
  if (!firings.length && !open.length) return null

  const metrics = computeAutomationQueueMetrics(open)
  const byTrig = new Map<string, number>()
  for (const f of firings) {
    byTrig.set(f.trigger_type, (byTrig.get(f.trigger_type) ?? 0) + 1)
  }
  const top_triggers = [...byTrig.entries()]
    .map(([trigger_type, count]) => ({ trigger_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const sortedOpen = sortActionsBySeverityThenAge(open)
  const top_actions = sortedOpen.slice(0, 6).map((r) => ({
    title: r.title.slice(0, 120),
    severity: r.severity,
    owner_role_hint: r.owner_role_hint,
    route_path: r.route_path,
    explanation_one_line: r.explanation.slice(0, 200),
    status: r.status,
  }))

  const lines: string[] = []
  if (firings.length) {
    lines.push(
      `Deterministic scan: ${firings.length} active pressure signal(s) — top: ${firings[0]?.title ?? 'review desk'}.`,
    )
  }
  if (metrics.awaiting_approval_count > 0) {
    lines.push(`${metrics.awaiting_approval_count} automation recommendation(s) await approval before routing.`)
  }
  if (metrics.critical_open > 0) {
    lines.push(`${metrics.critical_open} open queue item(s) marked critical — prioritize coordinator desk + war room.`)
  }
  if (!lines.length && open.length) {
    lines.push(`${open.length} item(s) in orchestration queue — review route hints in the desk panel.`)
  }

  return {
    source: 'automation_orchestration_v1',
    generated_at_ms: generatedAtMs,
    deterministic_trigger_count: firings.length,
    open_queue_count: open.filter((r) => r.status !== 'closed').length,
    awaiting_approval_count: metrics.awaiting_approval_count,
    top_triggers,
    top_actions,
    pressure_lines: lines.slice(0, 4),
  }
}
