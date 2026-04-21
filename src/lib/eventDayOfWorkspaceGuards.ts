/**
 * Defensive parsing for locally persisted field / day-of workspaces (localStorage v1).
 */

import type {
  ClosureChecklistItem,
  DayOfPhaseState,
  EventDayOfAuditEntry,
  EventDayOfWorkspace,
  FieldCheckInEntry,
  FieldCheckInStatus,
  FieldIssueCategory,
  FieldIssueEntry,
  FieldIssueSeverity,
  FieldIssueStatus,
  RunOfShowExecutionSegment,
  RunOfShowSegmentStatus,
} from './eventDayOfSchemas'
import { defaultClosureItems } from './eventDayOfClosureDefaults'

const PHASES: ReadonlySet<DayOfPhaseState> = new Set([
  'pre_open',
  'setup',
  'live',
  'winding_down',
  'teardown',
  'debrief_ready',
])

const SEG_STATUS: ReadonlySet<RunOfShowSegmentStatus> = new Set([
  'pending',
  'active',
  'complete',
  'skipped',
  'delayed',
])

const CI_STATUS: ReadonlySet<FieldCheckInStatus> = new Set([
  'expected',
  'checked_in',
  'late',
  'absent',
  'backup_active',
])

const ISSUE_STATUS: ReadonlySet<FieldIssueStatus> = new Set([
  'open',
  'in_progress',
  'resolved',
  'escalated',
])

const ISSUE_CAT: ReadonlySet<FieldIssueCategory> = new Set([
  'staffing',
  'logistics',
  'venue',
  'timing',
  'communications',
  'attendee',
  'weather',
  'asset',
  'media',
  'checkin',
  'escalation',
  'other',
])

const ISSUE_SEV: ReadonlySet<FieldIssueSeverity> = new Set(['low', 'medium', 'high', 'critical'])

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

function dedupeActiveRunOfShow(segments: RunOfShowExecutionSegment[]): RunOfShowExecutionSegment[] {
  let seenActive = false
  return segments.map((s) => {
    if (s.status === 'active') {
      if (seenActive) return { ...s, status: 'pending' as const }
      seenActive = true
    }
    return s
  })
}

function sanitizeSegment(x: unknown, i: number): RunOfShowExecutionSegment | null {
  if (!isRecord(x)) return null
  const id = typeof x.id === 'string' && x.id.trim() ? x.id : `recover-seg-${i}`
  const label = typeof x.label === 'string' ? x.label : 'Segment'
  const offset =
    typeof x.offset_minutes_from_start === 'number' && Number.isFinite(x.offset_minutes_from_start)
      ? x.offset_minutes_from_start
      : 0
  const duration_minutes =
    x.duration_minutes === null || (typeof x.duration_minutes === 'number' && Number.isFinite(x.duration_minutes))
      ? x.duration_minutes
      : null
  const owner_role = typeof x.owner_role === 'string' ? x.owner_role : 'event_lead'
  const status =
    typeof x.status === 'string' && SEG_STATUS.has(x.status as RunOfShowSegmentStatus)
      ? (x.status as RunOfShowSegmentStatus)
      : 'pending'
  const scheduled_start_at = x.scheduled_start_at === null || typeof x.scheduled_start_at === 'string' ? x.scheduled_start_at : null
  const actual_start_at = x.actual_start_at === null || typeof x.actual_start_at === 'string' ? x.actual_start_at : null
  const scheduled_end_at = x.scheduled_end_at === null || typeof x.scheduled_end_at === 'string' ? x.scheduled_end_at : null
  const actual_end_at = x.actual_end_at === null || typeof x.actual_end_at === 'string' ? x.actual_end_at : null
  const delay_minutes =
    x.delay_minutes === null || (typeof x.delay_minutes === 'number' && Number.isFinite(x.delay_minutes))
      ? x.delay_minutes
      : null
  const delay_reason = x.delay_reason === null || typeof x.delay_reason === 'string' ? x.delay_reason : null
  const notes = typeof x.notes === 'string' ? x.notes : ''
  const depends_on_segment_ids = Array.isArray(x.depends_on_segment_ids)
    ? x.depends_on_segment_ids.filter((d): d is string => typeof d === 'string')
    : []

  return {
    id,
    label,
    offset_minutes_from_start: offset,
    duration_minutes,
    owner_role,
    status,
    scheduled_start_at,
    actual_start_at,
    scheduled_end_at,
    actual_end_at,
    delay_minutes,
    delay_reason,
    notes,
    depends_on_segment_ids,
  }
}

function sanitizeCheckIn(x: unknown, i: number): FieldCheckInEntry | null {
  if (!isRecord(x)) return null
  const id = typeof x.id === 'string' && x.id.trim() ? x.id : `recover-ci-${i}`
  const staff_role_slug = typeof x.staff_role_slug === 'string' ? x.staff_role_slug : 'role'
  const label = typeof x.label === 'string' ? x.label : staff_role_slug.replace(/_/g, ' ')
  const assigned_user_id = x.assigned_user_id === null || typeof x.assigned_user_id === 'string' ? x.assigned_user_id : null
  const status =
    typeof x.status === 'string' && CI_STATUS.has(x.status as FieldCheckInStatus)
      ? (x.status as FieldCheckInStatus)
      : 'expected'
  const checked_in_at = x.checked_in_at === null || typeof x.checked_in_at === 'string' ? x.checked_in_at : null
  const note = typeof x.note === 'string' ? x.note : ''
  return { id, staff_role_slug, label, assigned_user_id, status, checked_in_at, note }
}

function sanitizeIssue(x: unknown, i: number): FieldIssueEntry | null {
  if (!isRecord(x)) return null
  const id = typeof x.id === 'string' && x.id.trim() ? x.id : `recover-iss-${i}`
  const category =
    typeof x.category === 'string' && ISSUE_CAT.has(x.category as FieldIssueCategory)
      ? (x.category as FieldIssueCategory)
      : 'other'
  const severity =
    typeof x.severity === 'string' && ISSUE_SEV.has(x.severity as FieldIssueSeverity)
      ? (x.severity as FieldIssueSeverity)
      : 'medium'
  const title = (typeof x.title === 'string' ? x.title : 'Issue').slice(0, 120)
  const detail = (typeof x.detail === 'string' ? x.detail : '').slice(0, 2000)
  const status =
    typeof x.status === 'string' && ISSUE_STATUS.has(x.status as FieldIssueStatus)
      ? (x.status as FieldIssueStatus)
      : 'open'
  const owner_hint = typeof x.owner_hint === 'string' ? x.owner_hint : 'event_lead'
  const created_at = typeof x.created_at === 'string' ? x.created_at : new Date().toISOString()
  const resolved_at = x.resolved_at === null || typeof x.resolved_at === 'string' ? x.resolved_at : null
  const linked_segment_id = x.linked_segment_id === null || typeof x.linked_segment_id === 'string' ? x.linked_segment_id : null
  return {
    id,
    category,
    severity,
    title,
    detail,
    status,
    owner_hint,
    created_at,
    resolved_at,
    linked_segment_id,
  }
}

function sanitizeClosureItem(x: unknown, i: number): ClosureChecklistItem | null {
  if (!isRecord(x)) return null
  const id = typeof x.id === 'string' && x.id.trim() ? x.id : `recover-cl-${i}`
  const label = typeof x.label === 'string' ? x.label : 'Item'
  const done = Boolean(x.done)
  return { id, label, done }
}

function sanitizeAudit(x: unknown): EventDayOfAuditEntry | null {
  if (!isRecord(x)) return null
  const at = typeof x.at === 'string' ? x.at : new Date().toISOString()
  const action = typeof x.action === 'string' ? x.action : 'unknown'
  const detail = (typeof x.detail === 'string' ? x.detail : '').slice(0, 2000)
  return { at, action, detail }
}

/**
 * Returns a safe workspace or null if the blob is unusable.
 */
export function parseEventDayWorkspaceJson(json: string, eventId: string): EventDayOfWorkspace | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  return normalizeLoadedWorkspace(raw, eventId)
}

export function normalizeLoadedWorkspace(raw: unknown, eventId: string): EventDayOfWorkspace | null {
  if (!isRecord(raw) || raw.v !== 1) return null
  if (typeof raw.event_id !== 'string' || raw.event_id !== eventId) return null
  if (typeof raw.updated_at !== 'string') return null

  const phase_override =
    raw.phase_override === null
      ? null
      : typeof raw.phase_override === 'string' && PHASES.has(raw.phase_override as DayOfPhaseState)
        ? (raw.phase_override as DayOfPhaseState)
        : null

  const rawSegs = Array.isArray(raw.segments) ? raw.segments : []
  const segments = dedupeActiveRunOfShow(
    rawSegs.map((s, i) => sanitizeSegment(s, i)).filter((s): s is RunOfShowExecutionSegment => s != null),
  )
  if (segments.length === 0) return null

  const rawCi = Array.isArray(raw.check_ins) ? raw.check_ins : []
  const check_ins = rawCi
    .map((c, i) => sanitizeCheckIn(c, i))
    .filter((c): c is FieldCheckInEntry => c != null)

  const rawIssues = Array.isArray(raw.issues) ? raw.issues : []
  const issues = rawIssues
    .map((it, i) => sanitizeIssue(it, i))
    .filter((it): it is FieldIssueEntry => it != null)

  const closureRaw = isRecord(raw.closure) ? raw.closure : null
  const rawItems = closureRaw && Array.isArray(closureRaw.items) ? closureRaw.items : []
  let closureItems = rawItems
    .map((it, i) => sanitizeClosureItem(it, i))
    .filter((it): it is ClosureChecklistItem => it != null)
  if (closureItems.length === 0) closureItems = defaultClosureItems()

  const debrief_notes =
    closureRaw && typeof closureRaw.debrief_notes === 'string' ? closureRaw.debrief_notes.slice(0, 4000) : ''

  const signup_sheet_handoff_ack = Boolean(raw.signup_sheet_handoff_ack)

  const rawAudit = Array.isArray(raw.audit) ? raw.audit : []
  const audit = rawAudit
    .map((a) => sanitizeAudit(a))
    .filter((a): a is EventDayOfAuditEntry => a != null)
    .slice(-100)

  return {
    v: 1,
    event_id: eventId,
    updated_at: raw.updated_at,
    phase_override,
    segments,
    check_ins,
    issues,
    closure: { items: closureItems, debrief_notes },
    signup_sheet_handoff_ack,
    audit,
  }
}
