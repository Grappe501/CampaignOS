/**
 * Event analytics and coverage — aggregates over the coordinator event queue.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { getEventTypeTemplate } from './event-types.config'
import { createWorkflowForCalendarRecord, getWorkflowProgress, type EventWorkflowRun } from './eventWorkflowEngine'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { evaluateStaffingMatrix } from './eventStaffingMatrix'
import { getDevStaffingAssignmentsForEvent } from './campaignEventStaffingDevFixtures'

export type EventAnalyticsSnapshot = {
  totalEvents: number
  byCounty: Record<string, number>
  byType: Record<string, number>
  byObjectiveTag: Record<string, number>
  avgReadiness: number
  lowReadinessCount: number
  densityByWeek: { weekKey: string; count: number }[]
}

function weekKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  const y = d.getUTCFullYear()
  const oneJan = new Date(Date.UTC(y, 0, 1))
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getUTCDay() + 1) / 7)
  return `${y}-W${String(week).padStart(2, '0')}`
}

function readinessFromWorkflow(run: EventWorkflowRun): number {
  return getWorkflowProgress(run).percent
}

export function buildEventAnalyticsSnapshot(rows: CampaignCalendarEventRecord[]): EventAnalyticsSnapshot {
  const byCounty: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byObjectiveTag: Record<string, number> = {}
  const density: Record<string, number> = {}
  let readinessSum = 0
  let readinessN = 0
  let low = 0

  for (const r of rows) {
    const c = r.county_id ?? 'unspecified'
    byCounty[c] = (byCounty[c] ?? 0) + 1
    byType[r.event_type] = (byType[r.event_type] ?? 0) + 1

    if (isCampaignEventTypeKey(r.event_type)) {
      const o = getEventTypeTemplate(r.event_type).defaultObjective
      byObjectiveTag[o] = (byObjectiveTag[o] ?? 0) + 1
    }

    const wk = weekKey(r.start_at)
    density[wk] = (density[wk] ?? 0) + 1

    if (isCampaignEventTypeKey(r.event_type)) {
      const run = createWorkflowForCalendarRecord(r, r.event_type)
      const pct = readinessFromWorkflow(run)
      readinessSum += pct
      readinessN += 1
      if (pct < 50) low += 1
    }
  }

  const densityByWeek = Object.entries(density)
    .map(([weekKey, count]) => ({ weekKey, count }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))

  return {
    totalEvents: rows.length,
    byCounty,
    byType,
    byObjectiveTag,
    avgReadiness: readinessN ? Math.round(readinessSum / readinessN) : 0,
    lowReadinessCount: low,
    densityByWeek,
  }
}

export type CoverageGap = {
  kind: 'county_low_volume' | 'precinct_untouched' | 'followup_weak'
  label: string
  detail: string
}

export function deriveCoverageGaps(rows: CampaignCalendarEventRecord[]): CoverageGap[] {
  const gaps: CoverageGap[] = []
  const byCounty: Record<string, number> = {}
  for (const r of rows) {
    const c = r.county_id
    if (!c) continue
    byCounty[c] = (byCounty[c] ?? 0) + 1
  }
  for (const [county, n] of Object.entries(byCounty)) {
    if (n < 2) {
      gaps.push({
        kind: 'county_low_volume',
        label: county,
        detail: 'Low event volume — schedule visibility or volunteer recruitment.',
      })
    }
  }
  if (rows.some((r) => r.followup_state === 'overdue')) {
    gaps.push({
      kind: 'followup_weak',
      label: 'Follow-up',
      detail: 'One or more events have overdue follow-up reconciliation.',
    })
  }
  return gaps
}

export function staffingCoverageRatio(
  row: CampaignCalendarEventRecord,
  typeKey: CampaignEventTypeKey,
): number {
  const assigns = getDevStaffingAssignmentsForEvent(row.event_id)
  const matrix = evaluateStaffingMatrix(typeKey, assigns)
  const req = matrix.filter((m) => m.template.required)
  if (req.length === 0) return 1
  const ok = req.filter((m) => m.satisfied).length
  return ok / req.length
}
