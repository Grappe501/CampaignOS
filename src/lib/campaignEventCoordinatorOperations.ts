/**
 * Coordinator operations — staffing, logistics, follow-up pressure (pass 3).
 * Pure heuristics on event rows; refine when task/staffing tables exist.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import {
  isCampaignEventTypeKey,
  requiredRolesUncovered,
  evaluateStaffingMatrix,
} from './eventStaffingMatrix'

export type CoordinatorOperationsGap = {
  category: 'staffing' | 'logistics' | 'host' | 'followup' | 'attendance'
  severity: 'warning' | 'critical'
  message: string
  event_id: string
  title: string
}

function needsHost(event: CampaignCalendarEventRecord): boolean {
  return (
    event.event_type.includes('house_party') &&
    (!event.host_user_ids || event.host_user_ids.length === 0)
  )
}

function venueGap(event: CampaignCalendarEventRecord): boolean {
  const v = (event.venue_name ?? '').trim()
  return v.length === 0 || v.toUpperCase() === 'TBD'
}

function eventEnded(event: CampaignCalendarEventRecord): boolean {
  const t = new Date(event.end_at ?? event.start_at).getTime()
  return !Number.isNaN(t) && t < Date.now()
}

export function collectOperationsGapsForEvent(
  event: CampaignCalendarEventRecord,
  options?: { staffingAssignments?: readonly StaffingAssignmentLike[] },
): CoordinatorOperationsGap[] {
  const out: CoordinatorOperationsGap[] = []

  if (event.staffing_state === 'unstaffed') {
    out.push({
      category: 'staffing',
      severity: 'critical',
      message: 'Event is unstaffed — assign shifts or roles before execution.',
      event_id: event.event_id,
      title: event.title,
    })
  } else if (event.staffing_state === 'at_risk') {
    out.push({
      category: 'staffing',
      severity: 'warning',
      message: 'Staffing flagged at risk — confirm coverage and backups.',
      event_id: event.event_id,
      title: event.title,
    })
  }

  const assigns = options?.staffingAssignments
  if (assigns && assigns.length > 0 && isCampaignEventTypeKey(event.event_type)) {
    const uncovered = requiredRolesUncovered(evaluateStaffingMatrix(event.event_type, assigns))
    for (const slug of uncovered) {
      out.push({
        category: 'staffing',
        severity: 'critical',
        message: `Staffing matrix: required role “${slug.replace(/_/g, ' ')}” is still uncovered.`,
        event_id: event.event_id,
        title: event.title,
      })
    }
  }

  if (venueGap(event)) {
    out.push({
      category: 'logistics',
      severity: 'critical',
      message: 'Venue / location not finalized (missing or placeholder).',
      event_id: event.event_id,
      title: event.title,
    })
  }

  if (needsHost(event)) {
    out.push({
      category: 'host',
      severity: 'critical',
      message: 'House party–style event has no host assigned on the row.',
      event_id: event.event_id,
      title: event.title,
    })
  }

  if (eventEnded(event) && !(event.followup_state ?? '').trim()) {
    out.push({
      category: 'followup',
      severity: 'warning',
      message: 'Event appears past end time with no follow-up state — reconcile attendance and notes.',
      event_id: event.event_id,
      title: event.title,
    })
  }

  if (eventEnded(event) && event.finance_flag && !(event.followup_state ?? '').includes('donor')) {
    out.push({
      category: 'attendance',
      severity: 'warning',
      message: 'Finance-touch event ended — confirm donor/supporter follow-up queue ownership.',
      event_id: event.event_id,
      title: event.title,
    })
  }

  return out
}

export function collectOperationsGapsForDesk(
  events: readonly CampaignCalendarEventRecord[],
  getAssignments?: (
    event: CampaignCalendarEventRecord,
  ) => readonly StaffingAssignmentLike[] | undefined,
): CoordinatorOperationsGap[] {
  return events.flatMap((e) =>
    collectOperationsGapsForEvent(e, {
      staffingAssignments: getAssignments?.(e),
    }),
  )
}
