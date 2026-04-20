/**
 * Single import for coordinator queue UIs (pass 3).
 * Today: dev fixtures only. Next: swap to Supabase hook without changing consumers.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { getDevCalendarFixtureEvents } from './campaignCalendarDevFixtures'

export function getCoordinatorEventQueueSource(): CampaignCalendarEventRecord[] {
  return getDevCalendarFixtureEvents()
}
