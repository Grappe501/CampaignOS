/**
 * Event summary selectors (blueprint 14) — pure layer shared by widgets, desks, and future Agent Jones.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  collectOperationsGapsForDesk,
  type CoordinatorOperationsGap,
} from './campaignEventCoordinatorOperations'
import {
  groupEventsByLocalDay,
  inferFunctionSegment,
  parseEventStartMs,
  pickUpcomingStrip,
  sortEventsByStartAsc,
} from './campaignCalendarSegmentEngine'

export type CalendarWidgetPersona =
  | 'admin'
  | 'campaign_manager'
  | 'candidate'
  | 'coordinator'
  | 'volunteer'

export type EventSummaryFilter = {
  dateFrom?: string
  dateTo?: string
  eventTypes?: string[]
  visibilityScopes?: string[]
  countyIds?: string[]
  precinctIds?: string[]
  ownerUserIds?: string[]
  candidateOnly?: boolean
  fundraisingOnly?: boolean
  publicOnly?: boolean
}

export type UpcomingCampaignItem = {
  eventId: string
  title: string
  eventType: string
  startAt: string
  countyLabel?: string | null
  visibilityScope: string
  candidateInvolved?: boolean
  fundraisingTouch?: boolean
  urgency: 'low' | 'watch' | 'high'
}

/** Blueprint 14 count shape (Mobilize queue pressure uses eligible+queued+sync+update bucket elsewhere). */
export type EventPressureSummaryCounts = {
  approvalBacklogCount: number
  staffingGapCount: number
  logisticsGapCount: number
  mobilizeQueueCount: number
  followupOverdueCount: number
  highPriorityRiskCount: number
}

export type MobilizeQueueSummary = {
  eligibleCount: number
  queuedCount: number
  publishedCount: number
  syncErrorCount: number
  updateRequiredCount: number
}

export type PostEventFollowupSummary = {
  attendanceReconciliationPending: number
  donorFollowUpPending: number
  volunteerFollowUpPending: number
  supporterFollowUpPending: number
  mediaCommsHandoffPending: number
}

export type CountyEventCoverageSummary = {
  quietAreaLabels: string[]
  overloadedAreaLabels: string[]
  atRiskAreaLabels: string[]
  activeAreaCount: number
}

export type CandidateEventSummary = {
  nextItems: UpcomingCampaignItem[]
  briefingNeededCount: number
  upcomingPublicCount: number
  upcomingPrivateCount: number
  upcomingFundraisingCount: number
  highPriorityCandidateCount: number
}

export type EventCalendarSummaryDay = {
  dayKey: string
  label: string
  count: number
  candidateInvolvedCount: number
  publicSurfaceCount: number
  fundraisingTouchCount: number
  titles: string[]
}

export type EventCalendarSummary = {
  windowDays: number
  fromMs: number
  toMs: number
  days: EventCalendarSummaryDay[]
}

const MS_DAY = 86_400_000

const MOB_QUEUE_PRESSURE = new Set([
  'eligible',
  'draft_ready',
  'queued',
  'queued_for_publish',
  'sync_error',
  'update_required',
])

const APPROVEDISH = new Set([
  'approved',
  'scheduled',
  'published_internal',
  'published_public',
])

export function mapProfileRoleToCalendarWidgetPersona(
  role: string | null | undefined,
): CalendarWidgetPersona {
  const k = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return 'volunteer'
  if (k === 'admin') return 'admin'
  if (k === 'staff' || k === 'campaign_manager') return 'campaign_manager'
  if (
    (k.includes('assistant') || k.includes('deputy')) &&
    (k.includes('manager') || k.includes('campaign') || k.includes('cm'))
  ) {
    return 'campaign_manager'
  }
  if (k === 'candidate') return 'candidate'
  if (
    k === 'coordinator' ||
    k === 'volunteer_coordinator' ||
    k === 'event_coordinator'
  ) {
    return 'coordinator'
  }
  if (k === 'intern') return 'volunteer'
  return 'volunteer'
}

function isApprovedishStage(stage: string): boolean {
  return APPROVEDISH.has(stage)
}

export function filterEventsForCalendarPersona(
  events: readonly CampaignCalendarEventRecord[],
  persona: CalendarWidgetPersona,
): CampaignCalendarEventRecord[] {
  return events.filter((e) => {
    const vis = String(e.visibility_scope)
    const stage = String(e.stage_status)
    if (persona === 'admin') return true
    if (persona === 'campaign_manager') {
      if (vis === 'leadership_only') return Boolean(e.candidate_flag)
      return true
    }
    if (persona === 'candidate') {
      return (
        Boolean(e.candidate_flag) ||
        vis === 'public_visible' ||
        vis === 'volunteer_visible'
      )
    }
    if (persona === 'coordinator') {
      return vis !== 'leadership_only'
    }
    if (
      vis === 'internal_staff' ||
      vis === 'finance_private' ||
      vis === 'leadership_only'
    ) {
      return false
    }
    return (
      (vis === 'volunteer_visible' || vis === 'public_visible') &&
      isApprovedishStage(stage)
    )
  })
}

function parseBoundaryMs(iso: string | undefined, endOfDay: boolean): number | null {
  if (!iso || !iso.trim()) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  if (endOfDay) return t + MS_DAY - 1
  return t
}

/** Structured filters on raw rows (compose after persona scoping if needed). */
export function filterEvents(
  events: readonly CampaignCalendarEventRecord[],
  f: EventSummaryFilter,
): CampaignCalendarEventRecord[] {
  const fromMs = parseBoundaryMs(f.dateFrom, false)
  const toMs = parseBoundaryMs(f.dateTo, true)
  const types = f.eventTypes?.length ? new Set(f.eventTypes) : null
  const vis = f.visibilityScopes?.length ? new Set(f.visibilityScopes) : null
  const counties = f.countyIds?.length ? new Set(f.countyIds) : null
  const precincts = f.precinctIds?.length ? new Set(f.precinctIds) : null
  const owners = f.ownerUserIds?.length ? new Set(f.ownerUserIds) : null

  return events.filter((e) => {
    const start = parseEventStartMs(e.start_at)
    if (fromMs != null && start < fromMs) return false
    if (toMs != null && start > toMs) return false
    if (types && !types.has(e.event_type)) return false
    if (vis && !vis.has(String(e.visibility_scope))) return false
    if (counties) {
      const c = (e.county_id ?? '').trim()
      if (!c || !counties.has(c)) return false
    }
    if (precincts) {
      const p = (e.precinct_id ?? '').trim()
      if (!p || !precincts.has(p)) return false
    }
    if (owners) {
      const o = (e.owner_user_id ?? '').trim()
      if (!o || !owners.has(o)) return false
    }
    if (f.candidateOnly && !e.candidate_flag) return false
    if (f.fundraisingOnly && !e.finance_flag && !e.event_type.includes('fundraising')) {
      return false
    }
    if (f.publicOnly) {
      const v = String(e.visibility_scope)
      if (v !== 'public_visible' && v !== 'volunteer_visible' && v !== 'field_team') {
        return false
      }
    }
    return true
  })
}

export function eventEndedAt(e: CampaignCalendarEventRecord, nowMs: number): boolean {
  const t = new Date(e.end_at ?? e.start_at).getTime()
  return !Number.isNaN(t) && t < nowMs
}

export function scoreEventUrgency(
  e: CampaignCalendarEventRecord,
  nowMs: number,
): 'low' | 'watch' | 'high' {
  const start = parseEventStartMs(e.start_at)
  const days = (start - nowMs) / MS_DAY
  const mob = String(e.mobilize_publish_state ?? '')
  if (
    days <= 2 &&
    (e.staffing_state === 'at_risk' ||
      e.staffing_state === 'unstaffed' ||
      mob === 'sync_error' ||
      (e.candidate_flag && e.visibility_scope === 'public_visible'))
  ) {
    return 'high'
  }
  if (days <= 7 && (MOB_QUEUE_PRESSURE.has(mob) || e.staffing_state === 'at_risk')) {
    return 'watch'
  }
  if (days <= 2) return 'watch'
  return 'low'
}

function uniqueEventIds(gaps: CoordinatorOperationsGap[], categories: Set<string>): number {
  return new Set(
    gaps.filter((g) => categories.has(g.category)).map((g) => g.event_id),
  ).size
}

export function summarizeEventPressure(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): EventPressureSummaryCounts {
  let approvalBacklogCount = 0
  let staffingGapCount = 0
  let mobilizeQueueCount = 0
  let highPriorityRiskCount = 0

  for (const e of pool) {
    const st = String(e.stage_status)
    if (st === 'draft' || st === 'submitted') approvalBacklogCount += 1
    if (e.staffing_state === 'unstaffed' || e.staffing_state === 'at_risk') {
      staffingGapCount += 1
    }
    const mob = String(e.mobilize_publish_state ?? '')
    if (MOB_QUEUE_PRESSURE.has(mob)) mobilizeQueueCount += 1
    if (
      Boolean(e.candidate_flag) &&
      (e.staffing_state === 'at_risk' || e.staffing_state === 'unstaffed')
    ) {
      highPriorityRiskCount += 1
    } else if (
      Boolean(e.finance_flag) &&
      eventEndedAt(e, nowMs) &&
      st !== 'completed' &&
      st !== 'canceled'
    ) {
      highPriorityRiskCount += 1
    }
  }

  const gaps = collectOperationsGapsForDesk(pool)
  const logisticsGapCount = uniqueEventIds(gaps, new Set(['logistics']))
  const followupOverdueCount = new Set(
    gaps.filter((g) => g.category === 'followup').map((g) => g.event_id),
  ).size

  return {
    approvalBacklogCount,
    staffingGapCount,
    logisticsGapCount,
    mobilizeQueueCount,
    followupOverdueCount,
    highPriorityRiskCount,
  }
}

export function buildEventPressureBullets(c: EventPressureSummaryCounts): string[] {
  const bullets: string[] = []
  if (c.approvalBacklogCount > 0) {
    bullets.push(
      `${c.approvalBacklogCount} event${c.approvalBacklogCount === 1 ? '' : 's'} still in draft or submitted — clear the approval queue.`,
    )
  }
  if (c.staffingGapCount > 0) {
    bullets.push(
      `${c.staffingGapCount} event${c.staffingGapCount === 1 ? '' : 's'} need staffing coverage or are at risk.`,
    )
  }
  if (c.logisticsGapCount > 0) {
    bullets.push(
      `${c.logisticsGapCount} event${c.logisticsGapCount === 1 ? '' : 's'} have logistics or venue gaps.`,
    )
  }
  if (c.mobilizeQueueCount > 0) {
    bullets.push(
      `${c.mobilizeQueueCount} Mobilize row${c.mobilizeQueueCount === 1 ? '' : 's'} in queue, eligible, sync error, or update-required.`,
    )
  }
  if (c.followupOverdueCount > 0) {
    bullets.push(
      `${c.followupOverdueCount} ended event${c.followupOverdueCount === 1 ? '' : 's'} missing follow-up state.`,
    )
  }
  if (c.highPriorityRiskCount > 0) {
    bullets.push(
      `${c.highPriorityRiskCount} high-visibility or finance touchpoint${c.highPriorityRiskCount === 1 ? '' : 's'} need a decision.`,
    )
  }
  if (bullets.length === 0) {
    bullets.push('No automated pressure signals in this snapshot.')
  }
  return bullets
}

export function summarizeMobilizeQueue(
  pool: readonly CampaignCalendarEventRecord[],
): MobilizeQueueSummary {
  let eligibleCount = 0
  let queuedCount = 0
  let publishedCount = 0
  let syncErrorCount = 0
  let updateRequiredCount = 0

  for (const e of pool) {
    if (e.mobilize_update_needed) updateRequiredCount += 1
    const m = String(e.mobilize_publish_state ?? '')
    if (m === 'eligible') eligibleCount += 1
    else if (
      m === 'queued' ||
      m === 'queued_for_publish' ||
      m === 'draft_ready' ||
      m === 'update_required'
    ) {
      queuedCount += 1
    } else if (m === 'sync_error') syncErrorCount += 1
    else if (m === 'published') publishedCount += 1
  }

  return {
    eligibleCount,
    queuedCount,
    publishedCount,
    syncErrorCount,
    updateRequiredCount,
  }
}

export function summarizePostEventFollowup(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): PostEventFollowupSummary {
  const attendance = new Set<string>()
  const donor = new Set<string>()
  const volunteer = new Set<string>()
  const supporter = new Set<string>()
  const media = new Set<string>()

  for (const g of collectOperationsGapsForDesk(pool)) {
    if (g.category === 'followup') attendance.add(g.event_id)
    if (g.category === 'attendance' && g.message.toLowerCase().includes('donor')) {
      donor.add(g.event_id)
    }
  }

  for (const e of pool) {
    if (!eventEndedAt(e, nowMs)) continue
    const fu = (e.followup_state ?? '').trim()
    if (fu) {
      if (e.finance_flag && !fu.toLowerCase().includes('donor')) donor.add(e.event_id)
      continue
    }
    if (e.finance_flag) {
      donor.add(e.event_id)
      continue
    }
    if (e.visibility_scope === 'volunteer_visible') volunteer.add(e.event_id)
    else if (e.candidate_flag && e.visibility_scope === 'public_visible') {
      media.add(e.event_id)
    } else {
      supporter.add(e.event_id)
    }
  }

  return {
    attendanceReconciliationPending: attendance.size,
    donorFollowUpPending: donor.size,
    volunteerFollowUpPending: volunteer.size,
    supporterFollowUpPending: supporter.size,
    mediaCommsHandoffPending: media.size,
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export function summarizeCountyCoverage(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  horizonDays: number,
  overloadThreshold = 2,
): CountyEventCoverageSummary {
  const endMs = nowMs + horizonDays * MS_DAY
  const counts = new Map<string, number>()
  const atRisk = new Set<string>()

  const universe = new Set<string>()
  for (const e of pool) {
    const c = (e.county_id ?? '').trim()
    if (c) universe.add(c)
  }

  for (const e of pool) {
    const t = parseEventStartMs(e.start_at)
    if (t < nowMs || t > endMs) continue
    const cid = (e.county_id ?? '').trim()
    if (!cid) continue
    counts.set(cid, (counts.get(cid) ?? 0) + 1)
    if (e.staffing_state === 'at_risk' || e.staffing_state === 'unstaffed') {
      atRisk.add(cid)
    }
  }

  const quietAreaLabels: string[] = []
  const overloadedAreaLabels: string[] = []

  for (const cid of universe) {
    const n = counts.get(cid) ?? 0
    if (n === 0) quietAreaLabels.push(cid.replace(/-/g, ' '))
    if (n >= overloadThreshold) overloadedAreaLabels.push(cid.replace(/-/g, ' '))
  }
  quietAreaLabels.sort()
  overloadedAreaLabels.sort()

  return {
    quietAreaLabels,
    overloadedAreaLabels,
    atRiskAreaLabels: [...atRisk].map((id) => id.replace(/-/g, ' ')).sort(),
    activeAreaCount: [...counts.values()].filter((n) => n > 0).length,
  }
}

export function mapEventsToUpcomingItems(
  records: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): UpcomingCampaignItem[] {
  return records.map((e) => ({
    eventId: e.event_id,
    title: e.title,
    eventType: e.event_type,
    startAt: e.start_at,
    countyLabel: e.county_id ? e.county_id.replace(/-/g, ' ') : null,
    visibilityScope: String(e.visibility_scope),
    candidateInvolved: Boolean(e.candidate_flag),
    fundraisingTouch: Boolean(e.finance_flag),
    urgency: scoreEventUrgency(e, nowMs),
  }))
}

export function buildUpcomingCampaignItems(
  personaScopedEvents: readonly CampaignCalendarEventRecord[],
  limit: number,
  nowMs: number,
): UpcomingCampaignItem[] {
  const upcoming = pickUpcomingStrip(personaScopedEvents, limit, nowMs)
  return mapEventsToUpcomingItems(upcoming, nowMs)
}

export function buildCandidateEventSummary(
  personaScopedEvents: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): CandidateEventSummary {
  const upcoming = sortEventsByStartAsc(personaScopedEvents).filter(
    (e) => parseEventStartMs(e.start_at) >= nowMs,
  )
  const flagged = upcoming.filter((e) => e.candidate_flag)
  const pool = flagged.length > 0 ? flagged : upcoming

  const nextItems: UpcomingCampaignItem[] = mapEventsToUpcomingItems(pool.slice(0, 8), nowMs)

  let briefingNeededCount = 0
  let upcomingPublicCount = 0
  let upcomingPrivateCount = 0
  let upcomingFundraisingCount = 0
  let highPriorityCandidateCount = 0

  for (const e of pool) {
    if (e.candidate_flag && !(e.notes ?? '').trim() && !(e.public_description ?? '').trim()) {
      briefingNeededCount += 1
    }
    const v = String(e.visibility_scope)
    if (v === 'public_visible' || v === 'volunteer_visible' || v === 'field_team') {
      upcomingPublicCount += 1
    } else if (v === 'finance_private' || v === 'internal_staff' || v === 'leadership_only') {
      upcomingPrivateCount += 1
    }
    if (e.finance_flag || e.event_type.includes('fundraising')) upcomingFundraisingCount += 1
    if (
      e.candidate_flag &&
      (e.staffing_state === 'at_risk' ||
        e.staffing_state === 'unstaffed' ||
        e.event_type === 'campaign_rally')
    ) {
      highPriorityCandidateCount += 1
    }
  }

  return {
    nextItems,
    briefingNeededCount,
    upcomingPublicCount,
    upcomingPrivateCount,
    upcomingFundraisingCount,
    highPriorityCandidateCount,
  }
}

export function buildEventCalendarSummary(
  personaScopedEvents: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  windowDays: number,
): EventCalendarSummary {
  const endMs = nowMs + windowDays * MS_DAY
  const inWin = personaScopedEvents.filter((e) => {
    const t = parseEventStartMs(e.start_at)
    return t >= nowMs && t <= endMs
  })
  const byDay = groupEventsByLocalDay(inWin)
  const keys = [...byDay.keys()].sort()
  const days: EventCalendarSummaryDay[] = []

  for (const dayKey of keys) {
    const list = byDay.get(dayKey) ?? []
    let candidateInvolvedCount = 0
    let publicSurfaceCount = 0
    let fundraisingTouchCount = 0
    for (const e of list) {
      if (e.candidate_flag) candidateInvolvedCount += 1
      const v = String(e.visibility_scope)
      if (v === 'public_visible' || v === 'volunteer_visible') publicSurfaceCount += 1
      if (e.finance_flag) fundraisingTouchCount += 1
    }
    days.push({
      dayKey,
      label: formatShortDate(list[0]?.start_at ?? dayKey),
      count: list.length,
      candidateInvolvedCount,
      publicSurfaceCount,
      fundraisingTouchCount,
      titles: list.slice(0, 6).map((e) => e.title),
    })
  }

  return {
    windowDays,
    fromMs: nowMs,
    toMs: endMs,
    days: days.slice(0, windowDays + 2),
  }
}

/** Admin “strategic” strip pool — same heuristic as calendar widgets. */
export function adminUpcomingStrategicPool(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return events.filter(
    (e) =>
      Boolean(e.candidate_flag) ||
      Boolean(e.finance_flag) ||
      e.visibility_scope === 'public_visible' ||
      e.staffing_state === 'at_risk' ||
      e.staffing_state === 'unstaffed',
  )
}

export function buildUpcomingStripForPersona(
  events: readonly CampaignCalendarEventRecord[],
  persona: CalendarWidgetPersona,
  limit: number,
  nowMs: number,
): CampaignCalendarEventRecord[] {
  const filtered = filterEventsForCalendarPersona(events, persona)
  if (persona === 'admin') {
    return pickUpcomingStrip(adminUpcomingStrategicPool(events), limit, nowMs)
  }
  return pickUpcomingStrip(filtered, limit, nowMs)
}

export type CountyRailRow = {
  county_id: string
  label: string
  count: number
}

export function buildCountyRailRows(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  days: number,
): CountyRailRow[] {
  const endMs = nowMs + days * MS_DAY
  const counts = new Map<string, number>()
  for (const e of pool) {
    const t = parseEventStartMs(e.start_at)
    if (t < nowMs || t > endMs) continue
    const cid = (e.county_id ?? '').trim()
    if (!cid) continue
    counts.set(cid, (counts.get(cid) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([county_id, count]) => ({
      county_id,
      label: county_id.replace(/-/g, ' '),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export type MobilizeQueueSlice = {
  eligible: number
  queued: number
  syncError: number
  published: number
  samples: { event_id: string; title: string; state: string }[]
}

export function buildMobilizeQueueSlice(
  pool: readonly CampaignCalendarEventRecord[],
): MobilizeQueueSlice {
  const summary = summarizeMobilizeQueue(pool)
  const samplePool: CampaignCalendarEventRecord[] = []
  for (const e of pool) {
    const m = String(e.mobilize_publish_state ?? '')
    if (
      m === 'eligible' ||
      m === 'queued' ||
      m === 'queued_for_publish' ||
      m === 'draft_ready' ||
      m === 'update_required' ||
      m === 'sync_error'
    ) {
      samplePool.push(e)
    }
  }
  const samples = samplePool.slice(0, 5).map((e) => ({
    event_id: e.event_id,
    title: e.title,
    state: String(e.mobilize_publish_state ?? '—'),
  }))
  return {
    eligible: summary.eligibleCount,
    queued: summary.queuedCount,
    syncError: summary.syncErrorCount,
    published: summary.publishedCount,
    samples,
  }
}

export type CalendarSnapshotDay = {
  dayKey: string
  label: string
  count: number
  titles: string[]
}

export function buildCalendarSnapshotDays(
  filtered: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  horizonDays: number,
): CalendarSnapshotDay[] {
  const summary = buildEventCalendarSummary(filtered, nowMs, horizonDays)
  return summary.days.map((d) => ({
    dayKey: d.dayKey,
    label: d.label,
    count: d.count,
    titles: d.titles,
  }))
}

export type CandidateFocusItem = {
  event_id: string
  title: string
  start_at: string
  kind: string
}

export function buildCandidateFocusItems(
  filtered: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): CandidateFocusItem[] {
  const upcoming = sortEventsByStartAsc(filtered).filter(
    (e) => parseEventStartMs(e.start_at) >= nowMs,
  )
  const flagged = upcoming.filter((e) => e.candidate_flag)
  const pool = flagged.length > 0 ? flagged : upcoming
  return pool.slice(0, 6).map((e) => ({
    event_id: e.event_id,
    title: e.title,
    start_at: e.start_at,
    kind: inferFunctionSegment(e),
  }))
}

export type WidgetEventPressure = {
  approvalBacklog: number
  staffingGaps: number
  logisticsGaps: number
  mobilizeQueue: number
  followupDebt: number
  highPriorityRisk: number
  bullets: string[]
}

export function buildWidgetEventPressure(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): WidgetEventPressure {
  const c = summarizeEventPressure(pool, nowMs)
  return {
    approvalBacklog: c.approvalBacklogCount,
    staffingGaps: c.staffingGapCount,
    logisticsGaps: c.logisticsGapCount,
    mobilizeQueue: c.mobilizeQueueCount,
    followupDebt: c.followupOverdueCount,
    highPriorityRisk: c.highPriorityRiskCount,
    bullets: buildEventPressureBullets(c),
  }
}

export type FollowupSlice = {
  count: number
  samples: { event_id: string; title: string }[]
}

export function buildFollowupSlice(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): FollowupSlice {
  const rows = pool.filter(
    (e) => eventEndedAt(e, nowMs) && !(e.followup_state ?? '').trim(),
  )
  return {
    count: rows.length,
    samples: rows.slice(0, 5).map((e) => ({
      event_id: e.event_id,
      title: e.title,
    })),
  }
}
