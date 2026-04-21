/**
 * Single source for “program event” rows used by leadership briefing + Event AI orchestration.
 * Keeps cockpit and event desk aligned on what counts as active program work.
 */

import type { CampaignCalendarEventRecord } from '../campaignCalendarArchitecture'

export function filterProgramEventsForOrchestration(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return events.filter((e) => {
    const s = String(e.stage_status ?? '').toLowerCase()
    return s !== 'canceled' && s !== 'archived'
  })
}
