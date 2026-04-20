/**
 * Event Health Score V2 — explainable components, trend, summaries (operational intelligence).
 * Core numeric blend stays aligned with `computeEventHealthScore`; V2 adds structure for drill-down.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'
import {
  computeEventHealthScore,
  healthStatusFromScore,
  type EventHealthReasonCode,
  type EventHealthScoreInput,
  type EventHealthStatusBand,
} from './eventHealthScoreService'
import type { EventHealthRecommendedAction } from './eventHealthActionEngine'
import { deriveHealthActionsFromV2 } from './eventHealthActionEngine'

export type HealthScoreTrend = 'improving' | 'stable' | 'declining' | 'critical_drop'

export type ScoreComponentDetail = {
  component_name: string
  component_weight: number
  /** 0–100 */
  component_score: number
  contributing_factors: string[]
  missing_inputs: string[]
  recommended_fix: string
}

export type { EventHealthRecommendedAction }

export type EventHealthScoreV2Result = {
  current_score: number
  prior_score: number | null
  score_change: number | null
  health_status: EventHealthStatusBand
  trend: HealthScoreTrend
  score_components: ScoreComponentDetail[]
  blocker_summary: string
  warning_summary: string
  recommended_actions: EventHealthRecommendedAction[]
  /** Legacy unified codes (subset overlap with V1). */
  reason_codes: EventHealthReasonCode[]
  /** Raw V1 result for traceability / AI layer. */
  base_health: ReturnType<typeof computeEventHealthScore>
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function staffingFilled01(record: CampaignCalendarEventRecord): number {
  const s = String(record.staffing_state ?? 'unstaffed').toLowerCase()
  if (s === 'staffed') return 1
  if (s === 'partially_staffed') return 0.72
  if (s === 'at_risk') return 0.45
  return 0.15
}

function mobilize01(record: CampaignCalendarEventRecord): number {
  const x = String(record.mobilize_publish_state ?? 'not_applicable').toLowerCase()
  if (x === 'published') return 1
  if (x === 'queued' || x === 'queued_for_publish' || x === 'draft_ready') return 0.62
  if (x === 'not_applicable') return 0.78
  if (x === 'sync_error' || x === 'update_required') return 0.25
  return 0.48
}

function timePrep01(nowMs: number, startIso: string): { ratio: number; compressed: boolean } {
  const t0 = new Date(startIso).getTime()
  if (Number.isNaN(t0)) return { ratio: 0.55, compressed: false }
  const hours = (t0 - nowMs) / 3600000
  if (hours < 0) return { ratio: 0.92, compressed: false }
  if (hours < 6) return { ratio: clamp(0.28 + hours / 24, 0.15, 0.65), compressed: true }
  if (hours < 36) return { ratio: clamp(0.45 + hours / 96, 0.45, 0.88), compressed: true }
  if (hours < 168) return { ratio: clamp(0.55 + hours / 336, 0.55, 0.95), compressed: false }
  return { ratio: 0.92, compressed: false }
}

function ack01(record: CampaignCalendarEventRecord): number {
  if (record.approval_required && String(record.operational_status ?? '') === 'approval_needed') {
    return 0.38
  }
  if (record.stage_status === 'submitted') return 0.55
  return 0.92
}

function approvalVolunteer01(record: CampaignCalendarEventRecord): number {
  let approval = 0.94
  if (record.approval_required && String(record.operational_status ?? '') === 'approval_needed') {
    approval = 0.22
  } else if (String(record.approval_review_state ?? '') === 'approved_with_conditions') {
    approval = 0.78
  }
  const staff = staffingFilled01(record)
  const vol = 0.5 + staff * 0.5
  return clamp(approval * 0.55 + vol * 0.45, 0, 1)
}

function overduePressure01(gaps: readonly CoordinatorOperationsGap[]): number {
  const overdueHints = gaps.filter(
    (g) =>
      g.message.toLowerCase().includes('overdue') ||
      g.message.toLowerCase().includes('past') ||
      g.category === 'logistics',
  )
  const p = Math.min(1, overdueHints.length * 0.15 + gaps.filter((g) => g.severity === 'critical').length * 0.08)
  return clamp(1 - p, 0, 1)
}

function conflicts01(gaps: readonly CoordinatorOperationsGap[]): number {
  const critical = gaps.filter((g) => g.severity === 'critical').length
  const n = gaps.length
  return clamp(1 - Math.min(0.85, n * 0.06 + critical * 0.12), 0, 1)
}

function runOfShow01(record: CampaignCalendarEventRecord, tasks01: number): number {
  const stage = String(record.stage_status ?? '').toLowerCase()
  const lifecycle = stage === 'scheduled' || stage === 'published_internal' || stage === 'published_public' ? 1 : 0.72
  return clamp(tasks01 * 0.65 + lifecycle * 0.35, 0, 1)
}

export function computeHealthTrend(
  prior: number | null | undefined,
  current: number,
): HealthScoreTrend {
  if (prior == null || Number.isNaN(prior)) return 'stable'
  const d = current - prior
  if (current < 40 && prior >= 55) return 'critical_drop'
  if (d <= -15) return 'critical_drop'
  if (d < -5) return 'declining'
  if (d > 5) return 'improving'
  return 'stable'
}

function summarizeBlockers(
  components: ScoreComponentDetail[],
  reasonCodes: EventHealthReasonCode[],
): { blockers: string; warnings: string } {
  const sorted = [...components].sort((a, b) => a.component_score - b.component_score)
  const worst = sorted.slice(0, 3)
  const blocker = [
    reasonCodes.length ? `Flags: ${reasonCodes.slice(0, 4).join(', ')}.` : '',
    worst.length
      ? `Weakest drivers: ${worst.map((w) => `${w.component_name} (${Math.round(w.component_score)})`).join(' · ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const warn = sorted
    .filter((c) => c.component_score >= 45 && c.component_score < 72)
    .slice(0, 2)
    .map((c) => `${c.component_name} borderline (${Math.round(c.component_score)})`)
    .join(' · ')

  return {
    blockers: blocker || 'No acute blockers surfaced in the deterministic model.',
    warnings: warn || 'Limited secondary warnings.',
  }
}

/**
 * Full operational health evaluation with explainability payloads.
 */
export function computeEventHealthScoreV2(
  input: EventHealthScoreInput & {
    prior_score?: number | null
  },
): EventHealthScoreV2Result {
  const nowMs = input.nowMs ?? Date.now()
  const { record, gaps = [] } = input
  const base = computeEventHealthScore(input)

  const staff = staffingFilled01(record)
  const ack = ack01(record)
  const tasks01 =
    record.readiness_score != null && !Number.isNaN(Number(record.readiness_score))
      ? clamp(Number(record.readiness_score) / 100, 0, 1)
      : 0.5
  const overdue = overduePressure01(gaps)
  const comm = mobilize01(record)
  const assets = record.mobilize_update_needed === true ? 0.42 : 0.86
  const { ratio: tp, compressed } = timePrep01(nowMs, record.start_at)
  const ros = runOfShow01(record, tasks01)
  const owner01 = record.owner_user_id ? 1 : 0.55
  const apVol = approvalVolunteer01(record)
  const conf = conflicts01(gaps)

  const w = {
    staffing_coverage: 0.18,
    assignment_acknowledgments: 0.08,
    workflow_completion: 0.12,
    overdue_tasks: 0.08,
    communication_readiness: 0.1,
    communication_state: 0.05,
    asset_readiness: 0.08,
    run_of_show: 0.07,
    key_role_ownership: 0.07,
    approval_volunteer: 0.09,
    unresolved_conflicts: 0.05,
    compressed_lead_time: 0.05,
  } as const

  const components: ScoreComponentDetail[] = [
    {
      component_name: 'Staffing coverage',
      component_weight: w.staffing_coverage,
      component_score: Math.round(staff * 100),
      contributing_factors: [
        `Staffing state: ${record.staffing_state ?? 'unknown'}`,
        gaps.some((g) => g.category === 'staffing')
          ? 'Coordinator staffing gaps on file'
          : 'No staffing gap rows',
      ],
      missing_inputs: staff < 0.5 ? ['Confirmed shifts / matrix coverage'] : [],
      recommended_fix:
        staff < 0.5
          ? 'Fill required roles from the staffing matrix and confirm backups.'
          : 'Reconfirm rosters and check for last-minute gaps.',
    },
    {
      component_name: 'Assignment acknowledgments',
      component_weight: w.assignment_acknowledgments,
      component_score: Math.round(ack * 100),
      contributing_factors: [
        record.stage_status === 'submitted' ? 'Submission not yet fully cleared' : 'Lifecycle aligned for acknowledgments',
      ],
      missing_inputs: ack < 0.65 ? ['Coordinator acknowledgment of staffing / readiness'] : [],
      recommended_fix: 'Drive acknowledgments on critical roles and confirm venue readiness.',
    },
    {
      component_name: 'Workflow completion',
      component_weight: w.workflow_completion,
      component_score: Math.round(tasks01 * 100),
      contributing_factors: [`Readiness score basis: ${record.readiness_score ?? 'n/a'}`],
      missing_inputs:
        tasks01 < 0.6 ? ['Critical workflow tasks incomplete'] : [],
      recommended_fix: 'Close critical path tasks in the event task workspace.',
    },
    {
      component_name: 'Overdue / pressure',
      component_weight: w.overdue_tasks,
      component_score: Math.round(overdue * 100),
      contributing_factors: [`${gaps.length} coordinator gap(s)`],
      missing_inputs: overdue < 0.7 ? ['Task dates slipping vs prep window'] : [],
      recommended_fix: 'Triage overdue prep items and re-sequence owners.',
    },
    {
      component_name: 'Communication readiness',
      component_weight: w.communication_readiness,
      component_score: Math.round(comm * 100),
      contributing_factors: [`Mobilize state: ${record.mobilize_publish_state ?? 'n/a'}`],
      missing_inputs: comm < 0.55 ? ['Promotion path not cleared'] : [],
      recommended_fix: 'Clear Mobilize eligibility, copy, and publish or mark N/A.',
    },
    {
      component_name: 'Comms sent vs pending',
      component_weight: w.communication_state,
      component_score: Math.round((record.mobilize_publish_state === 'published' ? 1 : comm) * 100),
      contributing_factors: [
        record.mobilize_publish_state === 'published' ? 'Published externally' : 'Publish pipeline not finished',
      ],
      missing_inputs:
        record.mobilize_publish_state !== 'published' && record.mobilize_publish_state !== 'not_applicable'
          ? ['Published comms or explicit N/A with rationale']
          : [],
      recommended_fix: 'Send or schedule participant-facing comms with adequate lead time.',
    },
    {
      component_name: 'Asset / resource readiness',
      component_weight: w.asset_readiness,
      component_score: Math.round(assets * 100),
      contributing_factors: [record.mobilize_update_needed ? 'Mobilize drift / update needed' : 'Assets stable'],
      missing_inputs: record.mobilize_update_needed ? ['Refresh materials after field edits'] : [],
      recommended_fix: 'Pack/verify materials and resolve Mobilize update flags.',
    },
    {
      component_name: 'Run-of-show completeness',
      component_weight: w.run_of_show,
      component_score: Math.round(ros * 100),
      contributing_factors: [`Stage: ${record.stage_status}`],
      missing_inputs: ros < 0.65 ? ['ROS alignment with venue + staffing'] : [],
      recommended_fix: 'Finalize cue-to-cue and owner assignments for execution.',
    },
    {
      component_name: 'Key-role ownership',
      component_weight: w.key_role_ownership,
      component_score: Math.round(owner01 * 100),
      contributing_factors: [record.owner_user_id ? 'Owner assigned on row' : 'No owner on row'],
      missing_inputs: !record.owner_user_id ? ['Event owner on campaign_events'] : [],
      recommended_fix: 'Assign an accountable coordinator owner for the event shell.',
    },
    {
      component_name: 'Approval gate / volunteer confirmation',
      component_weight: w.approval_volunteer,
      component_score: Math.round(apVol * 100),
      contributing_factors: [
        record.approval_required ? 'Approval_required set' : 'Not blocked on intake approval',
        `Volunteer proxy via staffing fill: ${Math.round(staff * 100)}%`,
      ],
      missing_inputs:
        record.approval_required && String(record.operational_status ?? '') === 'approval_needed'
          ? ['Coordinator approval to leave request-only state']
          : [],
      recommended_fix: 'Run disciplined approval review or shore volunteer confirmations.',
    },
    {
      component_name: 'Unresolved conflicts & gaps',
      component_weight: w.unresolved_conflicts,
      component_score: Math.round(conf * 100),
      contributing_factors: [`${gaps.filter((g) => g.severity === 'critical').length} critical gap(s)`],
      missing_inputs: conf < 0.65 ? ['Resolve logistics / host / staffing conflicts'] : [],
      recommended_fix: 'Resolve cross-functional blockers with a single accountable owner.',
    },
    {
      component_name: 'Compressed lead time',
      component_weight: w.compressed_lead_time,
      component_score: Math.round(tp * 100),
      contributing_factors: [compressed ? 'Prep window compressed vs start' : 'Lead time acceptable'],
      missing_inputs: compressed ? ['Accelerated execution checklist'] : [],
      recommended_fix: compressed
        ? 'Escalate: shorten decision chains and pre-position materials.'
        : 'Maintain buffer for weather / tech / volunteer variance.',
    },
  ]

  let composite = 0
  let sumW = 0
  for (const c of components) {
    composite += c.component_weight * (c.component_score / 100)
    sumW += c.component_weight
  }
  const raw = sumW > 0 ? composite / sumW : base.score / 100
  let blended = 0.5 * raw + 0.5 * (base.score / 100)
  if (!input.ignorePersistedReadiness && base.persistedReadiness != null) {
    const p = clamp(base.persistedReadiness / 100, 0, 1)
    blended = 0.4 * blended + 0.6 * p
  }
  const current_score = Math.round(clamp(blended * 100, 0, 100))

  const prior = input.prior_score != null && !Number.isNaN(Number(input.prior_score))
    ? Math.round(Number(input.prior_score))
    : null
  const score_change = prior != null ? current_score - prior : null
  const health_status = healthStatusFromScore(current_score)
  const trend = computeHealthTrend(prior, current_score)

  const recommended_actions = deriveHealthActionsFromV2({
    record,
    components,
    nowMs,
    baseReasonCodes: base.reasonCodes,
  })

  const { blockers, warnings } = summarizeBlockers(components, base.reasonCodes)

  return {
    current_score: current_score,
    prior_score: prior,
    score_change,
    health_status,
    trend,
    score_components: components,
    blocker_summary: blockers,
    warning_summary: warnings,
    recommended_actions,
    reason_codes: base.reasonCodes,
    base_health: base,
  }
}
