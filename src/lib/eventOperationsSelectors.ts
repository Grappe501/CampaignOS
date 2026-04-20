/**
 * Selectors for county ops / dashboards — dev fixtures + workflow + staffing heuristics.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventOperationalStatus } from './campaignEventDomain'
import { calculateEventReadiness } from './campaignEventDomainServices'
import {
  createWorkflowForCalendarRecord,
  getWorkflowProgress,
  getBlockingIssues,
} from './eventWorkflowEngine'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { staffingCoverageRatio } from './eventAnalyticsSelectors'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { getEventTypeTemplate } from './event-types.config'
import { mapMobilizeToExternalPublishState } from './eventExternalPublishing'
import {
  isFollowupOverdue,
  isPastEvent,
  normalizeFollowupPhase,
} from './eventPostEventWorkflow'

export type CountyOperationsEventRow = {
  record: CampaignCalendarEventRecord
  typeKey: CampaignEventTypeKey | null
  readinessScore: number
  staffingCoverage: number
  workflowPercent: number
  blockers: string[]
  /** Resolved from DB `event_objective` or event-type template default. */
  objectiveLabel: string | null
  mobilizePublish: string
  rsvpGoal: number | null
  rsvpCount: number | null
}

function safeType(row: CampaignCalendarEventRecord): CampaignEventTypeKey | null {
  return isCampaignEventTypeKey(row.event_type) ? row.event_type : null
}

export function buildCountyOperationsRows(rows: CampaignCalendarEventRecord[]): CountyOperationsEventRow[] {
  return rows.map((record) => {
    const typeKey = safeType(record)
    let readinessScore = 0
    let workflowPercent = 0
    let blockers: string[] = []
    let staffingCoverage = 0

    const fromDb = record.event_objective?.trim()
    const objectiveLabel: string | null =
      (fromDb && fromDb.length > 0 ? fromDb : null) ||
      (typeKey ? getEventTypeTemplate(typeKey).defaultObjective : null)

    if (typeKey) {
      const run = createWorkflowForCalendarRecord(record, typeKey)
      workflowPercent = getWorkflowProgress(run).percent
      blockers = [...getBlockingIssues(run)]
      staffingCoverage = staffingCoverageRatio(record, typeKey)

      const op: EventOperationalStatus =
        (record.operational_status as EventOperationalStatus) ?? 'scheduled'

      const completedRatio = workflowPercent / 100
      const venueConfirmed = Boolean(record.venue_name?.trim())
      const materialsConfirmed = completedRatio >= 0.35
      const dataCaptureReady =
        venueConfirmed ||
        completedRatio >= 0.15 ||
        (record.staffing_state != null && record.staffing_state !== 'unstaffed')

      const readiness = calculateEventReadiness({
        operationalStatus: op,
        completedCriticalTaskRatio: completedRatio,
        staffingCoverageRatio: staffingCoverage,
        rsvpProgressRatio: null,
        venueConfirmed,
        materialsConfirmed,
        dataCaptureReady,
        followupOwnerAssigned: Boolean(record.owner_user_id),
      })
      readinessScore =
        record.readiness_score != null && !Number.isNaN(Number(record.readiness_score))
          ? Math.round(Number(record.readiness_score))
          : readiness.readinessScore
      blockers = [...new Set([...blockers, ...readiness.blockers])]
    }

    return {
      record,
      typeKey,
      readinessScore,
      staffingCoverage: Math.round(staffingCoverage * 100),
      workflowPercent,
      blockers,
      objectiveLabel,
      mobilizePublish: mapMobilizeToExternalPublishState(record.mobilize_publish_state),
      rsvpGoal: 50,
      rsvpCount: null,
    }
  })
}

export type CountyOpsFilters = {
  countyId: string | null
  type: string | null
  objective: string | null
  minReadiness: number | null
  mobilize: string | null
  ownerUserId: string | null
  /** ISO date string (date only) — event `start_at` must be >= this day start UTC */
  dateStart: string | null
  /** ISO date string (date only) — event `start_at` must be <= this day end UTC */
  dateEnd: string | null
  operationalStatus: string | null
}

export function filterCountyRows(
  rows: CountyOperationsEventRow[],
  filters: CountyOpsFilters,
): CountyOperationsEventRow[] {
  return rows.filter((r) => {
    if (filters.countyId && r.record.county_id !== filters.countyId) return false
    if (filters.type && r.record.event_type !== filters.type) return false
    if (filters.objective && r.objectiveLabel !== filters.objective) return false
    if (filters.minReadiness != null && r.readinessScore < filters.minReadiness) return false
    if (filters.mobilize && r.mobilizePublish !== filters.mobilize) return false
    if (filters.ownerUserId && r.record.owner_user_id !== filters.ownerUserId) return false
    if (filters.operationalStatus) {
      const op = (r.record.operational_status ?? 'scheduled').trim()
      if (op !== filters.operationalStatus) return false
    }
    if (filters.dateStart) {
      const start = new Date(r.record.start_at).getTime()
      const min = new Date(filters.dateStart).setHours(0, 0, 0, 0)
      if (start < min) return false
    }
    if (filters.dateEnd) {
      const start = new Date(r.record.start_at).getTime()
      const max = new Date(filters.dateEnd).setHours(23, 59, 59, 999)
      if (start > max) return false
    }
    return true
  })
}

/** Staffing risk: low matrix coverage or explicit at-risk / unstaffed state. */
export function selectStaffingGapRows(
  rows: CountyOperationsEventRow[],
  coverageThresholdPct = 65,
): CountyOperationsEventRow[] {
  return rows.filter((r) => {
    const st = String(r.record.staffing_state ?? '')
    if (st === 'at_risk' || st === 'unstaffed') return true
    return r.staffingCoverage < coverageThresholdPct
  })
}

/** Past events that still need follow-up reconciliation or are overdue. */
export function selectFollowupAttentionRows(
  rows: CountyOperationsEventRow[],
  nowMs = Date.now(),
): CountyOperationsEventRow[] {
  return rows.filter((r) => {
    if (!isPastEvent(r.record, nowMs)) return false
    if (normalizeFollowupPhase(r.record.followup_state) === 'complete') return false
    return true
  })
}

export function selectFollowupOverdueRows(
  rows: CountyOperationsEventRow[],
  nowMs = Date.now(),
): CountyOperationsEventRow[] {
  return rows.filter((r) => isFollowupOverdue(r.record, nowMs))
}

/** Events with `start_at` in the given calendar month (local). */
export function countEventsScheduledInMonth(
  rows: CampaignCalendarEventRecord[],
  ref = new Date(),
): number {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return rows.filter((r) => {
    const d = new Date(r.start_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

/** Recently completed events (for outcomes strip). */
export function selectRecentCompletedEvents(
  rows: CampaignCalendarEventRecord[],
  daysBack = 45,
  nowMs = Date.now(),
): CampaignCalendarEventRecord[] {
  const cutoff = nowMs - daysBack * 86400000
  return rows
    .filter((r) => {
      if (String(r.stage_status) !== 'completed') return false
      const end = new Date(r.end_at || r.start_at).getTime()
      return !Number.isNaN(end) && end >= cutoff && end <= nowMs
    })
    .sort((a, b) => new Date(b.end_at || b.start_at).getTime() - new Date(a.end_at || a.start_at).getTime())
}

/** Next 14 days from today (local): date key → events starting that day (from filtered list). */
export function buildFortnightAgenda(
  rows: CountyOperationsEventRow[],
  from = new Date(),
): { dayKey: string; label: string; events: CountyOperationsEventRow[] }[] {
  const out: { dayKey: string; label: string; events: CountyOperationsEventRow[] }[] = []
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dayKey = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    const events = rows.filter((r) => {
      const t = new Date(r.record.start_at)
      return t.toISOString().slice(0, 10) === dayKey
    })
    out.push({ dayKey, label, events })
  }
  return out
}
