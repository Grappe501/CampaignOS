/**
 * Aggregates and effectiveness metrics over event outcome rollups (pure).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  computeEventOutcomeHealth,
  deriveEffectivenessHints,
  type CampaignEventOutcomeRow,
} from './eventOutcomeDomain'
import { isPastEvent } from './eventPostEventWorkflow'

export type EventOutcomeRollupRow = {
  event_id: string
  event_type: string
  county_id: string | null
  attendance_checkin_count: number
  followups_open: number
  followups_total: number
  volunteer_outcome: number | null
  voter_contact_outcome: number | null
  expected_audience_size: number | null
  outcome_stage: string | null
  has_learning_capture: boolean
}

export type EventYieldByKey = {
  key: string
  eventCount: number
  avgAttendance: number
  avgVolunteerOutcome: number
  avgFollowupOpen: number
}

function safeNum(n: unknown): number {
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}

export function buildEventYieldByType(rollups: readonly EventOutcomeRollupRow[]): EventYieldByKey[] {
  const buckets = new Map<string, { n: number; att: number; vol: number; fu: number }>()
  for (const r of rollups) {
    const cur = buckets.get(r.event_type) ?? { n: 0, att: 0, vol: 0, fu: 0 }
    cur.n += 1
    cur.att += safeNum(r.attendance_checkin_count)
    cur.vol += safeNum(r.volunteer_outcome)
    cur.fu += safeNum(r.followups_open)
    buckets.set(r.event_type, cur)
  }
  return [...buckets.entries()]
    .map(([key, v]) => ({
      key,
      eventCount: v.n,
      avgAttendance: v.n ? Math.round(v.att / v.n) : 0,
      avgVolunteerOutcome: v.n ? Math.round((v.vol / v.n) * 10) / 10 : 0,
      avgFollowupOpen: v.n ? Math.round((v.fu / v.n) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.avgAttendance - a.avgAttendance)
}

export function buildEventYieldByCounty(rollups: readonly EventOutcomeRollupRow[]): EventYieldByKey[] {
  const buckets = new Map<string, { n: number; att: number; vol: number; fu: number }>()
  for (const r of rollups) {
    const key = r.county_id ?? 'unspecified'
    const cur = buckets.get(key) ?? { n: 0, att: 0, vol: 0, fu: 0 }
    cur.n += 1
    cur.att += safeNum(r.attendance_checkin_count)
    cur.vol += safeNum(r.volunteer_outcome)
    cur.fu += safeNum(r.followups_open)
    buckets.set(key, cur)
  }
  return [...buckets.entries()]
    .map(([key, v]) => ({
      key,
      eventCount: v.n,
      avgAttendance: v.n ? Math.round(v.att / v.n) : 0,
      avgVolunteerOutcome: v.n ? Math.round((v.vol / v.n) * 10) / 10 : 0,
      avgFollowupOpen: v.n ? Math.round((v.fu / v.n) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.avgAttendance - a.avgAttendance)
}

/** Honest contact / cohort hooks from calendar record only (no CRM attribution claims). */
export function contactOutcomeHookSummary(record: CampaignCalendarEventRecord): {
  contact_outcome_on_record: number | null
  has_numeric_hook: boolean
  note: string
} {
  const v = record.voter_contact_outcome
  return {
    contact_outcome_on_record: v ?? null,
    has_numeric_hook: v != null && v > 0,
    note:
      'Contact and cohort attribution use campaign event outcomes and voter_contact_outcome; perfect CRM match is not implied.',
  }
}

export type AgentJonesEventOutcomeLoopSnapshot = {
  outcome_stage: string | null
  attendance_checkins: number
  followups_open: number
  followups_total: number
  closure_completeness_pct: number
  effectiveness_hints: string[]
}

export function buildAgentJonesEventOutcomeLoopSnapshot(input: {
  record: CampaignCalendarEventRecord
  outcomeRow: CampaignEventOutcomeRow | null
  attendanceCheckinCount: number
  volunteerInterestFromCheckin: number
  followups: readonly { status: string }[]
  learningCaptureFilled: boolean
  nowMs: number
}): AgentJonesEventOutcomeLoopSnapshot {
  const ended = isPastEvent(input.record, input.nowMs)
  const fuOpen = input.followups.filter((f) => f.status === 'pending' || f.status === 'in_progress')
    .length
  const fuTotal = input.followups.length

  const health = computeEventOutcomeHealth({
    recordExpectedAudience: input.record.expected_audience_size ?? null,
    attendanceCheckins: input.attendanceCheckinCount,
    outcomeRow: input.outcomeRow,
    followupsTotal: fuTotal,
    followupsOpen: fuOpen,
    learningCaptureFilled: input.learningCaptureFilled,
    eventEnded: ended,
  })

  const hints = deriveEffectivenessHints({
    health,
    attendanceCheckins: input.attendanceCheckinCount,
    volunteerLeadsFromCheckin: input.volunteerInterestFromCheckin,
    followupsOpen: fuOpen,
    followupsTotal: fuTotal,
    conversationCount: input.outcomeRow?.conversation_count ?? null,
    volunteerOutcomeOnRecord: input.record.volunteer_outcome ?? null,
  })

  return {
    outcome_stage: input.outcomeRow?.outcome_stage ?? null,
    attendance_checkins: Math.max(0, Math.min(5000, input.attendanceCheckinCount)),
    followups_open: Math.max(0, Math.min(500, fuOpen)),
    followups_total: Math.max(0, Math.min(500, fuTotal)),
    closure_completeness_pct: health.completeness_0_100,
    effectiveness_hints: hints.slice(0, 6),
  }
}
