/**
 * Lightweight effectiveness heuristics (deterministic).
 */

import type { AutomationActionRow } from './automationDomain'

export function staleAutomationHours(row: AutomationActionRow, nowMs: number): number | null {
  const t = new Date(row.created_at).getTime()
  if (Number.isNaN(t)) return null
  return (nowMs - t) / 3_600_000
}

export function isLikelyStale(row: AutomationActionRow, nowMs: number, hours = 72): boolean {
  if (row.status === 'closed') return false
  const h = staleAutomationHours(row, nowMs)
  return h != null && h >= hours && row.severity !== 'critical'
}
