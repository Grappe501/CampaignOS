/**
 * Deterministic rapid-action recommendations (AI optional elsewhere).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import { eventIsPendingVolunteerRequest } from './eventSubmissionApproval'
import type { CommandPanelIssue } from './todayCommandService'
import type { RapidActionRecommendation } from './rapidActionSchemas'
import { computeEventCoverageMetrics } from './staffingCoverageHeatmapService'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { findOverloadedVolunteers, type VolunteerLoadProfile } from './volunteerLoadBalancerService'

let recSeq = 0
function id(): string {
  recSeq += 1
  return `rac-${Date.now()}-${recSeq}`
}

function urgencyFromHours(h: number | null): RapidActionRecommendation['urgency'] {
  if (h == null) return 'medium'
  if (h <= 24) return 'critical'
  if (h <= 72) return 'high'
  if (h <= 168) return 'medium'
  return 'low'
}

export function buildRapidActionRecommendations(input: {
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  loadMap: Map<string, VolunteerLoadProfile>
  commandIssues: readonly CommandPanelIssue[]
  nowMs?: number
}): RapidActionRecommendation[] {
  const now = input.nowMs ?? Date.now()
  const out: RapidActionRecommendation[] = []

  for (const issue of input.commandIssues.slice(0, 12)) {
    const e = issue.record
    const assigns = input.assignmentMap.get(e.event_id) ?? []
    const gaps = collectOperationsGapsForEvent(e, { staffingAssignments: assigns })
    const staffingGap = gaps.find((g) => g.category === 'staffing')
    const hours =
      e.start_at != null ? (new Date(e.start_at).getTime() - now) / 3_600_000 : null

    if (staffingGap && !eventIsPendingVolunteerRequest(e)) {
      out.push({
        id: id(),
        recommended_action_type: 'assign_volunteer_to_role',
        urgency: urgencyFromHours(hours),
        reason_summary: staffingGap.message,
        expected_impact: 'Raises staffing coverage and readiness inputs.',
        owner_role: 'events_coordinator',
        linked_issue_id: issue.id,
        event_id: e.event_id,
        event_title: e.title,
      })
    }
    if (eventIsPendingVolunteerRequest(e)) {
      out.push({
        id: id(),
        recommended_action_type: 'approve_request',
        urgency: urgencyFromHours(hours),
        reason_summary: 'Pending approval blocks volunteer-visible scheduling.',
        expected_impact: 'Unblocks operational flows when approved.',
        owner_role: 'events_coordinator',
        linked_issue_id: issue.id,
        event_id: e.event_id,
        event_title: e.title,
      })
    }
  }

  const metricEvents = input.events.slice(0, 80)
  for (const e of metricEvents) {
    const m = computeEventCoverageMetrics(e, input.assignmentMap.get(e.event_id) ?? [])
    if (!m || m.bucket !== 'critical_gap') continue
    out.push({
      id: id(),
      recommended_action_type: 'fill_open_staffing_gap',
      urgency: 'high',
      reason_summary: `Critical staffing gap — ${m.missing_critical_slugs.slice(0, 2).join(', ') || 'roles'}`,
      expected_impact: 'Stabilizes command health and readiness.',
      owner_role: 'field_lead',
      linked_issue_id: null,
      event_id: e.event_id,
      event_title: e.title,
    })
  }

  for (const o of findOverloadedVolunteers(input.loadMap).slice(0, 5)) {
    out.push({
      id: id(),
      recommended_action_type: 'mark_issue_escalation',
      urgency: 'medium',
      reason_summary: `Volunteer load ${o.state.replace(/_/g, ' ')} (score ${o.load_score}) — ${o.details}`,
      expected_impact: 'Redistribute shifts or activate backup coverage.',
      owner_role: 'volunteer_coordinator',
      linked_issue_id: null,
      event_id: null,
      event_title: null,
    })
  }

  /* Dedupe overloaded dupes: replace last block with single escalation hint */
  const deduped: RapidActionRecommendation[] = []
  const seen = new Set<string>()
  for (const r of out) {
    const k = `${r.recommended_action_type}:${r.event_id ?? ''}:${r.reason_summary.slice(0, 48)}`
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(r)
  }
  return deduped.slice(0, 24)
}
