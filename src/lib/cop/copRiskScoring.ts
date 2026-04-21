import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CopRiskItem } from './copTypes'
import { COP_ROUTES } from './copRouting'

function severityFromHealthBand(band: string): CopRiskItem['severity'] {
  const b = String(band).toLowerCase()
  if (b.includes('critical')) return 'critical'
  if (b.includes('high')) return 'high'
  if (b.includes('watch') || b.includes('warn')) return 'medium'
  return 'low'
}

export function buildRisksFromSnapshot(
  snap: LeadershipBriefingSnapshot,
): CopRiskItem[] {
  const out: CopRiskItem[] = []

  for (const row of snap.strategic_risks.slice(0, 12)) {
    const sev = severityFromHealthBand(row.status_band)
    out.push({
      id: `risk-event-${row.event_id}`,
      severity: sev,
      category: 'event_execution',
      title: row.title,
      probability: row.health_score < 50 ? 0.75 : 0.45,
      impact: row.health_score < 40 ? 0.9 : 0.55,
      urgency: row.intervention_urgency === 'urgent' ? 0.95 : 0.55,
      scopeLabel: 'Program event',
      evidence: row.top_signal,
      suggestedActions: [row.recommendation],
      routeTarget: COP_ROUTES.eventRecord(row.event_id),
    })
  }

  if (snap.counts.approval_pending > 0) {
    out.push({
      id: 'risk-governance-queue',
      severity: snap.counts.approval_pending > 6 ? 'high' : 'medium',
      category: 'governance',
      title: 'Pending approval backlog',
      probability: 0.7,
      impact: 0.65,
      urgency: 0.7,
      scopeLabel: 'Campaign',
      evidence: `${String(snap.counts.approval_pending)} requests awaiting review.`,
      suggestedActions: ['Triage oldest approvals first.'],
      routeTarget: COP_ROUTES.approvals(),
    })
  }

  if (snap.counts.staffing_incomplete_events > 0) {
    out.push({
      id: 'risk-staffing',
      severity:
        snap.counts.staffing_incomplete_events > snap.counts.upcoming_7d / 2
          ? 'high'
          : 'medium',
      category: 'staffing',
      title: 'Staffing gaps on upcoming program',
      probability: 0.8,
      impact: 0.75,
      urgency: 0.8,
      scopeLabel: 'Volunteers',
      evidence: `${String(snap.counts.staffing_incomplete_events)} events with staffing issues.`,
      suggestedActions: ['Open Volunteer Command and rebalance coverage.'],
      routeTarget: COP_ROUTES.volunteerCommand(),
    })
  }

  return out
}
