/**
 * Daily operational picture for the Events Coordinator desk (Step 3.1B — command intelligence).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { summarizeCommsBacklog } from './eventCommsGaps'
import { summarizeDayOfFieldGaps } from './eventDayOfGaps'
import { collectOperationsGapsWithOperationalLayer } from './operationalCommandGaps'
import {
  computeEventHealthScore,
  healthStatusFromScore,
  type EventHealthStatusBand,
} from './eventHealthScoreService'
import { computeEventHealthScoreV2, type HealthScoreTrend } from './eventHealthScoreV2'
import { listPendingApprovalEvents } from './eventApprovalService'

export type TodayCommandEventItem = {
  record: CampaignCalendarEventRecord
  healthScore: number
  status: EventHealthStatusBand
  hoursUntilStart: number
  gaps: ReturnType<typeof collectOperationsGapsForEvent>
  /** When prior scores map supplied — command layer trend. */
  trend?: HealthScoreTrend
  priorScore?: number | null
}

export type CommandStaleLevel = 'needs_attention' | 'aging_risk' | 'escalate_now' | null

export type CommandPanelIssue = {
  id: string
  record: CampaignCalendarEventRecord
  section:
    | 'today_action'
    | 'risk_72h'
    | 'declining'
    | 'blocker'
    | 'unowned'
    | 'comms_ack'
    | 'staffing_gap'
    | 'approval'
    | 'escalation'
  whyHere: string
  healthScore: number
  status: EventHealthStatusBand
  eventOwnerId: string | null
  responsibleRole: string
  escalationTarget: string
  issueAgeHours: number | null
  lastTouchedHours: number | null
  stale: CommandStaleLevel
  priority: number
}

export type CommandPanelDigest = {
  eventsTodayCount: number
  eventsNext72hCount: number
  criticalIssuesCount: number
  pendingApprovalsCount: number
  /** Browser localStorage workspace rollup (v1); zeros when storage unavailable. */
  commsEventsMissingWorkspace: number
  commsOpenSteps: number
  commsRecapIncomplete: number
  commsDraftsPendingReview: number
  /** Browser day-of workspace rollup (v1). */
  dayOfEventsMissingWorkspace: number
  dayOfOpenFieldIssues: number
  dayOfClosureIncompleteEvents: number
  topRiskEvents: Array<{ eventId: string; title: string; score: number; reason: string }>
  fastestWins: Array<{ eventId: string; title: string; action: string }>
  /** Brief operator briefing (1–2 sentences). */
  briefingConcise: string
  /** Full narrative for shift handoff. */
  briefingFull: string
}

export type CommandGroupingMode = 'urgency' | 'owner' | 'county' | 'event_type' | 'issue_type'

export type TodayCommandSnapshot = {
  generatedAtMs: number
  eventsToday: TodayCommandEventItem[]
  next72Hours: TodayCommandEventItem[]
  criticalIssues: TodayCommandEventItem[]
  /** Events whose trend is declining / critical_drop when prior map supplied */
  newlyDeclining: TodayCommandEventItem[]
  pendingApprovals: CampaignCalendarEventRecord[]
  issues: CommandPanelIssue[]
  digest: CommandPanelDigest
  empty: boolean
}

function localDayBounds(nowMs: number): { start: number; end: number } {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  const start = d.getTime()
  const end = start + 86400000
  return { start, end }
}

function isEventToday(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  const t = new Date(record.start_at).getTime()
  if (Number.isNaN(t)) return false
  const { start, end } = localDayBounds(nowMs)
  return t >= start && t < end
}

function isInNextHours(record: CampaignCalendarEventRecord, nowMs: number, hours: number): boolean {
  const t = new Date(record.start_at).getTime()
  if (Number.isNaN(t)) return false
  return t >= nowMs && t <= nowMs + hours * 3600000
}

function sortCommandItems(a: TodayCommandEventItem, b: TodayCommandEventItem): number {
  const order = { CRITICAL: 0, AT_RISK: 1, READY: 2 }
  const da = order[a.status] - order[b.status]
  if (da !== 0) return da
  if (a.healthScore !== b.healthScore) return a.healthScore - b.healthScore
  return new Date(a.record.start_at).getTime() - new Date(b.record.start_at).getTime()
}

function touchHours(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, (nowMs - t) / 3600000)
}

function staleLevel(args: {
  hoursUntilStart: number
  healthScore: number
  issueAgeHours: number | null
  hasOwner: boolean
}): CommandStaleLevel {
  const { hoursUntilStart, healthScore, issueAgeHours, hasOwner } = args
  if (hoursUntilStart > 168) return null
  if (!hasOwner && hoursUntilStart < 96 && healthScore < 60) return 'escalate_now'
  if (issueAgeHours != null && issueAgeHours > 72 && healthScore < 55) return 'aging_risk'
  if (issueAgeHours != null && issueAgeHours > 36 && healthScore < 70) return 'needs_attention'
  return null
}

function buildDigest(
  itemsToday: TodayCommandEventItem[],
  items72: TodayCommandEventItem[],
  critical: TodayCommandEventItem[],
  pending: CampaignCalendarEventRecord[],
  nowMs: number,
  comms: ReturnType<typeof summarizeCommsBacklog>,
  dayOf: ReturnType<typeof summarizeDayOfFieldGaps>,
): CommandPanelDigest {
  const topRisk = [...critical]
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 3)
    .map((it) => ({
      eventId: it.record.event_id,
      title: it.record.title,
      score: it.healthScore,
      reason: it.gaps[0]?.message ?? it.record.staffing_state ?? 'Operational pressure',
    }))

  const wins = [...itemsToday, ...items72]
    .filter((it) => it.healthScore < 80 && it.healthScore >= 40)
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 3)
    .map((it) => {
      const v2 = computeEventHealthScoreV2({ record: it.record, gaps: it.gaps, nowMs })
      const top = v2.recommended_actions[0]
      return {
        eventId: it.record.event_id,
        title: it.record.title,
        action: top?.detail ?? 'Triage readiness tasks and staffing',
      }
    })

  const commsLine =
    comms.openSteps + comms.recapIncomplete + comms.draftsPendingReview + comms.eventsMissingWorkspace > 0
      ? `Communications (local workspaces): ${comms.openSteps} open step(s), ${comms.recapIncomplete} recap(s) not published, ${comms.draftsPendingReview} AI draft(s) pending review, ${comms.eventsMissingWorkspace} event(s) without a saved comms workspace.`
      : null

  const dayOfLine =
    dayOf.openFieldIssues + dayOf.closureIncompleteEvents + dayOf.eventsMissingWorkspace > 0
      ? `Field execution (local): ${dayOf.openFieldIssues} open day-of issue(s), ${dayOf.closureIncompleteEvents} event(s) with incomplete closure, ${dayOf.eventsMissingWorkspace} without a saved day-of workspace.`
      : null

  const brief1 = [
    `${itemsToday.length} event(s) today`,
    `${items72.length} with attention signals in 72h`,
    `${pending.length} approval(s) pending`,
    commsLine,
    dayOfLine,
  ]
    .filter(Boolean)
    .join(' · ')

  const briefFull = [
    `Operational scan at ${new Date(nowMs).toLocaleString()}: ${brief1}.`,
    critical.length
      ? `${critical.length} item(s) in critical posture — prioritize staffing, venue, and comms cutovers.`
      : 'No CRITICAL-band events in the deterministic window.',
    pending.length
      ? 'Governance: work the approval queue before promoting request-only events live.'
      : 'No outstanding intake queue items.',
    commsLine ?? '',
    dayOfLine ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    eventsTodayCount: itemsToday.length,
    eventsNext72hCount: items72.length,
    criticalIssuesCount: critical.length,
    pendingApprovalsCount: pending.length,
    commsEventsMissingWorkspace: comms.eventsMissingWorkspace,
    commsOpenSteps: comms.openSteps,
    commsRecapIncomplete: comms.recapIncomplete,
    commsDraftsPendingReview: comms.draftsPendingReview,
    dayOfEventsMissingWorkspace: dayOf.eventsMissingWorkspace,
    dayOfOpenFieldIssues: dayOf.openFieldIssues,
    dayOfClosureIncompleteEvents: dayOf.closureIncompleteEvents,
    topRiskEvents: topRisk,
    fastestWins: wins,
    briefingConcise: brief1 + '.',
    briefingFull: briefFull,
  }
}

function toItem(
  record: CampaignCalendarEventRecord,
  nowMs: number,
  priorScores?: ReadonlyMap<string, number>,
  assignmentMap?: Map<string, StaffingAssignmentLike[]>,
  allEvents?: readonly CampaignCalendarEventRecord[],
): TodayCommandEventItem {
  const gaps =
    assignmentMap && allEvents
      ? collectOperationsGapsWithOperationalLayer(record, allEvents, assignmentMap, nowMs)
      : collectOperationsGapsForEvent(record)
  const prior = priorScores?.get(record.event_id) ?? null
  const health = computeEventHealthScoreV2({ record, gaps, nowMs, prior_score: prior })
  const t = new Date(record.start_at).getTime()
  const hoursUntilStart = Number.isNaN(t) ? 9999 : (t - nowMs) / 3600000
  return {
    record,
    healthScore: health.current_score,
    status: health.health_status,
    hoursUntilStart,
    gaps,
    trend: health.trend,
    priorScore: prior,
  }
}

function buildIssues(items: TodayCommandEventItem[], nowMs: number): CommandPanelIssue[] {
  const out: CommandPanelIssue[] = []

  for (const it of items) {
    const e = it.record
    const submitted = e.submitted_for_review_at ?? e.created_at
    const lastTouch = e.last_operational_touch_at ?? e.updated_at
    const issueAgeHours = touchHours(submitted, nowMs)
    const lastTouchedHours = touchHours(lastTouch, nowMs)
    const owner = e.owner_user_id
    const st = staleLevel({
      hoursUntilStart: it.hoursUntilStart,
      healthScore: it.healthScore,
      issueAgeHours,
      hasOwner: owner != null,
    })

    const base = {
      record: e,
      healthScore: it.healthScore,
      status: it.status,
      eventOwnerId: owner,
      responsibleRole: e.owner_role?.trim() ? String(e.owner_role) : 'events_coordinator',
      escalationTarget:
        it.status === 'CRITICAL' || it.gaps.some((g) => g.severity === 'critical')
          ? 'campaign_manager'
          : 'events_coordinator',
      issueAgeHours,
      lastTouchedHours,
      stale: st,
      priority: 0,
    }

    if (isEventToday(e, nowMs) && (it.status !== 'READY' || it.gaps.length)) {
      out.push({
        ...base,
        id: `${e.event_id}-today`,
        section: 'today_action',
        whyHere:
          it.hoursUntilStart < 14
            ? 'Event is today with open gaps or non-READY health — same-day execution risk.'
            : 'Scheduled for today with items still pending triage.',
        priority: 100 - it.healthScore,
      })
    }

    if (isInNextHours(e, nowMs, 72) && (it.status !== 'READY' || it.gaps.length)) {
      out.push({
        ...base,
        id: `${e.event_id}-72h`,
        section: 'risk_72h',
        whyHere: 'Starts within 72h while readiness or staffing is not green.',
        priority: 90 - it.healthScore + Math.max(0, 24 - it.hoursUntilStart),
      })
    }

    if (it.trend === 'declining' || it.trend === 'critical_drop') {
      out.push({
        ...base,
        id: `${e.event_id}-decl`,
        section: 'declining',
        whyHere: `Health trend ${it.trend.replace(/_/g, ' ')} vs prior snapshot.`,
        priority: 95,
      })
    }

    for (const g of it.gaps.filter((x) => x.severity === 'critical')) {
      out.push({
        ...base,
        id: `${e.event_id}-gap-${g.message.slice(0, 24)}`,
        section: 'blocker',
        whyHere: g.message,
        priority: 88,
      })
    }

    if (!owner && it.hoursUntilStart < 120 && it.healthScore < 72) {
      out.push({
        ...base,
        id: `${e.event_id}-unowned`,
        section: 'unowned',
        whyHere: 'No row owner while event is approaching — accountability gap.',
        priority: 82,
      })
    }

    const commWeak =
      String(e.mobilize_publish_state ?? '').toLowerCase() !== 'published' &&
      String(e.mobilize_publish_state ?? '').toLowerCase() !== 'not_applicable'
    if (commWeak && it.hoursUntilStart < 72 && it.hoursUntilStart > 0) {
      out.push({
        ...base,
        id: `${e.event_id}-comms`,
        section: 'comms_ack',
        whyHere: 'Communications not published / cleared while lead time is shrinking.',
        priority: 70,
      })
    }

    if (String(e.staffing_state ?? '').toLowerCase() === 'unstaffed' || e.staffing_state === 'at_risk') {
      out.push({
        ...base,
        id: `${e.event_id}-staff`,
        section: 'staffing_gap',
        whyHere: `Staffing posture: ${e.staffing_state}`,
        priority: 85,
      })
    }
  }

  const dedup = new Map<string, CommandPanelIssue>()
  for (const x of out.sort((a, b) => b.priority - a.priority)) {
    if (!dedup.has(x.id)) dedup.set(x.id, x)
  }
  return [...dedup.values()].sort((a, b) => b.priority - a.priority).slice(0, 80)
}

/**
 * Build prioritized command snapshot for dashboard panels.
 */
export function buildTodayCommandSnapshot(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number = Date.now(),
  options?: {
    priorScores?: ReadonlyMap<string, number>
    /** When set, staffing/load/drift gaps feed health + issues (Final Pass). */
    assignmentMap?: Map<string, StaffingAssignmentLike[]>
  },
): TodayCommandSnapshot {
  const list = [...events]
    .filter((e) => String(e.stage_status ?? '').toLowerCase() !== 'canceled')
    .filter((e) => String(e.stage_status ?? '').toLowerCase() !== 'archived')

  const priorMap = options?.priorScores
  const am = options?.assignmentMap
  const items = list.map((r) => toItem(r, nowMs, priorMap, am, am ? list : undefined))
  const approvals = listPendingApprovalEvents(events)

  const today = items.filter((it) => isEventToday(it.record, nowMs)).sort(sortCommandItems)

  const next72 = items
    .filter((it) => isInNextHours(it.record, nowMs, 72))
    .filter((it) => it.status !== 'READY' || it.gaps.length > 0)
    .sort(sortCommandItems)

  const critical = items
    .filter(
      (it) =>
        it.status === 'CRITICAL' ||
        (it.gaps.some((g) => g.severity === 'critical') && it.hoursUntilStart <= 168),
    )
    .sort(sortCommandItems)

  const declining = items
    .filter((it) => it.trend === 'declining' || it.trend === 'critical_drop')
    .sort(sortCommandItems)

  const seen = new Set<string>()
  const dedup: TodayCommandEventItem[] = []
  for (const it of critical) {
    if (seen.has(it.record.event_id)) continue
    seen.add(it.record.event_id)
    dedup.push(it)
  }

  const issues = buildIssues(items, nowMs)

  for (const p of approvals) {
    const sub = p.submitted_for_review_at ?? p.created_at
    const gAp =
      am && list.length
        ? collectOperationsGapsWithOperationalLayer(p, list, am, nowMs)
        : collectOperationsGapsForEvent(p)
    const hAp = computeEventHealthScore({ record: p, gaps: gAp, nowMs })
    issues.unshift({
      id: `appr-${p.event_id}`,
      record: p,
      section: 'approval',
      whyHere: 'Volunteer / neighborhood submission awaiting coordinator approval (request-only).',
      healthScore: hAp.score,
      status: healthStatusFromScore(hAp.score),
      eventOwnerId: p.owner_user_id,
      responsibleRole: 'events_coordinator',
      escalationTarget: 'campaign_manager',
      issueAgeHours: touchHours(sub, nowMs),
      lastTouchedHours: touchHours(p.last_operational_touch_at ?? p.updated_at, nowMs),
      stale:
        touchHours(sub, nowMs) != null && (touchHours(sub, nowMs) as number) > 48
          ? 'aging_risk'
          : 'needs_attention',
      priority: 110,
    })
  }

  const commsSummary = summarizeCommsBacklog(list)
  const dayOfSummary = summarizeDayOfFieldGaps(list, nowMs)
  const digest = buildDigest(today, next72, dedup, approvals, nowMs, commsSummary, dayOfSummary)

  return {
    generatedAtMs: nowMs,
    eventsToday: today,
    next72Hours: next72,
    criticalIssues: dedup.slice(0, 24),
    newlyDeclining: declining.slice(0, 16),
    pendingApprovals: approvals,
    issues,
    digest,
    empty: list.length === 0,
  }
}

export function groupCommandIssues(
  issues: readonly CommandPanelIssue[],
  mode: CommandGroupingMode,
): Map<string, CommandPanelIssue[]> {
  const map = new Map<string, CommandPanelIssue[]>()
  for (const i of issues) {
    let key = 'other'
    if (mode === 'urgency') {
      key = i.stale === 'escalate_now' ? '0_escalate' : i.status === 'CRITICAL' ? '1_critical' : '2_rest'
    } else if (mode === 'owner') {
      key = i.eventOwnerId ?? 'unassigned'
    } else if (mode === 'county') {
      key = i.record.county_id ?? 'no_county'
    } else if (mode === 'event_type') {
      key = i.record.event_type
    } else if (mode === 'issue_type') {
      key = i.section
    }
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(i)
  }
  return map
}

export { healthStatusFromScore }
