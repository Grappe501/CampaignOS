/**
 * Coverage metrics derived from staffing matrix + assignments (single source of truth).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { eventIsPendingVolunteerRequest } from './eventSubmissionApproval'
import {
  evaluateStaffingMatrix,
  getStaffingMatrixForEventType,
  isCampaignEventTypeKey,
  type StaffingAssignmentLike,
} from './eventStaffingMatrix'
import type {
  StaffingCoverageBucket,
  StaffingCoverageFiltersState,
  StaffingCoverageMetrics,
  StaffingCoverageWindowId,
} from './staffingCoverageModels'

const FILLED = new Set(['confirmed', 'completed'])

export function eventParticipatesInStaffingCoverage(event: CampaignCalendarEventRecord): boolean {
  if (eventIsPendingVolunteerRequest(event)) return false
  const st = String(event.stage_status ?? '').toLowerCase()
  if (st === 'canceled' || st === 'cancelled' || st === 'archived') return false
  return true
}

export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function windowBounds(
  window: StaffingCoverageWindowId,
  nowMs: number,
  custom?: { startMs: number; endMs: number },
): { startMs: number; endMs: number } {
  const now = nowMs
  const day = 24 * 60 * 60 * 1000
  if (window === 'custom' && custom) return custom
  if (window === 'today') {
    const s = new Date(now)
    s.setHours(0, 0, 0, 0)
    const e = s.getTime() + day
    return { startMs: s.getTime(), endMs: e }
  }
  if (window === 'next_72h') return { startMs: now, endMs: now + 3 * day }
  if (window === 'next_7d') return { startMs: now, endMs: now + 7 * day }
  if (window === 'next_14d') return { startMs: now, endMs: now + 14 * day }
  return { startMs: now, endMs: now + 7 * day }
}

export function filterEventsForCoverageWindow(
  events: readonly CampaignCalendarEventRecord[],
  window: StaffingCoverageWindowId,
  nowMs: number,
): CampaignCalendarEventRecord[] {
  const { startMs, endMs } = windowBounds(window, nowMs)
  return events.filter((e) => {
    if (!eventParticipatesInStaffingCoverage(e)) return false
    const t = new Date(e.start_at).getTime()
    return !Number.isNaN(t) && t >= startMs && t <= endMs
  })
}

function confirmedAssignments(assignments: readonly StaffingAssignmentLike[]): number {
  return assignments.filter((a) => FILLED.has(String(a.status).toLowerCase())).length
}

export function computeEventCoverageMetrics(
  event: CampaignCalendarEventRecord,
  assignments: readonly StaffingAssignmentLike[],
): StaffingCoverageMetrics | null {
  if (!isCampaignEventTypeKey(event.event_type)) return null
  const pending = eventIsPendingVolunteerRequest(event)
  const matrix = getStaffingMatrixForEventType(event.event_type)
  const evaluated = evaluateStaffingMatrix(event.event_type, assignments)
  const required = evaluated.filter((s) => s.template.required)
  let metRequired = 0
  const missingCritical: string[] = []
  for (const ev of required) {
    if (ev.satisfied) metRequired += 1
    else missingCritical.push(ev.template.slug)
  }
  const criticalPct = required.length ? metRequired / required.length : 1

  const totalSlots = matrix.reduce((s, m) => s + m.minFilled, 0)
  let filledSlots = 0
  for (const m of matrix) {
    const ev = evaluated.find((x) => x.template.slug === m.slug)
    const c = Math.min(ev?.filled ?? 0, m.minFilled)
    filledSlots += c
  }
  const assignPct = totalSlots ? filledSlots / totalSlots : 1

  const shiftRows = assignments.filter((a) => (a.shift_label ?? '').trim().length > 0)
  const shiftFill =
    shiftRows.length > 0 ? shiftRows.filter((a) => FILLED.has(String(a.status).toLowerCase())).length / shiftRows.length : null

  const backupScore =
    assignments.filter((a) => String(a.assigned_display_name ?? '').toLowerCase().includes('backup')).length > 0
      ? 0.85
      : 0.35

  const invited = assignments.filter((a) => String(a.status).toLowerCase() === 'invited').length
  const denom = Math.max(1, assignments.length)
  const confirmationRate = (denom - invited) / denom

  const anyMissingSlugs = evaluated.filter((x) => !x.satisfied).map((x) => x.template.slug)

  let risk = 0
  risk += (1 - criticalPct) * 55
  risk += (1 - assignPct) * 25
  risk += (1 - confirmationRate) * 12
  if (missingCritical.length) risk += 15
  risk = Math.min(100, Math.round(risk))

  let bucket: StaffingCoverageBucket = 'fully_covered'
  if (pending) bucket = 'blocked_pending_approval'
  else if (missingCritical.length) bucket = 'critical_gap'
  else if (anyMissingSlugs.length) bucket = 'partial'
  else if (evaluated.some((s) => s.filled > s.template.minFilled + 3)) bucket = 'overstaffed'

  return {
    event_id: event.event_id,
    operational_gate: pending ? 'pending_approval' : 'live',
    coverage_percentage: Math.round(assignPct * 1000) / 10,
    critical_role_coverage_percentage: Math.round(criticalPct * 1000) / 10,
    shift_fill_percentage: shiftFill != null ? Math.round(shiftFill * 1000) / 10 : null,
    assignment_fill_percentage: Math.round(assignPct * 1000) / 10,
    backup_coverage_score: Math.round(backupScore * 1000) / 10,
    volunteer_confirmation_rate: Math.round(confirmationRate * 1000) / 10,
    staffing_risk_score: risk,
    bucket,
    missing_critical_slugs: missingCritical,
    missing_any_slugs: anyMissingSlugs,
  }
}

export function applyStaffingCoverageFilters(
  events: readonly CampaignCalendarEventRecord[],
  f: StaffingCoverageFiltersState,
): CampaignCalendarEventRecord[] {
  return events.filter((e) => {
    if (f.eventType && e.event_type !== f.eventType) return false
    if (f.countyId && String(e.county_id ?? '') !== f.countyId) return false
    if (f.organizerQuery.trim()) {
      const q = f.organizerQuery.trim().toLowerCase()
      const owner = String(e.owner_user_id ?? '').toLowerCase()
      const role = String(e.owner_role ?? '').toLowerCase()
      if (!owner.includes(q) && !role.includes(q)) return false
    }
    return true
  })
}

export function buildStaffingHeatmapByDay(
  events: readonly CampaignCalendarEventRecord[],
  assignmentMap: Map<string, StaffingAssignmentLike[]>,
): Map<string, StaffingHeatmapCell> {
  const map = new Map<string, StaffingHeatmapCell>()
  for (const e of events) {
    if (!eventParticipatesInStaffingCoverage(e)) continue
    const metrics = computeEventCoverageMetrics(e, assignmentMap.get(e.event_id) ?? [])
    if (!metrics) continue
    const dayKey = localDayKey(e.start_at)
    const prev = map.get(dayKey)
    const cov = metrics.coverage_percentage
    const risk = metrics.staffing_risk_score
    if (!prev) {
      map.set(dayKey, {
        dayKey,
        agg_coverage: cov,
        agg_risk: risk,
        eventCount: 1,
        criticalGapCount: metrics.bucket === 'critical_gap' ? 1 : 0,
        atRiskCount: metrics.bucket === 'critical_gap' || metrics.bucket === 'partial' ? 1 : 0,
      })
    } else {
      prev.agg_coverage += cov
      prev.agg_risk += risk
      prev.eventCount += 1
      if (metrics.bucket === 'critical_gap') prev.criticalGapCount += 1
      if (metrics.bucket === 'critical_gap' || metrics.bucket === 'partial') prev.atRiskCount += 1
      map.set(dayKey, prev)
    }
  }
  for (const c of map.values()) {
    if (c.eventCount > 0) {
      c.agg_coverage /= c.eventCount
      c.agg_risk /= c.eventCount
    }
  }
  return map
}

export { windowBounds, confirmedAssignments }
