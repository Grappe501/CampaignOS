/**
 * Field execution + onsite operations — domain types (localStorage v1 until Supabase).
 */

export type DayOfPhaseState =
  | 'pre_open'
  | 'setup'
  | 'live'
  | 'winding_down'
  | 'teardown'
  | 'debrief_ready'

export type RunOfShowSegmentStatus = 'pending' | 'active' | 'complete' | 'skipped' | 'delayed'

export type RunOfShowExecutionSegment = {
  id: string
  label: string
  /** Minutes from scheduled event start (can be negative for pre-show). */
  offset_minutes_from_start: number
  duration_minutes: number | null
  owner_role: string
  status: RunOfShowSegmentStatus
  scheduled_start_at: string | null
  actual_start_at: string | null
  scheduled_end_at: string | null
  actual_end_at: string | null
  delay_minutes: number | null
  delay_reason: string | null
  notes: string
  depends_on_segment_ids: string[]
}

export type FieldCheckInStatus = 'expected' | 'checked_in' | 'late' | 'absent' | 'backup_active'

export type FieldCheckInEntry = {
  id: string
  staff_role_slug: string
  label: string
  assigned_user_id: string | null
  status: FieldCheckInStatus
  checked_in_at: string | null
  note: string
}

export type FieldIssueCategory =
  | 'staffing'
  | 'logistics'
  | 'venue'
  | 'timing'
  | 'communications'
  | 'attendee'
  | 'weather'
  | 'asset'
  | 'media'
  | 'checkin'
  | 'escalation'
  | 'other'

export type FieldIssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type FieldIssueStatus = 'open' | 'in_progress' | 'resolved' | 'escalated'

export type FieldIssueEntry = {
  id: string
  category: FieldIssueCategory
  severity: FieldIssueSeverity
  title: string
  detail: string
  status: FieldIssueStatus
  owner_hint: string
  created_at: string
  resolved_at: string | null
  linked_segment_id: string | null
}

export type ClosureChecklistItem = {
  id: string
  label: string
  done: boolean
}

export type EventDayOfAuditEntry = { at: string; action: string; detail: string }

export type EventDayOfWorkspace = {
  v: 1
  event_id: string
  updated_at: string
  /** Operator override; null = use derived phase from clock. */
  phase_override: DayOfPhaseState | null
  segments: RunOfShowExecutionSegment[]
  check_ins: FieldCheckInEntry[]
  issues: FieldIssueEntry[]
  closure: {
    items: ClosureChecklistItem[]
    debrief_notes: string
  }
  signup_sheet_handoff_ack: boolean
  audit: EventDayOfAuditEntry[]
}
