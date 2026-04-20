/**
 * Enrich coordinator gaps with volunteer load, drift, and approval context for command + health.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import { eventIsPendingVolunteerRequest } from './eventSubmissionApproval'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { buildVolunteerLoadMap, findOverlappingEventIdsForUser } from './volunteerLoadBalancerService'
import { computeEventCoverageMetrics } from './staffingCoverageHeatmapService'
import { detectStaffingRowMatrixDrift } from './operationalDriftDetection'

export function collectOperationsGapsWithOperationalLayer(
  record: CampaignCalendarEventRecord,
  allEvents: readonly CampaignCalendarEventRecord[],
  assignmentMap: Map<string, StaffingAssignmentLike[]>,
  nowMs: number,
): CoordinatorOperationsGap[] {
  const assigns = assignmentMap.get(record.event_id) ?? []
  const base = collectOperationsGapsForEvent(record, { staffingAssignments: assigns })
  const out: CoordinatorOperationsGap[] = [...base]

  if (eventIsPendingVolunteerRequest(record)) {
    out.push({
      category: 'staffing',
      severity: 'warning',
      message:
        'Request-only event — staffing pressure is provisional until approval; do not treat as live volunteer capacity.',
      event_id: record.event_id,
      title: record.title,
    })
  }

  const metrics = computeEventCoverageMetrics(record, assigns)
  const drift = detectStaffingRowMatrixDrift(record, assigns, metrics, nowMs)
  if (drift) out.push(drift)

  const loadMap = buildVolunteerLoadMap(allEvents, assignmentMap, nowMs, 14)
  const seenU = new Set<string>()
  for (const a of assigns) {
    const uid = a.assigned_user_id ? String(a.assigned_user_id) : ''
    if (!uid || seenU.has(uid)) continue
    seenU.add(uid)
    const p = loadMap.get(uid)
    if (p?.state === 'overloaded' || p?.state === 'burnout_risk') {
      out.push({
        category: 'staffing',
        severity: 'warning',
        message: `Volunteer capacity: assignee ${uid.slice(0, 8)}… is ${p.state.replace(/_/g, ' ')} (score ${p.load_score}) — rebalance before adding roles.`,
        event_id: record.event_id,
        title: record.title,
      })
    }
    const overlap = findOverlappingEventIdsForUser(uid, allEvents, assignmentMap)
    if (overlap.length > 1) {
      out.push({
        category: 'staffing',
        severity: 'critical',
        message: `Scheduling conflict: same volunteer on ${overlap.length} overlapping events in-window — hard conflict risk.`,
        event_id: record.event_id,
        title: record.title,
      })
    }
  }

  return out
}
