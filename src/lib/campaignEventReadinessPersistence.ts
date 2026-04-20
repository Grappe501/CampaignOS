/**
 * Recompute readiness from persisted tasks + staffing and write `campaign_events` fields.
 */

import { calculateEventReadiness, type EventReadinessCalculationInput } from './campaignEventDomainServices'
import { campaignEventFromRow } from './campaignEventDomain'
import type { EventOperationalStatus } from './campaignEventDomain'
import { operationalStatusFromReadinessAndClock } from './campaignEventOperationalSync'
import { fetchEventTaskRows } from './campaignEventTasksDb'
import { supabase } from './supabaseClient'

async function attendanceCountForEvent(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('campaign_event_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (error) return 0
  return count ?? 0
}
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { getStaffingMatrixForEventType } from './eventStaffingMatrix'
import { CAMPAIGN_EVENT_LIST_SELECT } from './campaignEventsColumns'
import { mapCampaignEventRowToCalendarRecord } from './campaignEventRowMapper'
import { collectOperationsGapsForEvent } from './campaignEventCoordinatorOperations'
import { computeEventHealthScoreV2 } from './eventHealthScoreV2'
import { fetchLatestHealthScoreForEvent, insertEventHealthHistorySnapshot } from './eventHealthHistoryDb'

async function staffingCoverageRatio(eventId: string, typeKey: CampaignEventTypeKey): Promise<number> {
  const { data, error } = await supabase
    .from('campaign_event_staffing_assignments')
    .select('staff_role_slug,status')
    .eq('event_id', eventId)

  if (error)
    throw new Error(
      error.message ?? 'Failed to load staffing assignments for readiness',
    )

  const rows = data ?? []
  const matrix = getStaffingMatrixForEventType(typeKey)
  const required = matrix.filter((m) => m.required)
  if (!required.length) return 1

  let met = 0
  for (const r of required) {
    const filled = rows.filter(
      (a) =>
        String(a.staff_role_slug) === r.slug &&
        ['confirmed', 'completed'].includes(String(a.status).toLowerCase()),
    ).length
    if (filled >= r.minFilled) met += 1
  }
  return met / required.length
}

export async function recomputeAndPersistEventReadiness(
  eventId: string,
  input: {
    eventType: CampaignEventTypeKey
    /** Full row for campaignEventFromRow + clock fields. */
    row: Record<string, unknown>
  },
): Promise<{ readinessPct: number; operationalStatus: EventOperationalStatus }> {
  const tasks = await fetchEventTaskRows(eventId)
  const critical = tasks.filter((t) => t.is_critical && t.required)
  const done = critical.filter((t) => t.status === 'completed' || t.status === 'skipped')
  const completedCriticalTaskRatio = critical.length ? done.length / critical.length : 1

  let staffingCoverageRatioVal = 0.35
  try {
    staffingCoverageRatioVal = await staffingCoverageRatio(eventId, input.eventType)
  } catch {
    staffingCoverageRatioVal = 0.35
  }

  const venueName = input.row.venue_name != null ? String(input.row.venue_name) : ''
  const venueConfirmed = venueName.trim().length > 0
  const materialsConfirmed = completedCriticalTaskRatio >= 0.35
  let attendanceCount = 0
  try {
    attendanceCount = await attendanceCountForEvent(eventId)
  } catch {
    attendanceCount = 0
  }
  const dataCaptureReady =
    venueConfirmed ||
    completedCriticalTaskRatio >= 0.15 ||
    tasks.length > 0 ||
    attendanceCount > 0
  const followupOwnerAssigned = input.row.owner_user_id != null

  const op = (input.row.operational_status as EventOperationalStatus) ?? 'planning'

  const readinessInput: EventReadinessCalculationInput = {
    operationalStatus: op,
    completedCriticalTaskRatio,
    staffingCoverageRatio: staffingCoverageRatioVal,
    rsvpProgressRatio: null,
    venueConfirmed,
    materialsConfirmed,
    dataCaptureReady,
    followupOwnerAssigned,
  }

  const model = calculateEventReadiness(readinessInput)
  const startMs = new Date(String(input.row.start_at ?? '')).getTime()
  const endRaw = input.row.end_at
  const endMs = endRaw != null && String(endRaw).trim() !== '' ? new Date(String(endRaw)).getTime() : null

  const nextOp = operationalStatusFromReadinessAndClock({
    readinessPct: model.readinessScore,
    nowMs: Date.now(),
    startAtMs: startMs,
    endAtMs: Number.isNaN(endMs as number) ? null : endMs,
    current: op,
  })

  const { error } = await supabase
    .from('campaign_events')
    .update({
      readiness_score: model.readinessScore,
      operational_status: nextOp,
    })
    .eq('id', eventId)

  if (error) throw error

  try {
    const prevReady =
      input.row.readiness_score != null && input.row.readiness_score !== ''
        ? Number(input.row.readiness_score)
        : null
    const readinessChanged =
      prevReady == null ||
      Number.isNaN(prevReady) ||
      Math.abs(prevReady - model.readinessScore) >= 0.75
    const statusChanged = nextOp !== op
    if (readinessChanged || statusChanged) {
      const { data: fullRow } = await supabase
        .from('campaign_events')
        .select(CAMPAIGN_EVENT_LIST_SELECT)
        .eq('id', eventId)
        .maybeSingle()
      if (fullRow && typeof fullRow === 'object') {
        const record = mapCampaignEventRowToCalendarRecord(fullRow as Record<string, unknown>)
        const prior = await fetchLatestHealthScoreForEvent(eventId)
        const gaps = collectOperationsGapsForEvent(record)
        const v2 = computeEventHealthScoreV2({
          record,
          gaps,
          nowMs: Date.now(),
          prior_score: prior,
        })
        await insertEventHealthHistorySnapshot({
          eventId,
          result: v2,
          changedFactors: [
            readinessChanged ? 'readiness_delta' : '',
            statusChanged ? 'operational_status' : '',
          ].filter(Boolean),
        })
      }
    }
  } catch {
    /* history is best-effort */
  }

  return { readinessPct: model.readinessScore, operationalStatus: nextOp }
}

export function campaignEventRowFromSupabase(row: Record<string, unknown>) {
  return campaignEventFromRow(row)
}
