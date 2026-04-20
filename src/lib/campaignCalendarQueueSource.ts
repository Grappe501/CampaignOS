/**
 * @deprecated Prefer `CampaignEventsProvider` + `useCampaignEventsContext()` / `useCampaignEvents()`.
 * Returns an empty list — live data is loaded via Supabase hooks.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export function getCoordinatorEventQueueSource(): CampaignCalendarEventRecord[] {
  return []
}
