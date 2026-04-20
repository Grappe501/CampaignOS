/**
 * Segmented campaign calendar — one source, filtered views (blueprint 07 / pass 2).
 * Pure functions; consume rows from Supabase or dev fixtures.
 */

import type {
  CalendarFunctionSegment,
  CalendarGeoScopeSegment,
  CalendarLifecycleStatus,
  CalendarVisibilitySegment,
  CampaignCalendarEventRecord,
} from './campaignCalendarArchitecture'

export type CampaignCalendarViewMode = 'agenda' | 'month'

export type CampaignCalendarSegmentFilters = {
  visibility: CalendarVisibilitySegment | ''
  functionSegment: CalendarFunctionSegment | ''
  geoScope: CalendarGeoScopeSegment | ''
  lifecycle: CalendarLifecycleStatus | ''
  /** Matches owner_user_id or owner_role substring (case-insensitive). */
  ownerQuery: string
}

export function inferFunctionSegment(
  e: CampaignCalendarEventRecord,
): CalendarFunctionSegment {
  const t = e.event_type
  if (e.finance_flag || t.includes('fundraising')) return 'fundraising'
  if (t === 'campaign_rally' || t === 'public_fair_festival') return 'public_event'
  if (
    t === 'lunch_meeting' ||
    t === 'coffee_meeting' ||
    t.includes('house_party')
  ) {
    return 'relationship'
  }
  if (t === 'county_party_meeting') return 'field'
  if (e.candidate_flag) return 'candidate_travel'
  return 'field'
}

export function inferGeoScope(e: CampaignCalendarEventRecord): CalendarGeoScopeSegment {
  if (e.precinct_id) return 'precinct'
  if (e.county_id) return 'county'
  if (e.district_id) return 'congressional_district'
  return 'campaign_wide'
}

export function matchesSegmentFilters(
  e: CampaignCalendarEventRecord,
  f: CampaignCalendarSegmentFilters,
): boolean {
  if (f.visibility && e.visibility_scope !== f.visibility) return false
  if (f.functionSegment && inferFunctionSegment(e) !== f.functionSegment) return false
  if (f.geoScope && inferGeoScope(e) !== f.geoScope) return false
  if (f.lifecycle && e.stage_status !== f.lifecycle) return false
  const q = f.ownerQuery.trim().toLowerCase()
  if (q) {
    const uid = (e.owner_user_id ?? '').toLowerCase()
    const role = (e.owner_role ?? '').toLowerCase()
    if (!uid.includes(q) && !role.includes(q)) return false
  }
  return true
}

export function parseEventStartMs(iso: string): number {
  return new Date(iso).getTime()
}

export function sortEventsByStartAsc(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return [...events].sort(
    (a, b) => parseEventStartMs(a.start_at) - parseEventStartMs(b.start_at),
  )
}

/** Next N events at or after `fromMs`, same filter source as dashboards / strip widgets. */
export function pickUpcomingStrip(
  events: readonly CampaignCalendarEventRecord[],
  limit: number,
  fromMs: number = Date.now(),
): CampaignCalendarEventRecord[] {
  return sortEventsByStartAsc(events)
    .filter((e) => parseEventStartMs(e.start_at) >= fromMs)
    .slice(0, limit)
}

/** ISO date key `YYYY-MM-DD` in local timezone. */
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function groupEventsByLocalDay(
  events: readonly CampaignCalendarEventRecord[],
): Map<string, CampaignCalendarEventRecord[]> {
  const map = new Map<string, CampaignCalendarEventRecord[]>()
  for (const e of sortEventsByStartAsc(events)) {
    const key = localDayKey(e.start_at)
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  return map
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** Monday = 0 … Sunday = 6 */
export function weekdayMondayZero(year: number, monthIndex0: number): number {
  const d = new Date(year, monthIndex0, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function applyCalendarSegmentFilters(
  events: readonly CampaignCalendarEventRecord[],
  f: CampaignCalendarSegmentFilters,
): CampaignCalendarEventRecord[] {
  return events.filter((e) => matchesSegmentFilters(e, f))
}
