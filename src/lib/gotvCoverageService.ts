/**
 * Merge sites, shifts, and assignments for command views.
 */

import type { GotvPollingPlaceRow, GotvSiteAssignmentRow, GotvSiteShiftRow } from './gotvDomain'

export function assignmentsByShiftIdMap(
  assignments: readonly GotvSiteAssignmentRow[],
): Map<string, GotvSiteAssignmentRow[]> {
  const m = new Map<string, GotvSiteAssignmentRow[]>()
  for (const a of assignments) {
    const cur = m.get(a.shift_id) ?? []
    cur.push(a)
    m.set(a.shift_id, cur)
  }
  return m
}

export function shiftsBySiteIdMap(shifts: readonly GotvSiteShiftRow[]): Map<string, GotvSiteShiftRow[]> {
  const m = new Map<string, GotvSiteShiftRow[]>()
  for (const s of shifts) {
    const cur = m.get(s.site_id) ?? []
    cur.push(s)
    m.set(s.site_id, cur)
  }
  return m
}

export function activeSites(sites: readonly GotvPollingPlaceRow[]): GotvPollingPlaceRow[] {
  return sites.filter((s) => s.status === 'active')
}
