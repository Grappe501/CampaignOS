/**
 * Pure selectors for leadership prioritization and rollups.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { normalizeFollowupPhase } from './eventPostEventWorkflow'
import { hoursToEventStart } from './multiEventWarRoomTime'

export function safeEventTitle(title: string | null | undefined): string {
  const t = String(title ?? '').trim()
  return t || 'Untitled event'
}

export function filterProgramEvents(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return [...events].filter((e) => {
    const s = String(e.stage_status ?? '').toLowerCase()
    return s !== 'canceled' && s !== 'archived'
  })
}

export function isCommunicationsRisk(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  const h = hoursToEventStart(record, nowMs)
  if (h < -48 || h > 168) return false
  const m = String(record.mobilize_publish_state ?? '').toLowerCase()
  return m !== 'published' && m !== 'not_applicable'
}

export function isStaffingGap(record: CampaignCalendarEventRecord): boolean {
  const s = String(record.staffing_state ?? '').toLowerCase()
  return s === 'unstaffed' || s === 'at_risk' || s === 'partially_staffed'
}

export function isHighVisibility(record: CampaignCalendarEventRecord): boolean {
  if (record.candidate_flag) return true
  const vis = String(record.visibility_scope ?? '').toLowerCase()
  if (vis.includes('public') || vis === 'leadership_only') return true
  const fn = String(record.event_objective ?? '').toLowerCase()
  return /press|media|rally|town hall|debate/.test(fn)
}

export function eventInNextDays(record: CampaignCalendarEventRecord, nowMs: number, days: number): boolean {
  const h = hoursToEventStart(record, nowMs)
  return h >= 0 && h <= days * 24
}

export function completedNeedsFollowup(record: CampaignCalendarEventRecord): boolean {
  const st = String(record.stage_status ?? '').toLowerCase()
  if (st !== 'completed') return false
  const fu = String(record.followup_state ?? '').toLowerCase()
  return fu === '' || fu === 'pending' || fu === 'needed'
}

/** Completed events whose follow-up phase is not closed (calendar row only; pair with outcome rollups for DB truth). */
export function completedEventsWithOpenFollowupPhase(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return events.filter((e) => {
    const st = String(e.stage_status ?? '').toLowerCase()
    if (st !== 'completed') return false
    return normalizeFollowupPhase(e.followup_state) !== 'complete'
  })
}

/** Counties with at least one program in a staffing-gap state (unstaffed / partial / at_risk). */
export function countyWeakBenchRollup(
  events: readonly CampaignCalendarEventRecord[],
): Map<string | null, number> {
  const m = new Map<string | null, number>()
  for (const e of events) {
    if (!isStaffingGap(e)) continue
    const k = e.county_id
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export {
  buildVolunteerThroughputLeadershipRollup as volunteerThroughputLeadershipRollup,
  type VolunteerThroughputLeadershipRollup,
} from './volunteerThroughputMetrics'
