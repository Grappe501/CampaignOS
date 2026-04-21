/**
 * Human-readable labels for field execution enums (UI consistency).
 */

import type { FieldCheckInStatus, FieldIssueStatus, RunOfShowSegmentStatus } from './eventDayOfSchemas'

const ROS: Record<RunOfShowSegmentStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  complete: 'Complete',
  skipped: 'Skipped',
  delayed: 'Delayed',
}

const ISSUE: Record<FieldIssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

const CI: Record<FieldCheckInStatus, string> = {
  expected: 'Expected',
  checked_in: 'Checked in',
  late: 'Late',
  absent: 'Absent',
  backup_active: 'Backup active',
}

export function formatRunOfShowSegmentStatus(s: RunOfShowSegmentStatus): string {
  return ROS[s] ?? s
}

export function formatFieldIssueStatus(s: FieldIssueStatus): string {
  return ISSUE[s] ?? s.replace(/_/g, ' ')
}

export function formatFieldCheckInStatus(s: FieldCheckInStatus): string {
  return CI[s] ?? s.replace(/_/g, ' ')
}
