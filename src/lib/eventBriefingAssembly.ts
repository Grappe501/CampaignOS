/**
 * Assembles operator briefings + deltas from structured event state (deterministic base copy).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import type { SimilarEventMatch } from './eventIntelligenceContracts'
import type { OperatorBriefingMode, OperatorBriefingPack, BriefingDelta, SerializedBriefingSnapshot } from './eventIntelligenceContracts'
import type { AfterActionScoreResult } from './eventIntelligenceContracts'
import { buildPreEventBrief } from './eventIntelligenceJones'
import { patternHintsFromMatches } from './similarEventIntelligenceService'
import { computeEventCoverageMetrics } from './staffingCoverageHeatmapService'
import { warnBeforeAssign } from './volunteerLoadWarnings'
import { buildVolunteerLoadMap } from './volunteerLoadBalancerService'

export function buildSerializedBriefingSnapshot(
  record: CampaignCalendarEventRecord,
  gaps: CoordinatorOperationsGap[],
): SerializedBriefingSnapshot {
  return {
    v: 1,
    event_id: record.event_id,
    captured_at_ms: Date.now(),
    readiness_score: record.readiness_score != null ? Number(record.readiness_score) : null,
    gap_count: gaps.length,
    staffing_state: record.staffing_state != null ? String(record.staffing_state) : null,
    stage_status: record.stage_status ?? null,
    operational_status: record.operational_status ?? null,
    mobilize_state: record.mobilize_publish_state != null ? String(record.mobilize_publish_state) : null,
  }
}

export function buildBriefingDelta(prev: SerializedBriefingSnapshot | null, next: SerializedBriefingSnapshot): BriefingDelta {
  if (!prev || prev.event_id !== next.event_id) {
    return { changes: ['Baseline briefing snapshot captured.'], risks_improved: [], risks_worsened: [] }
  }
  const changes: string[] = []
  const risks_improved: string[] = []
  const risks_worsened: string[] = []
  if (prev.gap_count > next.gap_count) risks_improved.push('Open command gaps decreased.')
  if (prev.gap_count < next.gap_count) risks_worsened.push('New command gaps appeared since last view.')
  if ((prev.readiness_score ?? 0) < (next.readiness_score ?? 0)) risks_improved.push('Readiness score ticked up.')
  if ((prev.readiness_score ?? 0) > (next.readiness_score ?? 0)) risks_worsened.push('Readiness score slipped.')
  if (prev.staffing_state !== next.staffing_state) {
    changes.push(`Staffing moved: ${prev.staffing_state ?? '—'} → ${next.staffing_state ?? '—'}`)
  }
  if (prev.stage_status !== next.stage_status) {
    changes.push(`Lifecycle: ${prev.stage_status ?? '—'} → ${next.stage_status ?? '—'}`)
  }
  if (prev.mobilize_state !== next.mobilize_state) {
    changes.push(`Mobilize: ${prev.mobilize_state ?? '—'} → ${next.mobilize_state ?? '—'}`)
  }
  if (changes.length === 0 && risks_improved.length === 0 && risks_worsened.length === 0) {
    changes.push('No material command changes since last briefing snapshot.')
  }
  return { changes, risks_improved, risks_worsened }
}

export function buildOperatorBriefingPack(input: {
  record: CampaignCalendarEventRecord
  effectiveType: CampaignEventTypeKey
  mode: OperatorBriefingMode
  staffingAssignments: readonly StaffingAssignmentLike[]
  campaignEvents: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  similar: SimilarEventMatch[]
  afterAction: AfterActionScoreResult | null
  asOfMs: number
}): OperatorBriefingPack {
  const { record, effectiveType, mode, staffingAssignments, campaignEvents, assignmentMap, similar, afterAction, asOfMs } =
    input
  const gaps = collectOperationsGapsForEvent(record, { staffingAssignments })
  const pre = buildPreEventBrief(record, effectiveType, null, {
    recentAreaEvents: similar.slice(0, 3).map((s) => `${s.title} (${new Date(s.start_at).toLocaleDateString()})`),
  })

  const coverage = computeEventCoverageMetrics(record, staffingAssignments)
  const loads = buildVolunteerLoadMap(campaignEvents, assignmentMap, asOfMs, 14)
  const firstUid = staffingAssignments.find((a) => a.assigned_user_id)?.assigned_user_id ?? null
  const loadWarn = warnBeforeAssign(firstUid, loads)

  const top_risks = [
    ...pre.riskThemes.slice(0, 2),
    ...(coverage && coverage.bucket === 'critical_gap' ? ['Critical staffing coverage gap on required roles'] : []),
    ...(loadWarn ? [loadWarn.message] : []),
    ...gaps.filter((g) => g.severity === 'critical' || g.severity === 'warning').map((g) => g.message),
  ].slice(0, 6)

  const next_actions = [
    ...pre.recommendedAsks.slice(0, 2),
    gaps[0]?.message ? `Unblock: ${gaps[0].message}` : 'Confirm day-of communications owner',
    record.mobilize_publish_state !== 'published' ? 'Advance Mobilize publish when draft is ready' : 'Monitor volunteer confirmations',
  ].slice(0, 6)

  const patternHints = patternHintsFromMatches(similar)

  const staffing_line = coverage
    ? `${coverage.bucket} coverage · ${Math.round(coverage.critical_role_coverage_percentage)}% required roles staffed`
    : `Staffing state: ${record.staffing_state ?? 'unknown'}`

  const comms_line =
    record.mobilize_publish_state === 'published'
      ? 'External comms published — keep messaging aligned with coordinator approval notes.'
      : 'External comms not published — align promotion with approval conditions before broad push.'

  const logistics_line = record.venue_name
    ? `Venue / host: ${record.venue_name}`
    : record.address_or_virtual
      ? 'Virtual / hybrid — confirm run-of-show for online participants'
      : 'Logistics still open — pin venue or virtual bridge'

  const similar_lessons = [...patternHints, ...similar.slice(0, 2).flatMap((s) => s.similarity_reasons.slice(0, 2))].slice(
    0,
    6,
  )

  const key_people = [
    record.owner_role ? `Owner role: ${record.owner_role}` : null,
    staffingAssignments.length ? `${staffingAssignments.length} assignment row(s) on file` : 'No assignments yet',
  ].filter(Boolean) as string[]

  const timeline_pressure = [
    new Date(record.start_at) < new Date()
      ? 'Event time has passed — pivot to follow-up and capture.'
      : 'Monitor readiness and approvals as start time approaches.',
  ]

  const decision_points = [
    record.approval_required ? 'Coordinator approval still gates calendar visibility' : 'Approval not blocking visibility',
    record.finance_flag ? 'Finance checkpoints active — keep compliance visible' : null,
  ].filter(Boolean) as string[]

  const postHint =
    afterAction && record.operational_status === 'completed'
      ? `After-action ${afterAction.overall_score} (${Math.round(afterAction.completeness * 100)}% data completeness)`
      : null

  const one_liner =
    mode === 'quick'
      ? `${record.title}: ${top_risks[0] ?? 'monitor command gaps'} · ${next_actions[0] ?? 'advance staging'}`
      : `${record.title} — ${staffing_line}; ${comms_line}${postHint ? ` · ${postHint}` : ''}`

  return {
    event_id: record.event_id,
    mode,
    title: mode === 'day_of' ? `Day-of: ${record.title}` : `Briefing (${mode}): ${record.title}`,
    purpose_line: pre.audienceLine,
    top_risks: top_risks.slice(0, 4),
    next_actions: next_actions.slice(0, 4),
    staffing_line,
    comms_line,
    logistics_line,
    similar_lessons,
    key_people,
    timeline_pressure,
    decision_points,
    one_liner,
  }
}
