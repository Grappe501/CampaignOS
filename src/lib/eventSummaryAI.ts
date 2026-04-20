/**
 * Advisory summaries for approvals and command panels.
 * Deterministic path always available; optional server endpoint can be wired later (advisory only).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { computeEventHealthScore } from './eventHealthScoreService'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import { computeEventHealthScoreV2 } from './eventHealthScoreV2'
import { runApprovalPrecheck } from './approvalPrecheckEngine'

export type EventAdvisoryRecommendation = 'approve' | 'revise' | 'reject' | 'escalate'

export type EventAdvisorySummary = {
  summary: string
  bullets: string[]
  recommendation: EventAdvisoryRecommendation
  source: 'deterministic' | 'server'
}

export type OperationalIntelligenceBrief = {
  event_id: string
  health_explanation: string
  top_risks: string[]
  next_three_actions: string[]
  approval_summary: string | null
  revision_summary: string | null
  slipping_summary: string | null
  since_note: string | null
  source: 'deterministic' | 'server'
}

/**
 * Structured, deterministic operational brief — safe when AI unavailable; advisory only.
 */
export function buildDeterministicOperationalBrief(
  record: CampaignCalendarEventRecord,
  options?: { prior_score?: number | null; peerEvents?: readonly CampaignCalendarEventRecord[] },
): OperationalIntelligenceBrief {
  const gaps = collectOperationsGapsForEvent(record)
  const v2 = computeEventHealthScoreV2({
    record,
    gaps,
    prior_score: options?.prior_score ?? null,
  })
  const pending =
    record.approval_required === true && String(record.operational_status ?? '') === 'approval_needed'
  const pre = pending
    ? runApprovalPrecheck(record, { gaps, peerEvents: options?.peerEvents })
    : null

  const topRisks = [
    ...v2.reason_codes.map((c) => String(c).replace(/_/g, ' ')),
    ...gaps.filter((g) => g.severity === 'critical').map((g) => g.message),
  ].slice(0, 5)

  const nextThree = v2.recommended_actions.slice(0, 3).map((a) => `${a.action_type}: ${a.detail}`)

  const health_explanation = `${record.title}: score ${v2.current_score}/100 (${v2.health_status}). Trend ${
    v2.trend
  }. ${v2.blocker_summary}`

  const approval_summary = pre
    ? `Precheck ${pre.outcome} (${pre.readiness_precheck_score}/100). ${pre.summary_line}`
    : null

  const slipping =
    v2.trend === 'declining' || v2.trend === 'critical_drop'
      ? `Slipping vs prior snapshot — worst components: ${v2.score_components
          .sort((a, b) => a.component_score - b.component_score)
          .slice(0, 2)
          .map((c) => c.component_name)
          .join(', ')}.`
      : null

  return {
    event_id: record.event_id,
    health_explanation,
    top_risks: topRisks.length ? topRisks : ['No acute deterministic risks'],
    next_three_actions: nextThree.length
      ? nextThree
      : ['Confirm staffing matrix', 'Verify venue + comms publish path', 'Assign accountable owner'],
    approval_summary,
    revision_summary: pending ? 'Submission still in request-only state until coordinator approves.' : null,
    slipping_summary: slipping,
    since_note: v2.prior_score != null ? `Prior score was ${v2.prior_score}; delta ${v2.score_change ?? 0}.` : null,
    source: 'deterministic',
  }
}

function recommendationFromHealth(score: number, pendingApproval: boolean): EventAdvisoryRecommendation {
  if (pendingApproval && score < 35) return 'reject'
  if (pendingApproval && score < 58) return 'revise'
  if (pendingApproval && score >= 58) return 'approve'
  if (score < 40) return 'escalate'
  if (score < 65) return 'revise'
  return 'approve'
}

/**
 * Fast deterministic summary — safe with partial data; does not call external APIs.
 */
export function buildDeterministicEventSummary(record: CampaignCalendarEventRecord): EventAdvisorySummary {
  const gaps = collectOperationsGapsForEvent(record)
  const health = computeEventHealthScore({ record, gaps })
  const pending =
    record.approval_required === true && String(record.operational_status ?? '') === 'approval_needed'

  const bullets: string[] = []
  if (health.reasonCodes.includes('missing_key_roles')) bullets.push('Staffing or key roles still open')
  if (health.reasonCodes.includes('communication_not_sent')) bullets.push('Promotion / Mobilize not fully cleared')
  if (health.reasonCodes.includes('compressed_timeline')) bullets.push('Compressed timeline vs preparation')
  if (health.reasonCodes.includes('missing_assets')) bullets.push('Materials or publish payload may need update')
  if (gaps.length && bullets.length < 4) {
    bullets.push(`${gaps.length} coordinator gap(s) on file`)
  }

  const statusLabel = health.status === 'AT_RISK' ? 'at risk' : health.status.toLowerCase()
  const summary = `${record.title}: health ${health.score}/100 (${statusLabel}). ${
    pending ? 'Request awaits coordinator decision.' : 'Operational monitoring only.'
  }`

  return {
    summary,
    bullets: bullets.slice(0, 5),
    recommendation: recommendationFromHealth(health.score, pending),
    source: 'deterministic',
  }
}

/**
 * Optional Netlify/server hook — returns deterministic result if URL unset or fetch fails.
 */
export async function getEventAdvisorySummary(record: CampaignCalendarEventRecord): Promise<EventAdvisorySummary> {
  const fallback = buildDeterministicEventSummary(record)
  const url = typeof import.meta.env.VITE_EVENT_COMMAND_SUMMARY_URL === 'string'
    ? import.meta.env.VITE_EVENT_COMMAND_SUMMARY_URL.trim()
    : ''
  if (!url) return fallback

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: record.event_id,
        title: record.title,
        event_type: record.event_type,
        staffing_state: record.staffing_state,
        stage_status: record.stage_status,
        operational_status: record.operational_status,
        start_at: record.start_at,
        readiness_score: record.readiness_score,
      }),
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as Partial<EventAdvisorySummary>
    if (!data.summary || typeof data.summary !== 'string') return fallback
    return {
      summary: data.summary,
      bullets: Array.isArray(data.bullets) ? data.bullets.slice(0, 6) : fallback.bullets,
      recommendation: data.recommendation ?? fallback.recommendation,
      source: 'server',
    }
  } catch {
    return fallback
  }
}
