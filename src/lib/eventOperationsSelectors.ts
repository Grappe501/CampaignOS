/**
 * Selectors for county ops / dashboards — dev fixtures + workflow + staffing heuristics.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventOperationalStatus } from './campaignEventDomain'
import { calculateEventReadiness } from './campaignEventDomainServices'
import { createWorkflowForCalendarRecord, getWorkflowProgress, getBlockingIssues } from './eventWorkflowEngine'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { staffingCoverageRatio } from './eventAnalyticsSelectors'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { getEventTypeTemplate } from './event-types.config'
import { mapMobilizeToExternalPublishState } from './eventExternalPublishing'

export type CountyOperationsEventRow = {
  record: CampaignCalendarEventRecord
  typeKey: CampaignEventTypeKey | null
  readinessScore: number
  staffingCoverage: number
  workflowPercent: number
  blockers: string[]
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
    let objectiveLabel: string | null = null

    if (typeKey) {
      const run = createWorkflowForCalendarRecord(record, typeKey)
      workflowPercent = getWorkflowProgress(run).percent
      blockers = [...getBlockingIssues(run)]
      staffingCoverage = staffingCoverageRatio(record, typeKey)
      objectiveLabel = getEventTypeTemplate(typeKey).defaultObjective

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

export function filterCountyRows(
  rows: CountyOperationsEventRow[],
  filters: {
    countyId: string | null
    type: string | null
    objective: string | null
    minReadiness: number | null
    mobilize: string | null
  },
): CountyOperationsEventRow[] {
  return rows.filter((r) => {
    if (filters.countyId && r.record.county_id !== filters.countyId) return false
    if (filters.type && r.record.event_type !== filters.type) return false
    if (filters.objective && r.objectiveLabel !== filters.objective) return false
    if (filters.minReadiness != null && r.readinessScore < filters.minReadiness) return false
    if (filters.mobilize && r.mobilizePublish !== filters.mobilize) return false
    return true
  })
}
