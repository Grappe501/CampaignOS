/**
 * Pure selectors for war-room buckets, filters, and view helpers.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { hoursToEventStart, isEventLiveWindow } from './multiEventWarRoomTime'
import type { WarRoomBucket, WarRoomEventRow, WarRoomFilters, WarRoomViewMode } from './multiEventWarRoomSchemas'
import type { CommandPanelIssue } from './todayCommandService'

const ISSUE_SECTION_ORDER: readonly CommandPanelIssue['section'][] = [
  'approval',
  'escalation',
  'blocker',
  'staffing_gap',
  'comms_ack',
  'risk_72h',
  'declining',
  'today_action',
  'unowned',
]

export function assignWarRoomBucket(
  record: CampaignCalendarEventRecord,
  nowMs: number,
  opts: {
    adjustedHealth: number
    inApprovalQueue: boolean
    needsDebriefOrClosure: boolean
    recentlyCompletedNeedingFollowup: boolean
  },
): WarRoomBucket {
  /** Execution window beats governance queue for bucket labeling. */
  if (isEventLiveWindow(record, nowMs)) return 'live_now'
  if (opts.inApprovalQueue) return 'approval_pending'
  if (opts.needsDebriefOrClosure) return 'debrief_pending'
  if (opts.recentlyCompletedNeedingFollowup) return 'recently_completed_needing_followup'

  const h = hoursToEventStart(record, nowMs)
  if (h > 0 && h <= 3) return 'starting_soon'
  if (h > 0 && h <= 24) return 'next_24_hours'
  if (h > 0 && h <= 72) return 'next_72_hours'

  if (opts.adjustedHealth < 55 || String(record.staffing_state ?? '').toLowerCase() === 'at_risk') {
    return 'at_risk'
  }

  if (h > 72 || h < -240) return 'later'
  return 'next_72_hours'
}

export function filterWarRoomRows(rows: readonly WarRoomEventRow[], filters: WarRoomFilters): WarRoomEventRow[] {
  return rows.filter((r) => {
    const e = r.item.record
    if (filters.countyId && e.county_id !== filters.countyId) return false
    if (filters.eventType && e.event_type !== filters.eventType) return false
    if (filters.ownerUserId && e.owner_user_id !== filters.ownerUserId) return false
    if (filters.healthBand !== 'any' && r.adjusted_status !== filters.healthBand) return false
    if (filters.objectiveContains.trim()) {
      const o = `${e.event_objective ?? ''} ${e.title}`.toLowerCase()
      if (!o.includes(filters.objectiveContains.trim().toLowerCase())) return false
    }
    return true
  })
}

export function groupRowsByCounty(
  rows: readonly WarRoomEventRow[],
): Array<{ county_id: string | null; label: string; row_count: number; min_health: number }> {
  const m = new Map<string | null, { count: number; minH: number }>()
  for (const r of rows) {
    const k = r.item.record.county_id
    const cur = m.get(k) ?? { count: 0, minH: 100 }
    cur.count += 1
    cur.minH = Math.min(cur.minH, r.adjusted_health_score)
    m.set(k, cur)
  }
  return [...m.entries()]
    .map(([county_id, v]) => ({
      county_id,
      label: county_id ?? 'No county',
      row_count: v.count,
      min_health: v.minH,
    }))
    .sort((a, b) => a.min_health - b.min_health)
}

/** Sort key for view modes (issue-centric, staffing-centric, etc.). */
export function sortRowsForView(rows: WarRoomEventRow[], mode: WarRoomViewMode): WarRoomEventRow[] {
  const copy = [...rows]
  if (mode === 'issues') {
    return copy.sort((a, b) => b.day_of_open_issues + b.item.gaps.length - (a.day_of_open_issues + a.item.gaps.length))
  }
  if (mode === 'staffing') {
    return copy.sort((a, b) => {
      const sa = String(a.item.record.staffing_state ?? '')
      const sb = String(b.item.record.staffing_state ?? '')
      return sa.localeCompare(sb) || b.war_room_priority_score - a.war_room_priority_score
    })
  }
  if (mode === 'comms') {
    return copy.sort((a, b) => {
      const ma = String(a.item.record.mobilize_publish_state ?? '')
      const mb = String(b.item.record.mobilize_publish_state ?? '')
      return ma.localeCompare(mb) || b.war_room_priority_score - a.war_room_priority_score
    })
  }
  if (mode === 'timeline') {
    return copy.sort((a, b) => a.timeline_anchor_ms - b.timeline_anchor_ms)
  }
  if (mode === 'geo') {
    return copy.sort((a, b) => {
      const ca = String(a.item.record.county_id ?? '\u0000')
      const cb = String(b.item.record.county_id ?? '\u0000')
      if (ca !== cb) return ca.localeCompare(cb)
      return b.war_room_priority_score - a.war_room_priority_score
    })
  }
  return copy.sort((a, b) => b.war_room_priority_score - a.war_room_priority_score)
}

export function isEventInApprovalPending(
  record: CampaignCalendarEventRecord,
  pending: readonly CampaignCalendarEventRecord[],
): boolean {
  return pending.some((p) => p.event_id === record.event_id)
}

/** Cross-event issue list grouped by command section (stable drill-down). */
export function groupWarRoomIssuesBySection(
  issues: readonly CommandPanelIssue[],
): Array<{ section: CommandPanelIssue['section']; items: CommandPanelIssue[] }> {
  const m = new Map<CommandPanelIssue['section'], CommandPanelIssue[]>()
  for (const i of issues) {
    if (!m.has(i.section)) m.set(i.section, [])
    m.get(i.section)!.push(i)
  }
  const rank = (s: CommandPanelIssue['section']): number => {
    const ix = ISSUE_SECTION_ORDER.indexOf(s)
    return ix === -1 ? 99 : ix
  }
  return [...m.entries()]
    .map(([section, items]) => ({ section, items }))
    .sort((a, b) => rank(a.section) - rank(b.section) || b.items.length - a.items.length)
}
