/**
 * Calendar page UI state → shared summary filters + segment predicates (blueprint 17).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type {
  CalendarFunctionSegment,
  CalendarGeoScopeSegment,
  CalendarLifecycleStatus,
} from './campaignCalendarArchitecture'
import type { CampaignCalendarSegmentFilters } from './campaignCalendarSegmentEngine'
import { matchesSegmentFilters } from './campaignCalendarSegmentEngine'
import type { CalendarWidgetPersona, EventSummaryFilter } from './eventSummaryEngine'
import {
  filterEvents,
  filterEventsForCalendarPersona,
} from './eventSummaryEngine'

export type EventCalendarDatePreset = '7' | '14' | '30' | 'all' | 'custom'

export type EventCalendarUiState = {
  datePreset: EventCalendarDatePreset
  dateFrom: string
  dateTo: string
  eventTypes: string[]
  visibilityScopes: string[]
  countyIds: string[]
  functionSegment: CalendarFunctionSegment | ''
  geoScope: CalendarGeoScopeSegment | ''
  lifecycle: CalendarLifecycleStatus | ''
  ownerQuery: string
  candidateOnly: boolean
  fundraisingOnly: boolean
  publicOnly: boolean
}

export const DEFAULT_EVENT_CALENDAR_UI: EventCalendarUiState = {
  datePreset: '30',
  dateFrom: '',
  dateTo: '',
  eventTypes: [],
  visibilityScopes: [],
  countyIds: [],
  functionSegment: '',
  geoScope: '',
  lifecycle: '',
  ownerQuery: '',
  candidateOnly: false,
  fundraisingOnly: false,
  publicOnly: false,
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function eventSummaryFilterFromUi(
  ui: EventCalendarUiState,
  nowMs: number,
): EventSummaryFilter {
  let dateFrom = ui.dateFrom.trim()
  let dateTo = ui.dateTo.trim()

  if (ui.datePreset !== 'custom') {
    if (ui.datePreset === 'all') {
      dateFrom = ''
      dateTo = ''
    } else {
      const days = Number(ui.datePreset)
      const start = new Date(nowMs)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + days)
      dateFrom = toIsoDateLocal(start)
      dateTo = toIsoDateLocal(end)
    }
  }

  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    eventTypes: ui.eventTypes.length ? ui.eventTypes : undefined,
    visibilityScopes: ui.visibilityScopes.length ? ui.visibilityScopes : undefined,
    countyIds: ui.countyIds.length ? ui.countyIds : undefined,
    candidateOnly: ui.candidateOnly || undefined,
    fundraisingOnly: ui.fundraisingOnly || undefined,
    publicOnly: ui.publicOnly || undefined,
  }
}

export function segmentFiltersFromUi(ui: EventCalendarUiState): CampaignCalendarSegmentFilters {
  return {
    visibility: '',
    functionSegment: ui.functionSegment,
    geoScope: ui.geoScope,
    lifecycle: ui.lifecycle,
    ownerQuery: ui.ownerQuery,
  }
}

export function applyCalendarPageFilters(
  source: readonly CampaignCalendarEventRecord[],
  persona: CalendarWidgetPersona,
  ui: EventCalendarUiState,
  nowMs: number,
): CampaignCalendarEventRecord[] {
  const summary = eventSummaryFilterFromUi(ui, nowMs)
  const seg = segmentFiltersFromUi(ui)
  let pool = filterEventsForCalendarPersona(source, persona)
  pool = filterEvents(pool, summary)
  return pool.filter((e) => matchesSegmentFilters(e, seg))
}
