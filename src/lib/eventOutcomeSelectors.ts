/**
 * Pure selectors: merge calendar record + DB outcome snapshot for UI lanes.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  buildOutcomeCaptureLanes,
  isPastEvent,
  type OutcomeCaptureLane,
  type OutcomeCaptureStatus,
} from './eventPostEventWorkflow'
import type { CampaignEventOutcomeRow } from './eventOutcomeDomain'

export type EventOutcomeSnapshotInput = {
  outcomeRow: CampaignEventOutcomeRow | null
  attendanceCheckinCount: number
  followups: readonly { status: string }[]
  learningCaptureFilled: boolean
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

function laneStatusFromPredicate(
  applies: boolean,
  captured: boolean,
  partial: boolean,
): OutcomeCaptureStatus {
  if (!applies) return 'not_applicable'
  if (captured) return 'captured'
  if (partial) return 'partial'
  return 'pending_capture'
}

/**
 * Same lanes as `buildOutcomeCaptureLanes`, but upgrades status/detail from Supabase-backed facts.
 */
export function buildOutcomeCaptureLanesWithDb(
  record: CampaignCalendarEventRecord,
  db: EventOutcomeSnapshotInput | null,
  nowMs: number,
): OutcomeCaptureLane[] {
  const base = buildOutcomeCaptureLanes(record)
  if (!db) return base

  const ended = isPastEvent(record, nowMs)
  const o = db.outcomeRow
  const checkins = Math.max(0, db.attendanceCheckinCount)
  const expected = record.expected_audience_size ?? null
  const actualOnRow = record.actual_audience_size

  const attendanceCaptured =
    ended &&
    (checkins > 0 ||
      (o?.attendance_count != null && o.attendance_count > 0) ||
      (actualOnRow != null && actualOnRow > 0))

  const attendancePartial =
    ended &&
    !attendanceCaptured &&
    (expected != null || (o?.conversation_summary?.trim().length ?? 0) > 0)

  const leadsCaptured =
    (o?.lead_count != null && o.lead_count > 0) ||
    (o?.supporter_followup_count != null && o.supporter_followup_count > 0) ||
    (record.voter_contact_outcome != null && record.voter_contact_outcome > 0)

  const volCaptured =
    (o?.volunteer_signup_count != null && o.volunteer_signup_count > 0) ||
    (record.volunteer_outcome != null && record.volunteer_outcome > 0) ||
    (o?.volunteer_assignments_created != null && o.volunteer_assignments_created > 0)

  const donorCaptured =
    (o?.donor_followup_count != null && o.donor_followup_count > 0) ||
    (o?.pledges_or_donations_count != null && o.pledges_or_donations_count > 0)

  const mediaCaptured = o?.media_handoff_needed === false || (o?.debrief_notes?.includes('media') ?? false)

  const debriefText = (o?.debrief_notes ?? '').trim() || (record.notes ?? '').trim()
  const learningFilled = db.learningCaptureFilled || debriefText.length > 0

  const publicish = visibilityIsPublicish(record)
  const finance = record.finance_flag
  const volLaneApplies =
    record.visibility_scope === 'volunteer_visible' || record.event_type.includes('fair')
  const mediaApplies = record.candidate_flag && record.visibility_scope === 'public_visible'

  const detailFor = (id: OutcomeCaptureLane['id'], fallback: string): string => {
    switch (id) {
      case 'rsvp_headcount':
        if (expected != null) return `Expected audience on file: ${expected}.`
        return fallback
      case 'attendance_actual':
        if (checkins > 0) return `Check-ins recorded: ${checkins}.`
        if (o?.attendance_count != null && o.attendance_count > 0)
          return `Attendance on outcome row: ${o.attendance_count}.`
        if (actualOnRow != null) return `Actual audience on event: ${actualOnRow}.`
        return fallback
      case 'leads_signups':
        if (leadsCaptured) return 'Lead / supporter counts captured in outcomes or voter contact outcome.'
        return fallback
      case 'volunteer_conversions':
        if (volCaptured) return 'Volunteer signups or assignments recorded.'
        return fallback
      case 'donor_results':
        if (donorCaptured) return 'Donor / pledge follow-ups captured.'
        return fallback
      case 'media_assets':
        if (o?.media_handoff_needed === true) return 'Media handoff still flagged — close when assets routed.'
        if (mediaCaptured && mediaApplies) return 'Media handoff cleared or noted in debrief.'
        return fallback
      case 'debrief':
        if (learningFilled) return 'Structured learning or debrief text on file.'
        return fallback
      default:
        return fallback
    }
  }

  return base.map((lane) => {
    switch (lane.id) {
      case 'rsvp_headcount':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            publicish,
            expected != null,
            expected != null && ended && !attendanceCaptured,
          ),
          detail: detailFor('rsvp_headcount', lane.detail),
        }
      case 'attendance_actual':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            publicish,
            Boolean(attendanceCaptured),
            Boolean(attendancePartial),
          ),
          detail: detailFor('attendance_actual', lane.detail),
        }
      case 'leads_signups':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            publicish || finance,
            leadsCaptured,
            ended && publicish && !leadsCaptured && checkins > 0,
          ),
          detail: detailFor('leads_signups', lane.detail),
        }
      case 'volunteer_conversions':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            volLaneApplies,
            volCaptured,
            ended && volLaneApplies && !volCaptured && checkins > 0,
          ),
          detail: detailFor('volunteer_conversions', lane.detail),
        }
      case 'donor_results':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            finance,
            donorCaptured,
            ended && finance && !donorCaptured,
          ),
          detail: detailFor('donor_results', lane.detail),
        }
      case 'media_assets':
        return {
          ...lane,
          status: laneStatusFromPredicate(
            mediaApplies,
            mediaCaptured && mediaApplies,
            mediaApplies && o?.media_handoff_needed === true,
          ),
          detail: detailFor('media_assets', lane.detail),
        }
      case 'debrief': {
        if (!ended) {
          return { ...lane, status: 'not_applicable' as const, detail: detailFor('debrief', lane.detail) }
        }
        if (learningFilled && (o?.conversation_summary?.trim().length ?? 0) > 0) {
          return { ...lane, status: 'partial' as const, detail: detailFor('debrief', lane.detail) }
        }
        if (learningFilled) {
          return { ...lane, status: 'captured' as const, detail: detailFor('debrief', lane.detail) }
        }
        if (debriefText.length > 0) {
          return { ...lane, status: 'partial' as const, detail: detailFor('debrief', lane.detail) }
        }
        return {
          ...lane,
          status: 'pending_capture' as const,
          detail: detailFor('debrief', lane.detail),
        }
      }
      default:
        return lane
    }
  })
}

export function summarizeFollowUpQueue(
  followups: readonly { status: string; due_at?: string | null }[],
): {
  total: number
  open: number
  overdueHint: boolean
} {
  const total = followups.length
  const open = followups.filter((f) => f.status === 'pending' || f.status === 'in_progress').length
  const now = Date.now()
  const overdueHint = followups.some((f) => {
    if (f.status === 'complete' || f.status === 'canceled') return false
    const t = f.due_at ? new Date(f.due_at).getTime() : NaN
    return Number.isFinite(t) && t < now
  })
  return { total, open, overdueHint }
}
