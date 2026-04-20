/**
 * Detect inconsistent operational state between row fields and matrix truth.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'
import { deriveStaffingStateFromMatrix, isCampaignEventTypeKey } from './eventStaffingMatrix'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import type { StaffingCoverageMetrics } from './staffingCoverageModels'

export function detectStaffingRowMatrixDrift(
  record: CampaignCalendarEventRecord,
  assignments: readonly StaffingAssignmentLike[],
  metrics: StaffingCoverageMetrics | null,
  nowMs: number,
): CoordinatorOperationsGap | null {
  if (!isCampaignEventTypeKey(record.event_type) || !metrics) return null
  const startMs = new Date(record.start_at).getTime()
  const derived = deriveStaffingStateFromMatrix(
    record.event_type,
    assignments,
    nowMs,
    Number.isNaN(startMs) ? nowMs : startMs,
  )
  const row = String(record.staffing_state ?? 'unstaffed').toLowerCase()

  if (row === 'staffed' && (metrics.bucket === 'critical_gap' || derived === 'unstaffed' || derived === 'partially_staffed')) {
    return {
      category: 'staffing',
      severity: 'warning',
      message:
        'Operational drift: event row staffing_state looks healthy but the role matrix / coverage engine still shows gaps — reconcile assignments and acknowledgments.',
      event_id: record.event_id,
      title: record.title,
    }
  }

  if (
    metrics.missing_critical_slugs.length > 0 &&
    assignments.some(
      (a) =>
        metrics.missing_critical_slugs.includes(a.staff_role_slug) &&
        ['invited'].includes(String(a.status).toLowerCase()) &&
        (a.assigned_display_name ?? '').trim().length > 0,
    )
  ) {
    return {
      category: 'staffing',
      severity: 'warning',
      message:
        'Critical roles still lack confirmed coverage — names may be provisional until acknowledgment.',
      event_id: record.event_id,
      title: record.title,
    }
  }

  return null
}
