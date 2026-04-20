/**
 * Shift coverage summaries from slots + assignments.
 */

import type { VolunteerAssignment, VolunteerShift, VolunteerShiftSlot } from './volunteerCommandDomain'

export type ShiftCoverageRow = {
  shiftId: string
  title: string
  startsAt: string
  roleSlug: string
  target: number
  filled: number
  gap: number
  atRisk: boolean
}

export function computeShiftCoverage(
  shifts: VolunteerShift[],
  slotsByShiftId: Map<string, VolunteerShiftSlot[]>,
  assignments: VolunteerAssignment[],
): ShiftCoverageRow[] {
  const rows: ShiftCoverageRow[] = []
  for (const s of shifts) {
    if (s.status === 'canceled') continue
    const slots = slotsByShiftId.get(s.id) ?? []
    for (const slot of slots) {
      const target = slot.slotsNeeded
      const filled = assignments.filter((a) => {
        if (a.shiftId !== s.id || a.roleSlug !== slot.roleSlug) return false
        if (!['assigned', 'claimed', 'in_progress', 'completed'].includes(a.status)) return false
        return a.shiftSlotId == null || a.shiftSlotId === slot.id
      }).length
      const gap = Math.max(0, target - filled)
      rows.push({
        shiftId: s.id,
        title: s.title,
        startsAt: s.startsAt,
        roleSlug: slot.roleSlug,
        target,
        filled,
        gap,
        atRisk: gap > 0 && new Date(s.startsAt).getTime() - Date.now() < 48 * 3600000,
      })
    }
  }
  return rows
}
