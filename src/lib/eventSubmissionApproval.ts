import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export function eventIsPendingVolunteerRequest(e: CampaignCalendarEventRecord): boolean {
  return Boolean(e.approval_required) && String(e.operational_status ?? '') === 'approval_needed'
}
