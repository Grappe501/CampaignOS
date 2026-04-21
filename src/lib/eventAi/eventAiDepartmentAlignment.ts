/**
 * Cross-department alignment hints — derived from leadership-style counts, not org chart truth.
 * Lines require overlapping pressure signals to reduce false “misalignment” noise.
 */

import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'

export function buildDepartmentAlignmentLines(snapshot: LeadershipBriefingSnapshot, maxLines: number): string[] {
  const c = snapshot.counts
  const lines: string[] = []

  if (c.approval_pending >= 4 && c.staffing_incomplete_events >= 4) {
    lines.push(
      'Approvals and staffing both under load — confirm whether governance waits on ops staffing proof or vice versa.',
    )
  }

  if (c.communications_risk_events >= 3 && c.critical_risk_events >= 2) {
    lines.push(
      'Communications pressure overlaps multiple war-room criticals — calendar and press windows may need explicit alignment.',
    )
  }

  const bottleneck = snapshot.pulse.comms_bottleneck?.trim()
  if (bottleneck && bottleneck.length >= 24 && c.communications_risk_events >= 2) {
    lines.push(`Comms bottleneck (cross-check with program truth): ${bottleneck.slice(0, 200)}`)
  }

  if (c.postevent_closure_incomplete_digest >= 3 && c.approval_pending >= 2) {
    lines.push('After-action closure backlog while approvals stay open — learning may stall before governance.')
  }

  return lines.slice(0, maxLines)
}
