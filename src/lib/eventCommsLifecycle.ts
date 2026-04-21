/**
 * When an event counts as "finished" for comms/recap/backlog (aligns operational + lifecycle fields).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export function isEventCompleteForComms(record: CampaignCalendarEventRecord): boolean {
  const op = String(record.operational_status ?? '').toLowerCase()
  if (op === 'completed') return true
  const st = String(record.stage_status ?? '').toLowerCase()
  return st === 'completed'
}
