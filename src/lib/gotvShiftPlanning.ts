/**
 * Shift planning helpers (pure).
 */

import type { GotvSiteAssignmentRow, GotvSiteShiftRow } from './gotvDomain'

export type GotvOpenSlotRow = {
  shift: GotvSiteShiftRow
  open: number
}

export function computeOpenSlots(
  shifts: readonly GotvSiteShiftRow[],
  assignments: readonly GotvSiteAssignmentRow[],
): GotvOpenSlotRow[] {
  const byShift = new Map<string, number>()
  for (const a of assignments) {
    if (!['invited', 'confirmed', 'checked_in'].includes(a.assignment_status)) continue
    byShift.set(a.shift_id, (byShift.get(a.shift_id) ?? 0) + 1)
  }
  const out: GotvOpenSlotRow[] = []
  for (const sh of shifts) {
    if (sh.status === 'canceled') continue
    const filled = byShift.get(sh.id) ?? 0
    const open = Math.max(0, sh.slots_needed - filled)
    if (open > 0) out.push({ shift: sh, open })
  }
  return out
}
