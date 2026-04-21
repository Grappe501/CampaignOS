/**
 * Day-of / field execution backlog rollup (browser localStorage v1).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { loadEventDayWorkspace } from './eventDayOfLocalStorage'

export type DayOfFieldGapSummary = {
  eventsMissingWorkspace: number
  openFieldIssues: number
  closureIncompleteEvents: number
}

export function summarizeDayOfFieldGaps(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number = Date.now(),
): DayOfFieldGapSummary {
  if (typeof localStorage === 'undefined') {
    return { eventsMissingWorkspace: 0, openFieldIssues: 0, closureIncompleteEvents: 0 }
  }
  let eventsMissingWorkspace = 0
  let openFieldIssues = 0
  let closureIncompleteEvents = 0

  for (const e of events) {
    const ws = loadEventDayWorkspace(e.event_id)
    if (!ws) {
      eventsMissingWorkspace += 1
      continue
    }
    openFieldIssues += ws.issues.filter((i) => i.status !== 'resolved').length
    const endMs = new Date(e.end_at || e.start_at).getTime()
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      const allDone = ws.closure.items.length > 0 && ws.closure.items.every((x) => x.done)
      if (!allDone) closureIncompleteEvents += 1
    }
  }

  return { eventsMissingWorkspace, openFieldIssues, closureIncompleteEvents }
}
