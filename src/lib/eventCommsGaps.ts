/**
 * Surface-level comms backlog counts from local workspaces (browser-only v1).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { isEventCompleteForComms } from './eventCommsLifecycle'
import { loadCommunicationsWorkspace } from './eventCommsLocalStorage'

export type EventCommsBacklogSummary = {
  eventsMissingWorkspace: number
  openSteps: number
  recapIncomplete: number
  draftsPendingReview: number
}

export function summarizeCommsBacklog(events: readonly CampaignCalendarEventRecord[]): EventCommsBacklogSummary {
  if (typeof localStorage === 'undefined') {
    return {
      eventsMissingWorkspace: 0,
      openSteps: 0,
      recapIncomplete: 0,
      draftsPendingReview: 0,
    }
  }
  let eventsMissingWorkspace = 0
  let openSteps = 0
  let recapIncomplete = 0
  let draftsPendingReview = 0

  for (const e of events) {
    const ws = loadCommunicationsWorkspace(e.event_id)
    if (!ws) {
      eventsMissingWorkspace += 1
      continue
    }
    openSteps += ws.plan.steps.filter((s) => s.status === 'pending' || s.status === 'draft').length
    if (isEventCompleteForComms(e) && ws.plan.post_event.recap_status !== 'published') {
      recapIncomplete += 1
    }
    draftsPendingReview += ws.drafts.filter((d) => d.ai_generated && !d.reviewed).length
  }

  return { eventsMissingWorkspace, openSteps, recapIncomplete, draftsPendingReview }
}
