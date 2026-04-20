import type { CampaignProfile } from '../hooks/useProfile'
import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'
import { isDevAuthBypassEnabled } from './devAuth'

/**
 * Event record page (`/events/:id`) — coordinators see everything; submitters/owners can view their row.
 */
export function canAccessEventRecordPage(
  profile: CampaignProfile | null | undefined,
  event: CampaignCalendarEventRecord | null,
): boolean {
  if (isDevAuthBypassEnabled()) return true
  if (canAccessEventCoordinatorDesk(profile?.primary_role)) return true
  if (!event) return false
  const pid = profile?.id != null ? String(profile.id).trim() : ''
  if (!pid) return false
  const req = event.requester_user_id != null ? String(event.requester_user_id).trim() : ''
  const own = event.owner_user_id != null ? String(event.owner_user_id).trim() : ''
  return (req && req === pid) || (own && own === pid)
}
