/**
 * Rollups for leadership / desk (pure).
 */

import type { AutomationActionRow } from './automationDomain'
import { groupByTriggerType } from './automationSelectors'

export type AutomationQueueMetrics = {
  open_count: number
  awaiting_approval_count: number
  snoozed_count: number
  by_trigger: Record<string, number>
  critical_open: number
  high_open: number
}

export function computeAutomationQueueMetrics(rows: readonly AutomationActionRow[]): AutomationQueueMetrics {
  const open = rows.filter((r) => r.status === 'open' || r.status === 'snoozed' || r.status === 'awaiting_approval')
  const byTrig = groupByTriggerType(open)
  const by_trigger: Record<string, number> = {}
  for (const [k, v] of byTrig) by_trigger[k] = v.length

  return {
    open_count: open.filter((r) => r.status === 'open').length,
    awaiting_approval_count: open.filter((r) => r.status === 'awaiting_approval').length,
    snoozed_count: open.filter((r) => r.status === 'snoozed').length,
    by_trigger,
    critical_open: open.filter((r) => r.severity === 'critical' && r.status !== 'snoozed').length,
    high_open: open.filter((r) => r.severity === 'high' && r.status !== 'snoozed').length,
  }
}
