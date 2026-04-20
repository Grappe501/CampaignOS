/**
 * Advisory staffing intelligence — deterministic structured summaries first.
 * Optional server-side LLM can wrap the same shape later; never overrides permissions.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { computeEventCoverageMetrics } from './staffingCoverageHeatmapService'
import type { VolunteerLoadProfile } from './volunteerLoadModels'

export type StaffingIntelligenceBrief = {
  issue_summary: string
  top_risks: string[]
  recommended_actions: string[]
  balancing_suggestions: string[]
  confidence_note: string
}

export function buildDeterministicStaffingBrief(input: {
  event: CampaignCalendarEventRecord
  assignments: readonly StaffingAssignmentLike[]
  volunteerLoads?: Map<string, VolunteerLoadProfile>
}): StaffingIntelligenceBrief {
  const m = computeEventCoverageMetrics(input.event, input.assignments)
  const topRisks: string[] = []
  const actions: string[] = []
  const balance: string[] = []

  if (!m) {
    return {
      issue_summary: 'Event type matrix unavailable for this record.',
      top_risks: ['Unknown event type for staffing templates'],
      recommended_actions: ['Fix event_type on the row'],
      balancing_suggestions: [],
      confidence_note: 'Deterministic / no model',
    }
  }

  if (m.bucket === 'critical_gap') {
    topRisks.push(`Critical roles short: ${m.missing_critical_slugs.join(', ') || 'see matrix'}`)
    actions.push('Assign confirmed volunteers to required roles.')
    actions.push('Use Rapid Actions → assign volunteer or publish gap to marketplace.')
  } else if (m.bucket === 'partial') {
    topRisks.push('Optional roles still open — may impact day-of experience.')
    actions.push('Fill optional greeter/runner slots if traffic is high.')
  }

  if (m.volunteer_confirmation_rate < 0.6 && input.assignments.length > 0) {
    topRisks.push('Many invites still pending — acknowledgment risk.')
    actions.push('Resend acknowledgments or convert invites to confirmed rows.')
  }

  const uidSeen = new Set<string>()
  for (const a of input.assignments) {
    const u = a.assigned_user_id
    if (!u) continue
    if (uidSeen.has(u)) continue
    uidSeen.add(u)
    const load = input.volunteerLoads?.get(String(u))
    if (load && (load.state === 'overloaded' || load.state === 'burnout_risk')) {
      balance.push(`Volunteer ${String(u).slice(0, 8)}… shows ${load.state.replace(/_/g, ' ')} — split shifts or add backup.`)
    }
  }

  const issue =
    m.bucket === 'critical_gap'
      ? 'Event is understaffed on critical roles — readiness and health stay depressed until filled.'
      : m.bucket === 'partial'
        ? 'Core coverage may be OK; optional layers are thin.'
        : m.bucket === 'overstaffed'
          ? 'Staffing exceeds matrix minimums — confirm intentional overfill.'
          : 'Staffing coverage looks aligned with the matrix template.'

  const gateLine =
    m?.operational_gate === 'pending_approval'
      ? 'Coverage gate: pending approval — treat staffing as provisional until governance clears.'
      : ''

  return {
    issue_summary: [issue, gateLine].filter(Boolean).join(' '),
    top_risks: topRisks.length ? topRisks : ['No acute risks detected by heuristics'],
    recommended_actions: actions.length ? actions : ['Maintain confirmations and venue logistics.'],
    balancing_suggestions: balance.length ? balance : ['No redistribution suggested from load heuristics.'],
    confidence_note:
      'Grounded in staffing matrix + assignment rows. LLM optional; does not override RPC or RLS.',
  }
}
