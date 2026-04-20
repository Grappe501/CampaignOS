/**
 * Post-event outcomes & follow-up workflow (pure layer).
 * Aligns with `campaign_events.followup_state`, future `campaign_event_outcomes`, and coordinator gaps.
 * No fabricated counts — unknown metrics stay explicitly pending until Supabase backs them.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

function eventEndedAtLocal(e: CampaignCalendarEventRecord, nowMs: number): boolean {
  const t = new Date(e.end_at ?? e.start_at).getTime()
  return !Number.isNaN(t) && t < nowMs
}

/** Values compatible with DB CHECK on `campaign_events.followup_state`. */
export const CANONICAL_FOLLOWUP_STATES = [
  'none',
  'pending',
  'in_progress',
  'complete',
  'overdue',
] as const

export type CanonicalFollowupState = (typeof CANONICAL_FOLLOWUP_STATES)[number]

/** Workstream buckets for coordinator UX (extensible). */
export type EventFollowupBucketId =
  | 'attendance_reconciliation'
  | 'donor_pipeline'
  | 'volunteer_recruitment_followup'
  | 'supporter_attendee_followup'
  | 'media_comms_handoff'
  | 'debrief_internal'

export type FollowupBucketStatus = 'not_applicable' | 'open' | 'in_progress' | 'done' | 'blocked'

export type FollowupBucketChecklistItem = {
  id: EventFollowupBucketId
  label: string
  description: string
  applies: boolean
  status: FollowupBucketStatus
  hint?: string
}

export type OutcomeCaptureLaneId =
  | 'rsvp_headcount'
  | 'attendance_actual'
  | 'leads_signups'
  | 'volunteer_conversions'
  | 'donor_results'
  | 'media_assets'
  | 'debrief'

export type OutcomeCaptureStatus = 'not_applicable' | 'pending_capture' | 'partial' | 'captured'

export type OutcomeCaptureLane = {
  id: OutcomeCaptureLaneId
  label: string
  status: OutcomeCaptureStatus
  detail: string
}

const POST_EVENT_FOLLOWUP_GRACE_MS = 72 * 3_600_000

export function parseFollowupStateRaw(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase()
}

/**
 * Map row string to a coarse phase for UI (supports compound strings e.g. "donor_pending").
 */
export function normalizeFollowupPhase(raw: string | null | undefined):
  | 'none'
  | 'pending'
  | 'in_progress'
  | 'complete'
  | 'overdue' {
  const s = parseFollowupStateRaw(raw)
  if (!s || s === 'none') return 'none'
  if (s === 'overdue' || s.includes('overdue')) return 'overdue'
  if (s === 'complete' || s.includes('complete')) return 'complete'
  if (s.includes('progress') || s === 'in_progress') return 'in_progress'
  return 'pending'
}

export function eventEndMs(record: CampaignCalendarEventRecord): number {
  return new Date(record.end_at ?? record.start_at).getTime()
}

export function isPastEvent(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  return eventEndedAtLocal(record, nowMs)
}

export function isFollowupOverdue(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  if (!isPastEvent(record, nowMs)) return false
  const phase = normalizeFollowupPhase(record.followup_state)
  if (phase === 'complete') return false
  const end = eventEndMs(record)
  if (Number.isNaN(end)) return false
  return nowMs > end + POST_EVENT_FOLLOWUP_GRACE_MS
}

export function isFollowUpCloseReady(record: CampaignCalendarEventRecord, nowMs: number): boolean {
  if (!isPastEvent(record, nowMs)) return false
  return normalizeFollowupPhase(record.followup_state) === 'complete'
}

function visibilityIsPublicish(record: CampaignCalendarEventRecord): boolean {
  const v = String(record.visibility_scope)
  return (
    v === 'public_visible' ||
    v === 'volunteer_visible' ||
    v === 'field_team' ||
    v === 'county_specific' ||
    v === 'precinct_specific'
  )
}

export function buildFollowupBucketChecklist(
  record: CampaignCalendarEventRecord,
  nowMs: number,
): FollowupBucketChecklistItem[] {
  const phase = normalizeFollowupPhase(record.followup_state)
  const ended = isPastEvent(record, nowMs)
  const fu = parseFollowupStateRaw(record.followup_state)
  const phaseComplete = phase === 'complete'

  const bucketStatus = (
    applies: boolean,
    donePredicate: boolean,
  ): FollowupBucketStatus => {
    if (!applies) return 'not_applicable'
    if (phaseComplete || donePredicate) return 'done'
    if (phase === 'in_progress') return 'in_progress'
    if (!ended) return 'not_applicable'
    return 'open'
  }

  const attendanceApplies = ended && visibilityIsPublicish(record)
  const donorApplies = ended && record.finance_flag
  const volunteerApplies =
    ended &&
    (record.visibility_scope === 'volunteer_visible' || record.event_type.includes('fair'))
  const supporterApplies =
    ended && (visibilityIsPublicish(record) || record.event_type.includes('house_party'))
  const mediaApplies = ended && record.candidate_flag && record.visibility_scope === 'public_visible'
  const debriefApplies = ended

  return [
    {
      id: 'attendance_reconciliation',
      label: 'Attendance reconciliation',
      description: 'Actuals vs RSVP / check-in data when the event is public or field-visible.',
      applies: attendanceApplies,
      status: bucketStatus(
        attendanceApplies,
        fu.includes('attendance') || fu.includes('reconcil'),
      ),
      hint: attendanceApplies ? 'Close the loop on who attended.' : undefined,
    },
    {
      id: 'donor_pipeline',
      label: 'Donor / finance follow-up',
      description: 'Touches that need finance workflow after the event.',
      applies: donorApplies,
      status: bucketStatus(
        donorApplies,
        record.finance_flag && (fu.includes('donor') || fu.includes('finance')),
      ),
      hint: donorApplies ? 'Thank-yous, pledges, and CRM updates.' : undefined,
    },
    {
      id: 'volunteer_recruitment_followup',
      label: 'Volunteer recruitment follow-up',
      description: 'Signups and shifts promised during the event.',
      applies: volunteerApplies,
      status: bucketStatus(volunteerApplies, fu.includes('volunteer')),
    },
    {
      id: 'supporter_attendee_followup',
      label: 'Supporter & attendee follow-up',
      description: 'General thank-yous and next-step asks for attendees.',
      applies: supporterApplies,
      status: bucketStatus(
        supporterApplies,
        fu.includes('supporter') || fu.includes('attendee'),
      ),
    },
    {
      id: 'media_comms_handoff',
      label: 'Media & comms handoff',
      description: 'Photos, quotes, and press follow-through for high-visibility events.',
      applies: mediaApplies,
      status: bucketStatus(mediaApplies, fu.includes('media') || fu.includes('comms')),
    },
    {
      id: 'debrief_internal',
      label: 'Internal debrief',
      description: 'Coordinator notes and lessons learned (`notes` until outcomes table is wired).',
      applies: debriefApplies,
      status: bucketStatus(debriefApplies, (record.notes ?? '').trim().length > 0),
    },
  ]
}

export function buildOutcomeCaptureLanes(record: CampaignCalendarEventRecord | null): OutcomeCaptureLane[] {
  if (!record) {
    return []
  }

  const finance = record.finance_flag
  const publicish = visibilityIsPublicish(record)
  const notes = (record.notes ?? '').trim()
  const debriefStatus: OutcomeCaptureStatus =
    notes.length > 0 ? 'partial' : 'pending_capture'

  const lane = (
    id: OutcomeCaptureLaneId,
    label: string,
    applies: boolean,
    partialPredicate: boolean,
  ): OutcomeCaptureLane => ({
    id,
    label,
    status: !applies
      ? 'not_applicable'
      : partialPredicate
        ? 'partial'
        : 'pending_capture',
    detail: !applies
      ? 'Not applicable for this event profile.'
      : partialPredicate
        ? 'Partial data on file — full capture lives in `campaign_event_outcomes` when connected.'
        : 'Awaiting capture in outcomes record (no placeholder numbers shown).',
  })

  return [
    lane('rsvp_headcount', 'RSVP / expected headcount', publicish, false),
    lane('attendance_actual', 'Attendance actuals', publicish, false),
    lane('leads_signups', 'Leads & supporter signups', publicish || finance, false),
    lane(
      'volunteer_conversions',
      'Volunteer signups / commitments',
      record.visibility_scope === 'volunteer_visible' || record.event_type.includes('fair'),
      false,
    ),
    lane('donor_results', 'Donor / fundraising outcomes', finance, false),
    lane(
      'media_assets',
      'Media kit / content handoff',
      record.candidate_flag && record.visibility_scope === 'public_visible',
      false,
    ),
    {
      id: 'debrief',
      label: 'Field notes & debrief',
      status: debriefStatus,
      detail:
        notes.length > 0
          ? 'Internal notes present on event row — migrate to structured debrief when outcomes API is live.'
          : 'Add debrief notes or connect outcomes table for structured debrief.',
    },
  ]
}

export type PostEventAttentionRow = {
  eventId: string
  title: string
  endAtLabel: string
  reasons: string[]
  severity: 'warning' | 'critical'
}

export function buildPostEventAttentionQueue(
  pool: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  limit = 20,
): PostEventAttentionRow[] {
  const rows: PostEventAttentionRow[] = []

  for (const e of pool) {
    if (!isPastEvent(e, nowMs)) continue
    const phase = normalizeFollowupPhase(e.followup_state)
    if (phase === 'complete') continue

    const reasons: string[] = []
    let severity: 'warning' | 'critical' = 'warning'

    if (!parseFollowupStateRaw(e.followup_state)) {
      reasons.push('No follow-up state set after event end.')
    } else if (phase === 'pending' || phase === 'none') {
      reasons.push(`Follow-up phase: ${phase === 'none' ? 'none' : 'pending'}.`)
    } else if (phase === 'in_progress') {
      reasons.push('Follow-up in progress — confirm owners complete all buckets.')
    } else if (phase === 'overdue') {
      reasons.push('Follow-up marked overdue.')
      severity = 'critical'
    }

    if (isFollowupOverdue(e, nowMs) && phase !== 'overdue') {
      reasons.push('Past 72h grace — treat as overdue for coordinator queue.')
      severity = 'critical'
    }

    if (e.finance_flag && !parseFollowupStateRaw(e.followup_state).includes('donor')) {
      reasons.push('Finance-touch event: confirm donor pipeline follow-up is tracked.')
    }

    if (reasons.length === 0) continue

    const end = eventEndMs(e)
    rows.push({
      eventId: e.event_id,
      title: e.title,
      endAtLabel: Number.isNaN(end)
        ? '—'
        : new Date(end).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
      reasons,
      severity,
    })
  }

  const endById = new Map(pool.map((e) => [e.event_id, eventEndMs(e)]))
  rows.sort((a, b) => (endById.get(b.eventId) ?? 0) - (endById.get(a.eventId) ?? 0))

  return rows.slice(0, limit)
}
