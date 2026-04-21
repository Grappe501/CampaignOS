/**
 * Geographic rollups from the shared campaign event queue (pure).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { effectiveReadinessPercent } from './eventAnalyticsSelectors'
import {
  completedEventsWithOpenFollowupPhase,
  isCommunicationsRisk,
  isStaffingGap,
} from './leadershipBriefingSelectors'
import {
  formatGeoAreaLabel,
  saturationBandFromCount,
  type GeoSaturationBand,
} from './geographicCommandDomain'

const DEFAULT_WINDOW_DAYS = 14

function isCanceledish(record: CampaignCalendarEventRecord): boolean {
  const st = String(record.stage_status ?? '').toLowerCase()
  return st === 'canceled' || st === 'cancelled' || st === 'archived'
}

/** Event starts within [now, now + windowDays] (saturation / forward pressure). */
export function eventStartsInForwardWindow(
  record: CampaignCalendarEventRecord,
  nowMs: number,
  windowDays: number,
): boolean {
  if (isCanceledish(record)) return false
  const t = new Date(record.start_at).getTime()
  if (Number.isNaN(t)) return false
  const end = nowMs + windowDays * 86400000
  return t >= nowMs && t <= end
}

export type GeographicAreaRollup = {
  area_key: string
  county_id: string | null
  precinct_id: string | null
  label: string
  window_days: number
  upcoming_event_count: number
  staffing_gap_count: number
  low_readiness_count: number
  mobilize_risk_count: number
  followup_debt_on_completed: number
  pressure_score_0_100: number
  saturation_band: GeoSaturationBand
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function scoreRollup(input: {
  upcoming: number
  staffingGaps: number
  lowReadiness: number
  mobilizeRisk: number
  followupDebt: number
}): number {
  return clamp100(
    input.upcoming * 3.2 +
      input.staffingGaps * 11 +
      input.lowReadiness * 5.5 +
      input.mobilizeRisk * 7 +
      input.followupDebt * 9,
  )
}

type Agg = {
  upcoming: number
  staffingGaps: number
  lowReadiness: number
  mobilizeRisk: number
  followupDebt: number
}

function emptyAgg(): Agg {
  return {
    upcoming: 0,
    staffingGaps: 0,
    lowReadiness: 0,
    mobilizeRisk: 0,
    followupDebt: 0,
  }
}

/**
 * County-level rollups for forward window + follow-up debt on completed events (all time in pool).
 */
export function buildCountyCommandRollups(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  windowDays = DEFAULT_WINDOW_DAYS,
): GeographicAreaRollup[] {
  const byCounty = new Map<string | null, Agg>()
  const ensure = (id: string | null) => byCounty.get(id) ?? emptyAgg()

  for (const e of events) {
    if (isCanceledish(e)) continue
    const cid = e.county_id ?? null
    if (eventStartsInForwardWindow(e, nowMs, windowDays)) {
      const a = { ...ensure(cid) }
      a.upcoming += 1
      if (isStaffingGap(e)) a.staffingGaps += 1
      const r = effectiveReadinessPercent(e)
      if (r != null && r < 55) a.lowReadiness += 1
      if (isCommunicationsRisk(e, nowMs)) a.mobilizeRisk += 1
      byCounty.set(cid, a)
    }
  }

  const debtByCounty = new Map<string | null, number>()
  for (const e of completedEventsWithOpenFollowupPhase(events)) {
    const cid = e.county_id ?? null
    debtByCounty.set(cid, (debtByCounty.get(cid) ?? 0) + 1)
  }

  const rows: GeographicAreaRollup[] = []
  const keys = new Set([...byCounty.keys(), ...debtByCounty.keys()])
  for (const cid of keys) {
    const a = byCounty.get(cid) ?? emptyAgg()
    const debt = debtByCounty.get(cid) ?? 0
    const merged: Agg = { ...a, followupDebt: debt }
    const pressure = scoreRollup(merged)
    const label = formatGeoAreaLabel({ county_id: cid, precinct_id: null })
    const key = cid ?? '__none__'
    rows.push({
      area_key: `county:${key}`,
      county_id: cid,
      precinct_id: null,
      label,
      window_days: windowDays,
      upcoming_event_count: merged.upcoming,
      staffing_gap_count: merged.staffingGaps,
      low_readiness_count: merged.lowReadiness,
      mobilize_risk_count: merged.mobilizeRisk,
      followup_debt_on_completed: merged.followupDebt,
      pressure_score_0_100: pressure,
      saturation_band: saturationBandFromCount(merged.upcoming),
    })
  }

  return rows.sort((x, y) => y.pressure_score_0_100 - x.pressure_score_0_100)
}

/**
 * Precinct rollups (only rows with a precinct_id); same signals as county rollups.
 */
export function buildPrecinctCommandRollups(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number,
  windowDays = DEFAULT_WINDOW_DAYS,
): GeographicAreaRollup[] {
  const byPrecinct = new Map<string, { county_id: string | null; precinct_id: string; agg: Agg }>()

  for (const e of events) {
    if (isCanceledish(e) || !e.precinct_id) continue
    const pk = `${e.county_id ?? ''}::${e.precinct_id}`
    const cur =
      byPrecinct.get(pk) ?? {
        county_id: e.county_id ?? null,
        precinct_id: e.precinct_id,
        agg: emptyAgg(),
      }
    if (eventStartsInForwardWindow(e, nowMs, windowDays)) {
      cur.agg.upcoming += 1
      if (isStaffingGap(e)) cur.agg.staffingGaps += 1
      const r = effectiveReadinessPercent(e)
      if (r != null && r < 55) cur.agg.lowReadiness += 1
      if (isCommunicationsRisk(e, nowMs)) cur.agg.mobilizeRisk += 1
    }
    byPrecinct.set(pk, cur)
  }

  const debtByPrecinct = new Map<string, number>()
  for (const e of completedEventsWithOpenFollowupPhase(events)) {
    if (!e.precinct_id) continue
    const pk = `${e.county_id ?? ''}::${e.precinct_id}`
    debtByPrecinct.set(pk, (debtByPrecinct.get(pk) ?? 0) + 1)
  }

  const rows: GeographicAreaRollup[] = []
  const keys = new Set([...byPrecinct.keys(), ...debtByPrecinct.keys()])
  for (const pk of keys) {
    const meta = byPrecinct.get(pk)
    const a = meta ? { ...meta.agg } : emptyAgg()
    const debt = debtByPrecinct.get(pk) ?? 0
    const merged: Agg = { ...a, followupDebt: debt }
    const pressure = scoreRollup(merged)
    const label = formatGeoAreaLabel({
      county_id: meta?.county_id ?? null,
      precinct_id: meta?.precinct_id ?? pk.split('::')[1] ?? null,
    })
    rows.push({
      area_key: `precinct:${pk}`,
      county_id: meta?.county_id ?? null,
      precinct_id: meta?.precinct_id ?? null,
      label,
      window_days: windowDays,
      upcoming_event_count: merged.upcoming,
      staffing_gap_count: merged.staffingGaps,
      low_readiness_count: merged.lowReadiness,
      mobilize_risk_count: merged.mobilizeRisk,
      followup_debt_on_completed: merged.followupDebt,
      pressure_score_0_100: pressure,
      saturation_band: saturationBandFromCount(merged.upcoming),
    })
  }

  return rows.sort((x, y) => y.pressure_score_0_100 - x.pressure_score_0_100)
}
