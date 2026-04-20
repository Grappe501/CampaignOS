import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

const COORDINATOR_REVIEW_STAGE_STATUSES = new Set(['draft', 'submitted'])

export function listEventsNeedingCoordinatorReview(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return [...events].filter((e) => {
    if (e.approval_required && String(e.operational_status ?? '') === 'approval_needed') {
      return true
    }
    return COORDINATOR_REVIEW_STAGE_STATUSES.has(e.stage_status)
  })
}
