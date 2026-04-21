/**
 * Field / day-of execution — deterministic core (phase, RoS segments, check-ins from staffing).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import type {
  DayOfPhaseState,
  EventDayOfWorkspace,
  FieldCheckInEntry,
  FieldIssueEntry,
  RunOfShowExecutionSegment,
  RunOfShowSegmentStatus,
  FieldCheckInStatus,
  FieldIssueCategory,
  FieldIssueSeverity,
} from './eventDayOfSchemas'
import { defaultClosureItems } from './eventDayOfClosureDefaults'

export { defaultClosureItems }

const DEFAULT_SEGMENTS: Omit<RunOfShowExecutionSegment, 'scheduled_start_at' | 'scheduled_end_at'>[] = [
  {
    id: 'seg-arrival',
    label: 'Arrival / greeter window',
    offset_minutes_from_start: -30,
    duration_minutes: 30,
    owner_role: 'greeter',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: [],
  },
  {
    id: 'seg-setup',
    label: 'Setup & signage',
    offset_minutes_from_start: -45,
    duration_minutes: 45,
    owner_role: 'setup',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: [],
  },
  {
    id: 'seg-welcome',
    label: 'Welcome & ground rules',
    offset_minutes_from_start: 0,
    duration_minutes: 15,
    owner_role: 'event_lead',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: ['seg-setup'],
  },
  {
    id: 'seg-remarks',
    label: 'Program / remarks',
    offset_minutes_from_start: 15,
    duration_minutes: 25,
    owner_role: 'event_lead',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: ['seg-welcome'],
  },
  {
    id: 'seg-asks',
    label: 'Volunteer & voter asks',
    offset_minutes_from_start: 40,
    duration_minutes: 15,
    owner_role: 'volunteer_captain',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: ['seg-remarks'],
  },
  {
    id: 'seg-close',
    label: 'Close & next steps',
    offset_minutes_from_start: 55,
    duration_minutes: 10,
    owner_role: 'event_lead',
    status: 'pending',
    actual_start_at: null,
    actual_end_at: null,
    delay_minutes: null,
    delay_reason: null,
    notes: '',
    depends_on_segment_ids: ['seg-asks'],
  },
]

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function checkInMergeKey(c: { staff_role_slug: string; assigned_user_id: string | null }): string {
  return `${c.staff_role_slug}\0${c.assigned_user_id ?? ''}`
}

function eventTimes(record: CampaignCalendarEventRecord): { startMs: number; endMs: number } | null {
  const s = new Date(record.start_at).getTime()
  if (Number.isNaN(s)) return null
  const e = new Date(record.end_at || record.start_at).getTime()
  return { startMs: s, endMs: Number.isNaN(e) ? s + 3600000 : e }
}

/** Clock-based phase when `phase_override` is null. */
export function deriveRecommendedDayOfPhase(
  record: CampaignCalendarEventRecord,
  nowMs: number,
): DayOfPhaseState {
  const t = eventTimes(record)
  if (!t) return 'pre_open'
  const { startMs, endMs } = t
  const TWO_H = 7200000
  const ONE_H = 3600000

  if (nowMs < startMs - ONE_H) return 'pre_open'
  if (nowMs < startMs) return 'setup'
  if (nowMs >= startMs && nowMs <= endMs) return 'live'
  if (nowMs > endMs && nowMs <= endMs + 30 * 60000) return 'winding_down'
  if (nowMs > endMs + 30 * 60000 && nowMs <= endMs + TWO_H) return 'teardown'
  return 'debrief_ready'
}

export function scheduleSegmentsForEventStart(
  segments: RunOfShowExecutionSegment[],
  eventStartIso: string,
): RunOfShowExecutionSegment[] {
  const startMs = new Date(eventStartIso).getTime()
  if (Number.isNaN(startMs)) return segments
  return segments.map((seg) => {
    const sm = startMs + seg.offset_minutes_from_start * 60000
    const em =
      seg.duration_minutes != null ? sm + seg.duration_minutes * 60000 : null
    return {
      ...seg,
      scheduled_start_at: iso(sm),
      scheduled_end_at: em != null ? iso(em) : null,
    }
  })
}

export function buildCheckInsFromAssignments(
  assignments: readonly StaffingAssignmentLike[],
): FieldCheckInEntry[] {
  return assignments.map((a, i) => ({
    id: `ci-${a.staff_role_slug}-${a.assigned_user_id ?? 'open'}-${i}`,
    staff_role_slug: a.staff_role_slug,
    label: a.shift_label?.trim()
      ? `${a.staff_role_slug.replace(/_/g, ' ')} (${a.shift_label})`
      : a.staff_role_slug.replace(/_/g, ' '),
    assigned_user_id: a.assigned_user_id,
    status: 'expected',
    checked_in_at: null,
    note: '',
  }))
}

export function buildInitialDayOfWorkspace(
  record: CampaignCalendarEventRecord,
  assignments: readonly StaffingAssignmentLike[],
): EventDayOfWorkspace {
  const baseSegs: RunOfShowExecutionSegment[] = DEFAULT_SEGMENTS.map((s) => ({
    ...s,
    scheduled_start_at: null,
    scheduled_end_at: null,
  }))
  const segments = scheduleSegmentsForEventStart(baseSegs, record.start_at)
  const check_ins = buildCheckInsFromAssignments(assignments)

  return {
    v: 1,
    event_id: record.event_id,
    updated_at: new Date().toISOString(),
    phase_override: null,
    segments,
    check_ins,
    issues: [],
    closure: { items: defaultClosureItems(), debrief_notes: '' },
    signup_sheet_handoff_ack: false,
    audit: [
      {
        at: new Date().toISOString(),
        action: 'day_of_initialized',
        detail: `${segments.length} segments · ${check_ins.length} check-in rows`,
      },
    ],
  }
}

export function mergeAssignmentsIntoCheckins(
  ws: EventDayOfWorkspace,
  assignments: readonly StaffingAssignmentLike[],
): EventDayOfWorkspace {
  if (!assignments.length) {
    return { ...ws, check_ins: [], updated_at: new Date().toISOString() }
  }
  const fresh = buildCheckInsFromAssignments(assignments)
  const prevByKey = new Map(ws.check_ins.map((c) => [checkInMergeKey(c), c]))
  const out = fresh.map((n) => {
    const old = prevByKey.get(checkInMergeKey(n))
    if (old && old.staff_role_slug === n.staff_role_slug && old.assigned_user_id === n.assigned_user_id) {
      return { ...n, id: old.id, status: old.status, checked_in_at: old.checked_in_at, note: old.note }
    }
    return n
  })
  return { ...ws, check_ins: out, updated_at: new Date().toISOString() }
}

export function currentAndNextSegment(
  segments: RunOfShowExecutionSegment[],
  nowMs: number,
): { current: RunOfShowExecutionSegment | null; next: RunOfShowExecutionSegment | null } {
  const ordered = [...segments].sort((a, b) => {
    const ta = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : 0
    const tb = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : 0
    return ta - tb
  })
  const active = ordered.find((s) => s.status === 'active')
  if (active) {
    const idx = ordered.indexOf(active)
    const nxt = ordered.slice(idx + 1).find((s) => s.status !== 'complete' && s.status !== 'skipped')
    return { current: active, next: nxt ?? null }
  }
  /** Delayed segments stay operationally visible even when scheduled time has passed. */
  const delayedFocus = ordered.find((s) => s.status === 'delayed')
  if (delayedFocus) {
    const idx = ordered.indexOf(delayedFocus)
    const nxt = ordered.slice(idx + 1).find((s) => s.status !== 'complete' && s.status !== 'skipped')
    return { current: delayedFocus, next: nxt ?? null }
  }
  const nextTimeOrFuture = ordered.find((s) => {
    if (s.status === 'complete' || s.status === 'skipped') return false
    const st = s.scheduled_start_at ? new Date(s.scheduled_start_at).getTime() : null
    return st == null || st >= nowMs
  })
  if (nextTimeOrFuture) return { current: null, next: nextTimeOrFuture }
  const nextIncomplete = ordered.find((s) => s.status !== 'complete' && s.status !== 'skipped')
  return { current: null, next: nextIncomplete ?? null }
}

/** When closure is marked done, flag contradictions with field truth (audit / debrief safety). */
export function buildFieldClosureIntegrityWarnings(ws: EventDayOfWorkspace): string[] {
  const warnings: string[] = []
  const allDone = ws.closure.items.length > 0 && ws.closure.items.every((x) => x.done)
  if (!allDone) return warnings

  const openIssues = ws.issues.filter((i) => i.status !== 'resolved').length
  if (openIssues > 0) {
    warnings.push(`Closure is checked complete but ${openIssues} field issue(s) remain open or escalated.`)
  }
  if (ws.check_ins.length > 0) {
    const pendCi = ws.check_ins.filter((c) => c.status === 'expected' || c.status === 'late').length
    if (pendCi > 0) {
      warnings.push(`Closure is checked complete but ${pendCi} staffing check-in row(s) are still expected or late.`)
    }
  }
  if (!ws.signup_sheet_handoff_ack) {
    warnings.push('Closure is checked complete but signup sheet handoff is not acknowledged.')
  }
  return warnings
}

/** Operator-facing bullets for Agent Jones / clipboard (deterministic). */
export function buildDayOfBriefingLines(args: {
  record: CampaignCalendarEventRecord
  ws: EventDayOfWorkspace
  phase: DayOfPhaseState
}): string[] {
  const { record, ws, phase } = args
  const lines: string[] = []
  const title = record.title?.trim() ? record.title : 'Untitled event'
  lines.push(`Event: ${title} · phase ${phase.replace(/_/g, ' ')}`)
  const pend = ws.segments.filter((s) => s.status === 'pending' || s.status === 'delayed').length
  const actIssues = ws.issues.filter((i) => i.status !== 'resolved').length
  lines.push(`Run of show: ${pend} segment(s) not complete · ${actIssues} active field issue(s).`)
  if (actIssues > 0) lines.push('Resolve or assign owners for open issues before debrief.')
  const ciOut = ws.check_ins.filter((c) => c.status === 'expected' || c.status === 'late').length
  if (ciOut > 0) lines.push(`Check-in: ${ciOut} role(s) still expected or late.`)

  const missingClosure = ws.closure.items.filter((x) => !x.done).map((x) => x.label)
  if (missingClosure.length > 0) {
    lines.push(`Closure incomplete: ${missingClosure.slice(0, 4).join('; ')}${missingClosure.length > 4 ? '…' : ''}`)
  }

  for (const w of buildFieldClosureIntegrityWarnings(ws)) {
    if (lines.length >= 8) break
    lines.push(w)
  }

  if (!ws.signup_sheet_handoff_ack && phase !== 'pre_open') {
    lines.push('Signup sheet handoff not yet acknowledged — confirm capture or ingestion queue.')
  }

  if (lines.length < 3) {
    lines.push('Field snapshot: timeline, staffing check-in, and issue log are stored in this browser for v1.')
  }

  return lines.slice(0, 8)
}

export function effectiveDayOfPhase(ws: EventDayOfWorkspace, record: CampaignCalendarEventRecord, nowMs: number): DayOfPhaseState {
  if (ws.phase_override) return ws.phase_override
  return deriveRecommendedDayOfPhase(record, nowMs)
}

function audit(ws: EventDayOfWorkspace, action: string, detail: string): EventDayOfWorkspace {
  return {
    ...ws,
    audit: [...ws.audit, { at: new Date().toISOString(), action, detail }].slice(-100),
  }
}

export function withSegmentStatus(
  ws: EventDayOfWorkspace,
  segmentId: string,
  status: RunOfShowSegmentStatus,
  opts?: { delay_reason?: string | null; delay_minutes?: number | null },
): EventDayOfWorkspace {
  const now = new Date().toISOString()
  const segments = ws.segments.map((s) => {
    if (s.id !== segmentId) {
      if (status === 'active' && s.status === 'active') {
        return { ...s, status: 'pending' as const }
      }
      return s
    }
    const next: RunOfShowExecutionSegment = {
      ...s,
      status,
      delay_reason: opts?.delay_reason !== undefined ? opts.delay_reason : s.delay_reason,
      delay_minutes: opts?.delay_minutes !== undefined ? opts.delay_minutes : s.delay_minutes,
    }
    if (status === 'active' && !next.actual_start_at) next.actual_start_at = now
    if (status === 'complete' && !next.actual_end_at) next.actual_end_at = now
    if (status === 'delayed' && next.delay_minutes == null) next.delay_minutes = 5
    return next
  })
  return audit({ ...ws, segments, updated_at: now }, 'segment_status', `${segmentId}→${status}`)
}

export function withCheckInStatus(
  ws: EventDayOfWorkspace,
  entryId: string,
  status: FieldCheckInStatus,
): EventDayOfWorkspace {
  const now = new Date().toISOString()
  const check_ins = ws.check_ins.map((c) => {
    if (c.id !== entryId) return c
    const checked_in_at =
      status === 'checked_in' || status === 'backup_active' ? c.checked_in_at ?? now : null
    return {
      ...c,
      status,
      checked_in_at,
    }
  })
  return audit({ ...ws, check_ins, updated_at: now }, 'check_in', `${entryId}→${status}`)
}

export function addFieldIssue(
  ws: EventDayOfWorkspace,
  input: {
    category: FieldIssueCategory
    severity: FieldIssueSeverity
    title: string
    detail: string
    linked_segment_id: string | null
  },
): EventDayOfWorkspace {
  const now = new Date().toISOString()
  const row: FieldIssueEntry = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `iss-${crypto.randomUUID()}`
        : `iss-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    category: input.category,
    severity: input.severity,
    title: input.title.trim().slice(0, 120),
    detail: input.detail.trim().slice(0, 2000),
    status: 'open',
    owner_hint: 'event_lead',
    created_at: now,
    resolved_at: null,
    linked_segment_id: input.linked_segment_id,
  }
  return audit({ ...ws, issues: [...ws.issues, row], updated_at: now }, 'issue_added', row.id)
}

export function resolveFieldIssue(ws: EventDayOfWorkspace, issueId: string): EventDayOfWorkspace {
  const now = new Date().toISOString()
  const issues = ws.issues.map((i) =>
    i.id === issueId ? { ...i, status: 'resolved' as const, resolved_at: now } : i,
  )
  return audit({ ...ws, issues, updated_at: now }, 'issue_resolved', issueId)
}

export function withClosureItem(ws: EventDayOfWorkspace, itemId: string, done: boolean): EventDayOfWorkspace {
  const now = new Date().toISOString()
  const items = ws.closure.items.map((x) => (x.id === itemId ? { ...x, done } : x))
  return audit({ ...ws, closure: { ...ws.closure, items }, updated_at: now }, 'closure_item', `${itemId}:${done}`)
}

export function withPhaseOverride(ws: EventDayOfWorkspace, phase: DayOfPhaseState | null): EventDayOfWorkspace {
  const now = new Date().toISOString()
  return audit({ ...ws, phase_override: phase, updated_at: now }, 'phase_override', phase ?? 'cleared')
}

export function withSignupAck(ws: EventDayOfWorkspace, ack: boolean): EventDayOfWorkspace {
  const now = new Date().toISOString()
  return audit({ ...ws, signup_sheet_handoff_ack: ack, updated_at: now }, 'signup_ack', String(ack))
}

export function withDebriefNotes(ws: EventDayOfWorkspace, notes: string): EventDayOfWorkspace {
  const now = new Date().toISOString()
  return audit(
    { ...ws, closure: { ...ws.closure, debrief_notes: notes.slice(0, 4000) }, updated_at: now },
    'debrief_notes',
    `${notes.length} chars`,
  )
}
