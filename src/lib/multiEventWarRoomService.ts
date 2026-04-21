/**
 * Multi-event war-room orchestration — combines command snapshot, health V2, field workspace overlay,
 * prioritization, and deterministic Agent Jones lines (advisory; no server AI here).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { computeEventHealthScoreV2 } from './eventHealthScoreV2'
import { loadEventDayWorkspace } from './eventDayOfLocalStorage'
import { overlayFieldExecutionOnHealth } from './eventDayOfHealthOverlay'
import {
  currentAndNextSegment,
  mergeAssignmentsIntoCheckins,
  scheduleSegmentsForEventStart,
} from './eventDayOfExecutionService'
import { buildTodayCommandEventItem, buildTodayCommandSnapshot } from './todayCommandService'
import { listPendingApprovalEvents } from './eventApprovalService'
import {
  assignWarRoomBucket,
  groupRowsByCounty,
  isEventInApprovalPending,
} from './multiEventWarRoomSelectors'
import { buildInterventionReasonSummary } from './multiEventWarRoomIntervention'
import { hoursToEventStart, isEventLiveWindow, safeEventEndMs, safeEventStartMs } from './multiEventWarRoomTime'
import type {
  InterventionUrgency,
  OwnerCascadeRisk,
  VolunteerStrainRisk,
  WarRoomClosureBacklogItem,
  WarRoomEventRow,
  WarRoomSnapshot,
} from './multiEventWarRoomSchemas'
import type { EventHealthStatusBand } from './eventHealthScoreService'
import type { TodayCommandEventItem } from './todayCommandService'

function shouldLoadFieldWorkspace(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  if (typeof localStorage === 'undefined') return false
  if (isEventLiveWindow(record, nowMs)) return true
  const h = hoursToEventStart(record, nowMs)
  if (h > 0 && h <= 72) return true
  const end = safeEventEndMs(record)
  if (end != null && nowMs > end && nowMs - end < 72 * 3600000) return true
  return false
}

/** Slightly higher bands than raw math to cut false "now" urgency from stacked soft signals. */
function urgencyFromScore(score: number): InterventionUrgency {
  if (score >= 142) return 'now'
  if (score >= 102) return 'soon'
  if (score >= 68) return 'watch'
  return 'steady'
}

function computePriority(args: {
  item: TodayCommandEventItem
  overlayScore: number
  overlayStatus: EventHealthStatusBand
  fieldReasons: string[]
  dayOfOpenIssues: number
  nowMs: number
  inApproval: boolean
  ws: ReturnType<typeof loadEventDayWorkspace>
}): { score: number; codes: string[] } {
  const { item, overlayScore, overlayStatus, fieldReasons, dayOfOpenIssues, nowMs, inApproval, ws } = args
  const codes: string[] = []
  let p = 100 - overlayScore

  if (item.status === 'CRITICAL' || overlayStatus === 'CRITICAL') {
    p += 25
    codes.push('critical_health')
  } else if (item.status === 'AT_RISK' || overlayStatus === 'AT_RISK') {
    p += 12
    codes.push('at_risk_health')
  }

  if (isEventLiveWindow(item.record, nowMs)) {
    p += 36
    codes.push('live_window')
  }

  const h = item.hoursUntilStart
  if (h > 0 && h <= 3) {
    p += 30
    codes.push('starting_imminently')
  } else if (h > 0 && h <= 24) {
    p += 14
    codes.push('within_24h')
  } else if (h > 0 && h <= 72) {
    p += 8
    codes.push('within_72h')
  }

  if (inApproval) {
    p += 28
    codes.push('approval_pending')
  }

  const critGaps = item.gaps.filter((g) => g.severity === 'critical').length
  if (critGaps) {
    p += Math.min(24, critGaps * 10)
    codes.push('critical_blockers')
  }

  if (dayOfOpenIssues > 0) {
    p += Math.min(22, dayOfOpenIssues * 4)
    codes.push('field_issues_open')
  }

  p += Math.min(12, fieldReasons.length * 2)

  const staff = String(item.record.staffing_state ?? '').toLowerCase()
  if (staff === 'unstaffed' || staff === 'at_risk') {
    p += 14
    codes.push('staffing_posture')
  }

  const comm = String(item.record.mobilize_publish_state ?? '').toLowerCase()
  if (comm !== 'published' && comm !== 'not_applicable' && h < 72 && h > -48) {
    p += 8
    codes.push('comms_not_cleared')
  }

  if (!item.record.owner_user_id && h < 120 && h > -24) {
    p += 10
    codes.push('unowned_event')
  }

  const end = safeEventEndMs(item.record)
  if (end != null && nowMs > end && ws) {
    const closureDone = ws.closure.items.length > 0 && ws.closure.items.every((x) => x.done)
    if (!closureDone) {
      p += 15
      codes.push('closure_incomplete')
    }
  }

  return { score: Math.min(220, Math.round(p)), codes: [...new Set(codes)] }
}

function loadWorkspaceCached(
  cache: Map<string, ReturnType<typeof loadEventDayWorkspace> | null>,
  eventId: string,
): ReturnType<typeof loadEventDayWorkspace> | null {
  if (cache.has(eventId)) return cache.get(eventId) ?? null
  if (typeof localStorage === 'undefined') {
    cache.set(eventId, null)
    return null
  }
  const w = loadEventDayWorkspace(eventId)
  cache.set(eventId, w)
  return w
}

function liveRosLabel(
  record: CampaignCalendarEventRecord,
  assignments: readonly StaffingAssignmentLike[] | undefined,
  nowMs: number,
  wsCache: Map<string, ReturnType<typeof loadEventDayWorkspace> | null>,
): string | null {
  if (!isEventLiveWindow(record, nowMs)) return null
  let ws = loadWorkspaceCached(wsCache, record.event_id)
  if (!ws) return null
  if (assignments?.length) {
    ws = mergeAssignmentsIntoCheckins(ws, assignments)
  }
  ws = { ...ws, segments: scheduleSegmentsForEventStart(ws.segments, record.start_at) }
  const cur = currentAndNextSegment(ws.segments, nowMs).current
  return cur?.label ?? null
}

function needsDebriefBucket(
  record: CampaignCalendarEventRecord,
  nowMs: number,
  ws: ReturnType<typeof loadEventDayWorkspace> | null,
): boolean {
  const end = safeEventEndMs(record)
  if (end == null || nowMs <= end) return false
  if (!ws) return true
  return !(ws.closure.items.length > 0 && ws.closure.items.every((x) => x.done))
}

function recentlyCompletedFollowup(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  const st = String(record.stage_status ?? '').toLowerCase()
  if (st !== 'completed') return false
  const end = safeEventEndMs(record)
  if (end == null) return false
  if (nowMs - end > 14 * 86400000) return false
  const fu = String(record.followup_state ?? '').toLowerCase()
  return fu === '' || fu === 'pending' || fu === 'needed'
}

function buildVolunteerStrainRisks(
  items: readonly TodayCommandEventItem[],
  assignmentMap: Map<string, StaffingAssignmentLike[]> | undefined,
  nowMs: number,
): VolunteerStrainRisk[] {
  if (!assignmentMap?.size) return []
  const userTo = new Map<string, { eventIds: Set<string>; label: string | null }>()
  for (const it of items) {
    const h = hoursToEventStart(it.record, nowMs)
    if (h < -6 || h > 72) continue
    const assigns = assignmentMap.get(it.record.event_id) ?? []
    for (const a of assigns) {
      const uid = a.assigned_user_id
      if (!uid) continue
      const st = String(a.status ?? '').toLowerCase()
      if (!['confirmed', 'completed', 'pending'].includes(st)) continue
      const cur = userTo.get(uid) ?? { eventIds: new Set<string>(), label: a.assigned_display_name ?? null }
      cur.eventIds.add(it.record.event_id)
      if (!cur.label && a.assigned_display_name) cur.label = a.assigned_display_name
      userTo.set(uid, cur)
    }
  }
  const out: VolunteerStrainRisk[] = []
  for (const [uid, v] of userTo) {
    if (v.eventIds.size < 2) continue
    out.push({
      user_id: uid,
      display_hint: `${v.label ?? 'Volunteer'} on ${v.eventIds.size} near-term events`,
      event_ids: [...v.eventIds],
      reason:
        'Active or pending assignments span multiple events in the ~72h window — confirm shifts and relieve collisions.',
    })
  }
  out.sort((a, b) => b.event_ids.length - a.event_ids.length)
  return out.slice(0, 12)
}

export function buildWarRoomSnapshot(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number = Date.now(),
  options?: {
    assignmentMap?: Map<string, StaffingAssignmentLike[]>
    priorScores?: ReadonlyMap<string, number>
  },
): WarRoomSnapshot {
  const wsCache = new Map<string, ReturnType<typeof loadEventDayWorkspace> | null>()

  const list = [...events]
    .filter((e) => String(e.stage_status ?? '').toLowerCase() !== 'canceled')
    .filter((e) => String(e.stage_status ?? '').toLowerCase() !== 'archived')

  const approvals = listPendingApprovalEvents(list)
  const snap = buildTodayCommandSnapshot(events, nowMs, options)
  const items = list.map((r) =>
    buildTodayCommandEventItem(r, nowMs, {
      priorScores: options?.priorScores,
      assignmentMap: options?.assignmentMap,
      allEvents: list,
    }),
  )

  const volunteer_strain_risks = buildVolunteerStrainRisks(items, options?.assignmentMap, nowMs)

  const rows: WarRoomEventRow[] = items.map((it) => {
    const rid = it.record.event_id
    const assigns = options?.assignmentMap?.get(rid)
    const baseV2 = computeEventHealthScoreV2({
      record: it.record,
      gaps: it.gaps,
      nowMs,
      prior_score: options?.priorScores?.get(rid) ?? null,
    })
    const loadWs = shouldLoadFieldWorkspace(it.record, nowMs)
    const ws = loadWs ? loadWorkspaceCached(wsCache, rid) : null
    const overlay = overlayFieldExecutionOnHealth(baseV2, it.record, ws, nowMs)
    const dayOfOpen = ws ? ws.issues.filter((x) => x.status !== 'resolved').length : 0

    const { score, codes } = computePriority({
      item: it,
      overlayScore: overlay.adjusted_score,
      overlayStatus: overlay.adjusted_status,
      fieldReasons: overlay.field_reasons,
      dayOfOpenIssues: dayOfOpen,
      nowMs,
      inApproval: isEventInApprovalPending(it.record, approvals),
      ws,
    })

    const inAppr = isEventInApprovalPending(it.record, approvals)
    const debrief = needsDebriefBucket(it.record, nowMs, ws)
    const recentFu = recentlyCompletedFollowup(it.record, nowMs)

    const bucket = assignWarRoomBucket(it.record, nowMs, {
      adjustedHealth: overlay.adjusted_score,
      inApprovalQueue: inAppr,
      needsDebriefOrClosure: debrief,
      recentlyCompletedNeedingFollowup: recentFu && !inAppr,
    })

    const rec =
      baseV2.recommended_actions[0]?.detail ??
      it.gaps[0]?.message ??
      'Open event command and triage staffing, comms, and tasks.'

    const startMs = safeEventStartMs(it.record)
    const timeline_anchor_ms = startMs == null ? nowMs : startMs

    const liveSeg = liveRosLabel(it.record, assigns, nowMs, wsCache)

    return {
      item: it,
      bucket,
      war_room_priority_score: score,
      intervention_urgency: urgencyFromScore(score),
      intervention_reason_codes: codes,
      intervention_reason_summary: buildInterventionReasonSummary(codes),
      adjusted_health_score: overlay.adjusted_score,
      adjusted_status: overlay.adjusted_status,
      field_reasons: overlay.field_reasons,
      day_of_open_issues: dayOfOpen,
      recommended_next_action: rec,
      timeline_anchor_ms,
      live_segment_label: liveSeg,
    }
  })

  rows.sort((a, b) => b.war_room_priority_score - a.war_room_priority_score)

  const closure_backlog: WarRoomClosureBacklogItem[] = []
  for (const it of items) {
    const end = safeEventEndMs(it.record)
    if (end == null || nowMs <= end) continue
    const w = loadWorkspaceCached(wsCache, it.record.event_id)
    const reasons: string[] = []
    if (!w) {
      reasons.push('No saved day-of workspace in this browser (closure checklist unknown)')
    } else {
      if (!(w.closure.items.length > 0 && w.closure.items.every((x) => x.done))) {
        reasons.push('Closure checklist incomplete')
      }
      if (!w.signup_sheet_handoff_ack) {
        reasons.push('Signup handoff not acknowledged')
      }
    }
    if (reasons.length) closure_backlog.push({ record: it.record, reasons })
  }

  const ownerMap = new Map<string | null, CampaignCalendarEventRecord[]>()
  for (const it of items) {
    const h = it.hoursUntilStart
    if (h < 0 || h > 48) continue
    const o = it.record.owner_user_id
    if (!ownerMap.has(o)) ownerMap.set(o, [])
    ownerMap.get(o)!.push(it.record)
  }
  const owner_cascade_risks: OwnerCascadeRisk[] = []
  for (const [owner, evs] of ownerMap) {
    if (!owner || evs.length < 2) continue
    owner_cascade_risks.push({
      owner_user_id: owner,
      display_hint: `Owner has ${evs.length} high-tempo events (48h window)`,
      event_ids: evs.map((e) => e.event_id),
      reason: 'Overlapping preparation / execution windows for the same coordinator owner.',
    })
  }
  owner_cascade_risks.sort((a, b) => b.event_ids.length - a.event_ids.length)

  const liveCount = rows.filter((r) => r.bucket === 'live_now').length
  const nowBand = rows.filter((r) => r.intervention_urgency === 'now').length
  const followupBucket = rows.filter((r) => r.bucket === 'recently_completed_needing_followup').length

  const liveSample = rows
    .filter((r) => r.bucket === 'live_now')
    .slice(0, 3)
    .map((r) => (r.item.record.title?.trim() ? r.item.record.title : 'Untitled event'))
  const liveTitles = liveSample.length ? `: ${liveSample.join('; ')}` : ''

  const agent_jones_brief_lines = [
    `Multi-event war room · ${new Date(nowMs).toLocaleString()} · ${list.length} active program events in the current list.`,
    `${liveCount} live now${liveTitles}. ${nowBand} row(s) in "now" urgency band (score ≥142). ${approvals.length} in governance approval queue. ${closure_backlog.length} past-end event(s) with closure/debrief gaps in local field state. ${followupBucket} recently completed with follow-up still open.`,
    snap.digest.briefingConcise,
    ...snap.digest.topRiskEvents.slice(0, 3).map((t) => {
      const title = t.title?.trim() ? t.title : 'Untitled event'
      return `Risk (digest) · ${title}: score ${t.score} — ${t.reason}`
    }),
    volunteer_strain_risks.length
      ? `Volunteer strain · ${volunteer_strain_risks.length} volunteer(s) with assignments spanning multiple near-term events — review Staffing / load balancer.`
      : 'Volunteer strain · no multi-event assignment collisions detected in the 72h assignment window.',
    'Deterministic only; Agent Jones AI (when enabled) remains advisory and non-authoritative.',
  ]

  const cross_event_issues_total = snap.issues.length
  const closure_backlog_total = closure_backlog.length

  return {
    generated_at_ms: nowMs,
    rows,
    top_urgent: rows.slice(0, 5),
    issues: snap.issues.slice(0, 24),
    cross_event_issues_total,
    closure_backlog: closure_backlog.slice(0, 24),
    closure_backlog_total,
    owner_cascade_risks: owner_cascade_risks.slice(0, 8),
    volunteer_strain_risks,
    pending_approval_event_id: approvals[0]?.event_id ?? null,
    intervention_now_count: nowBand,
    agent_jones_brief_lines,
    geo_groups: groupRowsByCounty(rows).slice(0, 16),
  }
}
