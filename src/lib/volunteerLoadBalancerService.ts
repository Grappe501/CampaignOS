/**
 * Aggregate volunteer load from event staffing rows across events (advisory, not blocking).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { eventParticipatesInStaffingCoverage } from './staffingCoverageHeatmapService'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { getStaffingMatrixForEventType, isCampaignEventTypeKey } from './eventStaffingMatrix'
import type { VolunteerLoadProfile, VolunteerLoadState } from './volunteerLoadModels'

const MS_DAY = 86_400_000

function stateFromScore(score: number, active: number): VolunteerLoadState {
  if (active === 0) return 'inactive_but_available'
  if (score >= 92) return 'burnout_risk'
  if (score >= 78) return 'overloaded'
  if (score >= 58) return 'elevated_load'
  if (score >= 28) return 'healthy_load'
  return 'available'
}

/** Events where this user has a staffing row — used for overlap detection */
export function findOverlappingEventIdsForUser(
  userId: string,
  events: readonly CampaignCalendarEventRecord[],
  assignmentMap: Map<string, StaffingAssignmentLike[]>,
): string[] {
  const relevant = events.filter((e) =>
    (assignmentMap.get(e.event_id) ?? []).some((a) => String(a.assigned_user_id ?? '') === userId),
  )
  const conflict = new Set<string>()
  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const a = relevant[i]!
      const b = relevant[j]!
      const as = new Date(a.start_at).getTime()
      const ae = new Date(a.end_at ?? a.start_at).getTime()
      const bs = new Date(b.start_at).getTime()
      const be = new Date(b.end_at ?? b.start_at).getTime()
      if (Number.isNaN(as) || Number.isNaN(bs)) continue
      if (as < be && ae > bs) {
        conflict.add(a.event_id)
        conflict.add(b.event_id)
      }
    }
  }
  return [...conflict]
}

function criticalRolesForUserOnEvent(
  eventType: string,
  assignments: readonly StaffingAssignmentLike[],
  userId: string,
): number {
  if (!isCampaignEventTypeKey(eventType)) return 0
  const criticalSlugs = new Set(
    getStaffingMatrixForEventType(eventType)
      .filter((t) => t.required)
      .map((t) => String(t.slug)),
  )
  let n = 0
  for (const a of assignments) {
    if (String(a.assigned_user_id ?? '') !== userId) continue
    if (!criticalSlugs.has(String(a.staff_role_slug))) continue
    n += 1
  }
  return n
}

export function buildVolunteerLoadMap(
  events: readonly CampaignCalendarEventRecord[],
  assignmentMap: Map<string, StaffingAssignmentLike[]>,
  nowMs: number,
  windowDays: number,
): Map<string, VolunteerLoadProfile> {
  const endWindow = nowMs + windowDays * MS_DAY
  const byUser = new Map<
    string,
    {
      assignments: number
      events: Set<string>
      critical: number
      maxCompression: number
    }
  >()

  for (const ev of events) {
    if (!eventParticipatesInStaffingCoverage(ev)) continue
    const t = new Date(ev.start_at).getTime()
    if (Number.isNaN(t) || t > endWindow || t < nowMs - MS_DAY) continue
    const assigns = assignmentMap.get(ev.event_id) ?? []
    const hoursToStart = (t - nowMs) / 3_600_000
    const compression = hoursToStart > 0 && hoursToStart < 72 ? (72 - hoursToStart) / 72 : 0
    const uids = new Set<string>()
    for (const a of assigns) {
      const uid = a.assigned_user_id
      if (uid) uids.add(String(uid))
    }
    for (const uid of uids) {
      const slot = byUser.get(uid) ?? { assignments: 0, events: new Set<string>(), critical: 0, maxCompression: 0 }
      slot.assignments += assigns.filter((x) => String(x.assigned_user_id) === uid).length
      slot.events.add(ev.event_id)
      slot.critical += criticalRolesForUserOnEvent(ev.event_type, assigns, uid)
      slot.maxCompression = Math.max(slot.maxCompression, compression)
      byUser.set(uid, slot)
    }
  }

  const out = new Map<string, VolunteerLoadProfile>()
  for (const [uid, s] of byUser) {
    const upcoming = s.events.size
    const score = Math.min(
      100,
      Math.round(
        s.assignments * 9 +
          upcoming * 11 +
          s.critical * 14 +
          s.maxCompression * 22 +
          Math.max(0, s.assignments - 6) * 5,
      ),
    )
    const overlaps = findOverlappingEventIdsForUser(uid, events, assignmentMap)
    let state: VolunteerLoadState = stateFromScore(score, s.assignments)
    if (overlaps.length >= 2) state = 'conflict_blocked'
    else if (state === 'available' && s.assignments >= 1 && score < 22 && upcoming <= 2) {
      state = 'underutilized_but_qualified'
    }
    out.set(uid, {
      user_id: uid,
      display_hint: null,
      load_score: score,
      state,
      active_assignments: s.assignments,
      upcoming_events: upcoming,
      critical_roles_held: s.critical,
      hours_pressure: Math.round(s.maxCompression * 36) / 10,
      details:
        overlaps.length >= 2
          ? `Overlap risk across ${overlaps.length} event(s) · ${s.assignments} staffing row(s)`
          : `${s.assignments} staffing row(s) · ${upcoming} event(s) in window · ${s.critical} critical role row(s)`,
    })
  }
  return out
}

/** Suggest volunteers with lowest load in-window (advisory — same campaign assignments only). */
export function suggestLowerLoadAlternatives(
  excludeUserId: string | null | undefined,
  loadMap: Map<string, VolunteerLoadProfile>,
  limit = 4,
): VolunteerLoadProfile[] {
  return [...loadMap.values()]
    .filter((p) => (excludeUserId ? p.user_id !== excludeUserId : true))
    .filter((p) => p.state !== 'conflict_blocked')
    .sort((a, b) => a.load_score - b.load_score)
    .slice(0, limit)
}

export function findOverloadedVolunteers(loadMap: Map<string, VolunteerLoadProfile>): VolunteerLoadProfile[] {
  return [...loadMap.values()].filter((p) => p.state === 'overloaded' || p.state === 'burnout_risk')
}
