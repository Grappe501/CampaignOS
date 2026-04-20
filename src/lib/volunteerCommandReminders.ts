/**
 * Reminder & escalation state model (no external messaging).
 * Use with `volunteer_reminder_queue` rows — create/clear from UI or cron later.
 */

import type { VolunteerAssignment, VolunteerReminderQueueItem, VolunteerShift } from './volunteerCommandDomain'

export type ReminderKind =
  | 'unclaimed_assignment'
  | 'upcoming_shift'
  | 'missed_assignment'
  | 'coverage_gap'
  | 'backup_needed'

export function buildUnclaimedAssignmentReminders(
  assignments: VolunteerAssignment[],
  now = new Date(),
): { entityType: 'assignment'; entityId: string; reminderKind: ReminderKind; dueAt: Date }[] {
  const out: { entityType: 'assignment'; entityId: string; reminderKind: ReminderKind; dueAt: Date }[] =
    []
  for (const a of assignments) {
    if (a.status !== 'open' || a.volunteerId) continue
    const due = a.dueAt ? new Date(a.dueAt) : null
    if (!due) continue
    const hours = (due.getTime() - now.getTime()) / 3600000
    if (hours > 0 && hours <= 48) {
      out.push({
        entityType: 'assignment',
        entityId: a.id,
        reminderKind: 'unclaimed_assignment',
        dueAt: new Date(now.getTime() + 6 * 3600000),
      })
    }
  }
  return out
}

export function buildUpcomingShiftReminders(
  shifts: VolunteerShift[],
  now = new Date(),
): { entityType: 'shift'; entityId: string; reminderKind: ReminderKind; dueAt: Date }[] {
  const out: { entityType: 'shift'; entityId: string; reminderKind: ReminderKind; dueAt: Date }[] = []
  for (const s of shifts) {
    if (s.status === 'canceled' || s.status === 'completed') continue
    const start = new Date(s.startsAt)
    const hours = (start.getTime() - now.getTime()) / 3600000
    if (hours > 2 && hours <= 24) {
      out.push({
        entityType: 'shift',
        entityId: s.id,
        reminderKind: 'upcoming_shift',
        dueAt: new Date(now.getTime() + 4 * 3600000),
      })
    }
  }
  return out
}

export function shouldEscalateMissedAssignment(a: VolunteerAssignment): boolean {
  return a.status === 'missed' || a.noShow === true
}

export function summarizeReminderBacklog(items: VolunteerReminderQueueItem[]): {
  pending: number
  escalated: number
  nextDue: string | null
} {
  const pending = items.filter((i) => i.status === 'pending').length
  const escalated = items.filter((i) => i.status === 'escalated').length
  const sorted = [...items].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )
  return {
    pending,
    escalated,
    nextDue: sorted[0]?.dueAt ?? null,
  }
}
