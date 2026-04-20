/**
 * Calendar widget pack (blueprint 11) — assembled from eventSummaryEngine (blueprint 14).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  buildCalendarSnapshotDays,
  buildCandidateFocusItems,
  buildCountyRailRows,
  buildFollowupSlice,
  buildMobilizeQueueSlice,
  buildUpcomingStripForPersona,
  filterEventsForCalendarPersona,
  mapEventsToUpcomingItems,
  buildWidgetEventPressure,
  type CalendarSnapshotDay,
  type CalendarWidgetPersona,
  type CandidateFocusItem,
  type CountyRailRow,
  type FollowupSlice,
  type MobilizeQueueSlice,
  type WidgetEventPressure,
} from './eventSummaryEngine'

export type {
  CalendarWidgetPersona,
  CalendarSnapshotDay,
  CandidateFocusItem,
  CountyRailRow,
  FollowupSlice,
  MobilizeQueueSlice,
} from './eventSummaryEngine'

export type EventPressureSummary = WidgetEventPressure

export type UpcomingStripItem = {
  event_id: string
  title: string
  start_at: string
  shortDate: string
  urgency: 'soon' | 'normal'
}

export type CalendarWidgetPack = {
  persona: CalendarWidgetPersona
  strip: UpcomingStripItem[]
  pressure: EventPressureSummary
  snapshotDays: CalendarSnapshotDay[]
  candidateFocus: CandidateFocusItem[]
  mobilize: MobilizeQueueSlice
  followup: FollowupSlice
  countyRail: CountyRailRow[]
  hasAnyCalendarData: boolean
}

export {
  mapProfileRoleToCalendarWidgetPersona,
  filterEventsForCalendarPersona,
} from './eventSummaryEngine'

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function toStripItems(
  records: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): UpcomingStripItem[] {
  return mapEventsToUpcomingItems(records, nowMs).map((it) => ({
    event_id: it.eventId,
    title: it.title,
    start_at: it.startAt,
    shortDate: formatShortDate(it.startAt),
    urgency: it.urgency === 'low' ? ('normal' as const) : ('soon' as const),
  }))
}

export function buildCalendarWidgetPack(
  events: readonly CampaignCalendarEventRecord[],
  persona: CalendarWidgetPersona,
  nowMs: number = Date.now(),
): CalendarWidgetPack {
  const filtered = filterEventsForCalendarPersona(events, persona)
  const stripRecords = buildUpcomingStripForPersona(events, persona, 7, nowMs)
  const strip = toStripItems(stripRecords, nowMs)

  const pressurePool =
    persona === 'admin' || persona === 'campaign_manager' ? events : filtered

  const pressure = buildWidgetEventPressure(pressurePool, nowMs)
  const snapshotDays = buildCalendarSnapshotDays(filtered, nowMs, 7)
  const candidateFocus = buildCandidateFocusItems(filtered, nowMs)
  const mobilize = buildMobilizeQueueSlice(pressurePool)
  const followup = buildFollowupSlice(pressurePool, nowMs)
  const countyRail = buildCountyRailRows(pressurePool, nowMs, 14)

  const hasAnyCalendarData =
    events.length > 0 &&
    (strip.length > 0 ||
      pressure.approvalBacklog +
        pressure.staffingGaps +
        pressure.logisticsGaps +
        pressure.mobilizeQueue +
        pressure.followupDebt >
        0 ||
      snapshotDays.length > 0)

  return {
    persona,
    strip,
    pressure,
    snapshotDays,
    candidateFocus,
    mobilize,
    followup,
    countyRail,
    hasAnyCalendarData,
  }
}

export function shouldShowCalendarWidgetsOnVolunteerDashboard(
  persona: CalendarWidgetPersona,
): boolean {
  return persona === 'campaign_manager' || persona === 'volunteer'
}
