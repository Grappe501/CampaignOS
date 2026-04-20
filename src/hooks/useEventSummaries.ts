import { useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../lib/campaignCalendarArchitecture'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { buildPostEventAttentionQueue } from '../lib/eventPostEventWorkflow'
import type { CalendarWidgetPersona, EventSummaryFilter } from '../lib/eventSummaryEngine'
import {
  buildCandidateEventSummary,
  buildEventCalendarSummary,
  buildMobilizePromotionBullets,
  buildUpcomingCampaignItems,
  filterEvents,
  filterEventsForCalendarPersona,
  summarizeCountyCoverage,
  summarizeEventPressure,
  summarizeMobilizeQueue,
  summarizePostEventFollowup,
} from '../lib/eventSummaryEngine'

function useEventSummaryNowMs(intervalMs = 60_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return nowMs
}

function useEventSummarySource(): readonly CampaignCalendarEventRecord[] {
  const { events } = useCampaignEventsContext()
  return events
}

function useFilterKey(filter: EventSummaryFilter | undefined): string {
  return filter === undefined ? '' : JSON.stringify(filter)
}

function useFilteredPersonaPool(
  persona: CalendarWidgetPersona,
  filterKey: string,
): CampaignCalendarEventRecord[] {
  const events = useEventSummarySource()
  return useMemo(() => {
    const scoped = filterEventsForCalendarPersona(events, persona)
    if (!filterKey) return scoped
    const f = JSON.parse(filterKey) as EventSummaryFilter
    return filterEvents(scoped, f)
  }, [events, persona, filterKey])
}

function usePressurePool(
  persona: CalendarWidgetPersona,
  filterKey: string,
): CampaignCalendarEventRecord[] {
  const events = useEventSummarySource()
  return useMemo(() => {
    const f = filterKey ? (JSON.parse(filterKey) as EventSummaryFilter) : undefined
    if (persona === 'admin' || persona === 'campaign_manager') {
      return f ? filterEvents(events, f) : [...events]
    }
    const scoped = filterEventsForCalendarPersona(events, persona)
    return f ? filterEvents(scoped, f) : scoped
  }, [events, persona, filterKey])
}

/** 1 — “What’s coming up” strip / agenda (persona-scoped, optional structured filters). */
export function useUpcomingCampaignItems(
  persona: CalendarWidgetPersona,
  options?: { limit?: number; filter?: EventSummaryFilter },
): ReturnType<typeof buildUpcomingCampaignItems> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(options?.filter)
  const pool = useFilteredPersonaPool(persona, filterKey)
  const limit = options?.limit ?? 7
  return useMemo(
    () => buildUpcomingCampaignItems(pool, limit, nowMs),
    [pool, limit, nowMs],
  )
}

/** 2 — Command-card pressure counts (Admin/CM use full event source; others persona-scoped). */
export function useEventPressureSummary(
  persona: CalendarWidgetPersona,
  filter?: EventSummaryFilter,
): ReturnType<typeof summarizeEventPressure> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(filter)
  const pool = usePressurePool(persona, filterKey)
  return useMemo(() => summarizeEventPressure(pool, nowMs), [pool, nowMs])
}

/** 3 — Mobilize queue totals (same pool rule as pressure). */
export function useMobilizeQueueSummary(
  persona: CalendarWidgetPersona,
  filter?: EventSummaryFilter,
): ReturnType<typeof summarizeMobilizeQueue> {
  const filterKey = useFilterKey(filter)
  const pool = usePressurePool(persona, filterKey)
  return useMemo(() => summarizeMobilizeQueue(pool), [pool])
}

/** Mobilize queue counts plus coordinator-facing bullets (Pass 3). */
export function useMobilizePromotionSummary(
  persona: CalendarWidgetPersona,
  filter?: EventSummaryFilter,
): {
  summary: ReturnType<typeof summarizeMobilizeQueue>
  bullets: string[]
} {
  const filterKey = useFilterKey(filter)
  const pool = usePressurePool(persona, filterKey)
  return useMemo(() => {
    const summary = summarizeMobilizeQueue(pool)
    return { summary, bullets: buildMobilizePromotionBullets(summary) }
  }, [pool])
}

/** 4 — Candidate desk schedule intelligence (persona should usually be `candidate`). */
export function useCandidateEventSummary(
  persona: CalendarWidgetPersona,
  filter?: EventSummaryFilter,
): ReturnType<typeof buildCandidateEventSummary> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(filter)
  const pool = useFilteredPersonaPool(persona, filterKey)
  return useMemo(() => buildCandidateEventSummary(pool, nowMs), [pool, nowMs])
}

/** 5 — Post-event follow-up buckets (pressure pool). */
export function usePostEventFollowupSummary(
  persona: CalendarWidgetPersona,
  filter?: EventSummaryFilter,
): ReturnType<typeof summarizePostEventFollowup> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(filter)
  const pool = usePressurePool(persona, filterKey)
  return useMemo(() => summarizePostEventFollowup(pool, nowMs), [pool, nowMs])
}

/** Post-event reconciliation queue (ended events not in `complete` follow-up). */
export function usePostEventAttentionQueue(
  persona: CalendarWidgetPersona,
  options?: { limit?: number; filter?: EventSummaryFilter },
): ReturnType<typeof buildPostEventAttentionQueue> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(options?.filter)
  const pool = usePressurePool(persona, filterKey)
  const limit = options?.limit ?? 20
  return useMemo(
    () => buildPostEventAttentionQueue(pool, nowMs, limit),
    [pool, nowMs, limit],
  )
}

/** 6 — Calendar snapshot for 7 / 14 / 30-day windows (persona-scoped list). */
export function useEventCalendarSummary(
  persona: CalendarWidgetPersona,
  windowDays: 7 | 14 | 30,
  filter?: EventSummaryFilter,
): ReturnType<typeof buildEventCalendarSummary> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(filter)
  const pool = useFilteredPersonaPool(persona, filterKey)
  return useMemo(
    () => buildEventCalendarSummary(pool, nowMs, windowDays),
    [pool, nowMs, windowDays],
  )
}

/** 7 — County / area coverage heuristics (pressure pool, default 14-day horizon). */
export function useCountyEventCoverageSummary(
  persona: CalendarWidgetPersona,
  options?: { horizonDays?: number; filter?: EventSummaryFilter },
): ReturnType<typeof summarizeCountyCoverage> {
  const nowMs = useEventSummaryNowMs()
  const filterKey = useFilterKey(options?.filter)
  const pool = usePressurePool(persona, filterKey)
  const horizon = options?.horizonDays ?? 14
  return useMemo(
    () => summarizeCountyCoverage(pool, nowMs, horizon),
    [pool, nowMs, horizon],
  )
}
