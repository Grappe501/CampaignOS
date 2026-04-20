/**
 * Deterministic approval precheck (first-class; AI may add color later, not authority).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { collectOperationsGapsWithOperationalLayer } from './operationalCommandGaps'

export type ApprovalPrecheckOutcome = 'pass' | 'pass_with_warnings' | 'blocked' | 'revise_recommended'

export type ApprovalPrecheckCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

export type ApprovalPrecheckResult = {
  outcome: ApprovalPrecheckOutcome
  readiness_precheck_score: number
  checks: ApprovalPrecheckCheck[]
  summary_line: string
}

function hasVenue(record: CampaignCalendarEventRecord): boolean {
  const v = (record.venue_name ?? '').trim()
  if (v.length === 0 || v.toUpperCase() === 'TBD') return false
  const addr = (record.address_or_virtual ?? '').trim()
  return v.length > 0 || addr.length > 0
}

function detectConflicts(record: CampaignCalendarEventRecord, allEvents: readonly CampaignCalendarEventRecord[]): boolean {
  const start = new Date(record.start_at).getTime()
  if (Number.isNaN(start)) return false
  const endRaw = record.end_at ? new Date(record.end_at).getTime() : start + 3600000
  const end = Number.isNaN(endRaw) ? start + 3600000 : endRaw
  for (const o of allEvents) {
    if (o.event_id === record.event_id) continue
    const os = new Date(o.start_at).getTime()
    const oe = o.end_at ? new Date(o.end_at).getTime() : os + 3600000
    if (Number.isNaN(os)) continue
    if (start < oe && end > os) return true
  }
  return false
}

/** `peerEvents` — same campaign list to cheap-test overlap (same-day crush); optional. */
export function runApprovalPrecheck(
  record: CampaignCalendarEventRecord,
  options?: {
    gaps?: readonly CoordinatorOperationsGap[]
    peerEvents?: readonly CampaignCalendarEventRecord[]
    /** Full campaign assignment map — enables staffing + load + drift checks */
    assignmentMap?: Map<string, StaffingAssignmentLike[]>
  },
): ApprovalPrecheckResult {
  const gaps =
    options?.assignmentMap && options.peerEvents?.length
      ? collectOperationsGapsWithOperationalLayer(record, options.peerEvents, options.assignmentMap, Date.now())
      : options?.gaps ?? collectOperationsGapsForEvent(record)

  const checks: ApprovalPrecheckCheck[] = []

  const titleOk = record.title.trim().length > 2
  checks.push({
    id: 'required_fields',
    label: 'Title & schedule present',
    ok: titleOk,
    detail: titleOk ? 'Title ok' : 'Title missing or placeholder',
  })

  const typeOk = isCampaignEventTypeKey(record.event_type)
  checks.push({
    id: 'event_type',
    label: 'Event type valid',
    ok: typeOk,
    detail: typeOk ? record.event_type : 'Unknown / legacy event type key',
  })

  const peer = options?.peerEvents ?? []
  const conflict = peer.length ? detectConflicts(record, peer) : false
  checks.push({
    id: 'calendar_conflict',
    label: 'No hard overlap in loaded peer set',
    ok: !conflict,
    detail: conflict ? 'Overlaps another event window in current list' : 'No overlap in supplied set',
  })

  const locOk = hasVenue(record)
  checks.push({
    id: 'location',
    label: 'Location completeness',
    ok: locOk,
    detail: locOk ? 'Venue or address populated' : 'Venue / address still thin',
  })

  const approvalRole = record.owner_user_id != null || record.requester_user_id != null
  checks.push({
    id: 'ownership_lineage',
    label: 'Owner or requester on row',
    ok: approvalRole,
    detail: approvalRole ? 'Accountability line present' : 'No owner / requester',
  })

  const staffingPlausible = record.staffing_state !== 'unstaffed' || gaps.every((g) => g.category !== 'staffing')
  checks.push({
    id: 'staffing_plausible',
    label: 'Staffing plausibility',
    ok: staffingPlausible && !gaps.some((g) => g.message.includes('uncovered')),
    detail: gaps.some((g) => g.message.includes('uncovered'))
      ? 'Required matrix role uncovered'
      : 'No matrix uncovered flags',
  })

  const startMs = new Date(record.start_at).getTime()
  const hours =
    Number.isNaN(startMs) ? NaN : (startMs - Date.now()) / 3600000
  const leadOk = !Number.isNaN(hours) && (hours >= 36 || record.mobilize_publish_state === 'not_applicable')
  checks.push({
    id: 'comms_lead_time',
    label: 'Promotion lead time plausibility',
    ok: leadOk,
    detail: leadOk ? 'Starts far enough out or N/A' : 'Starts within 36h — comms risk',
  })

  const workflowOk = (record.readiness_score ?? 50) >= 15
  checks.push({
    id: 'workflow_health',
    label: 'Workflow / readiness baseline',
    ok: workflowOk,
    detail: workflowOk ? 'Readiness score present or benign' : 'Readiness extremely low',
  })

  const failed = checks.filter((c) => !c.ok)
  const criticalFailed = failed.filter((c) =>
    ['required_fields', 'event_type', 'location'].includes(c.id),
  )

  let score = 100
  for (const c of failed) score -= c.id === 'calendar_conflict' ? 12 : 8

  const readiness_precheck_score = Math.max(0, Math.min(100, score))

  let outcome: ApprovalPrecheckOutcome = 'pass'
  if (criticalFailed.length) outcome = 'blocked'
  else if (failed.length >= 4) outcome = 'revise_recommended'
  else if (failed.length) outcome = 'pass_with_warnings'

  const summary_line =
    outcome === 'pass'
      ? 'Precheck pass — routine review.'
      : outcome === 'pass_with_warnings'
        ? 'Precheck pass with warnings — note gaps before approval.'
        : outcome === 'blocked'
          ? 'Precheck blocked — fix required fields / location / type before approval.'
          : 'Precheck suggests revision — multiple discipline issues.'

  return {
    outcome,
    readiness_precheck_score,
    checks,
    summary_line,
  }
}
