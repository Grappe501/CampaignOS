/**
 * Shared time windows for war-room (single source for live / end / hours-to-start).
 * Hardens against missing or invalid `start_at` / `end_at`.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

const DEFAULT_DURATION_MS = 3600000

export function safeEventStartMs(record: CampaignCalendarEventRecord): number | null {
  const t = new Date(record.start_at).getTime()
  return Number.isNaN(t) ? null : t
}

export function safeEventEndMs(record: CampaignCalendarEventRecord): number | null {
  const s = safeEventStartMs(record)
  if (s == null) return null
  const e = new Date(record.end_at || record.start_at).getTime()
  if (Number.isNaN(e)) return s + DEFAULT_DURATION_MS
  return e < s ? s + DEFAULT_DURATION_MS : e
}

export function isEventLiveWindow(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  const s = safeEventStartMs(record)
  const e = safeEventEndMs(record)
  if (s == null || e == null) return false
  return nowMs >= s && nowMs <= e
}

/** Hours until start; negative = already started; invalid start → large positive sentinel. */
export function hoursToEventStart(record: CampaignCalendarEventRecord, nowMs: number): number {
  const s = safeEventStartMs(record)
  if (s == null) return 99999
  return (s - nowMs) / 3600000
}

export function isPastEventEnd(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  const e = safeEventEndMs(record)
  if (e == null) return false
  return nowMs > e
}
