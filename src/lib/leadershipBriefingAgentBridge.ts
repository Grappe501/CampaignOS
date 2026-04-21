/**
 * Bounded payload for Agent Jones API — executive event operations (client-built).
 */

import type { LeadershipBriefingSnapshot } from './leadershipBriefingSchemas'

/** Aligned with netlify `AgentJonesEventOperationsExecutiveSafe` (keep in sync). */
export type AgentJonesEventOperationsExecutive = {
  source: 'leadership_briefing_v1'
  generated_at_ms: number
  emphasis: string
  briefing_mode: 'executive_event_briefing' | 'daily_leadership_digest'
  overall_operational_status: string
  digest_compact: string
  digest_expanded: string
  top_risks: string[]
  top_decisions: string[]
  top_opportunities: string[]
  improved_since_prior: string[]
  worsened_since_prior: string[]
  leadership_attention: string[]
  coordinator_level_ok: string[]
}

export function buildAgentJonesEventOperationsExecutive(
  snap: LeadershipBriefingSnapshot,
): AgentJonesEventOperationsExecutive {
  const top_risks = snap.strategic_risks.slice(0, 5).map((r) => `${r.title}: ${r.top_signal}`)
  const top_decisions = snap.decision_queue.slice(0, 5).map(
    (d) => `${d.title} — ${d.suggested_move}`,
  )
  const opportunities = snap.recommendations.map((r) => r.title)
  const improved =
    snap.counts.trend_vs_prior === 'improving'
      ? [snap.counts.trend_explanation ?? 'Pressure index improved vs prior visit.']
      : []
  const worsened =
    snap.counts.trend_vs_prior === 'declining'
      ? [snap.counts.trend_explanation ?? 'Pressure index worsened vs prior visit.']
      : []
  const leadership_attention = [
    ...snap.meta.data_quality_notes.slice(0, 4),
    snap.pulse.top_strategic_concern,
    snap.pulse.highest_priority_decision,
    snap.staffing.coverage_headline,
    snap.comms.headline,
  ].filter((x): x is string => Boolean(x))
  const coordinator_ok = [
    snap.counts.approval_pending === 0 ? 'Governance queue clear — coordinators can run unblocked.' : null,
    snap.counts.critical_risk_events === 0 ? 'No critical health band in active list — tactical fixes stay delegated.' : null,
  ].filter((x): x is string => Boolean(x))

  return {
    source: 'leadership_briefing_v1',
    generated_at_ms: snap.generated_at_ms,
    emphasis: snap.emphasis,
    briefing_mode: 'executive_event_briefing',
    overall_operational_status: snap.pulse.overall_operational_status,
    digest_compact: snap.daily_digest_compact,
    digest_expanded: [
      `Summary confidence: ${snap.meta.summary_confidence}. Trend basis: ${snap.meta.trend_basis}.`,
      snap.daily_digest_expanded,
    ]
      .join('\n')
      .slice(0, 3500),
    top_risks,
    top_decisions,
    top_opportunities: opportunities.slice(0, 8),
    improved_since_prior: improved,
    worsened_since_prior: worsened,
    leadership_attention: leadership_attention.slice(0, 12),
    coordinator_level_ok: coordinator_ok.slice(0, 6),
  }
}
