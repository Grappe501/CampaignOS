/**
 * Intervention ranking and Agent Jones snapshot (geographic command).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { deriveCoverageGaps } from './eventAnalyticsSelectors'
import { pressureBandFromScore } from './geographicCommandDomain'
import {
  buildCountyCommandRollups,
  buildPrecinctCommandRollups,
  type GeographicAreaRollup,
} from './geographicCommandSelectors'

export type GeographicInterventionCandidate = GeographicAreaRollup & {
  priority: number
  reasons: string[]
  pressure_band: ReturnType<typeof pressureBandFromScore>
}

function reasonLines(r: GeographicAreaRollup): string[] {
  const out: string[] = []
  if (r.staffing_gap_count > 0) out.push(`${r.staffing_gap_count} staffing gaps in window`)
  if (r.mobilize_risk_count > 0) out.push(`${r.mobilize_risk_count} Mobilize/comms risk in 7d`)
  if (r.low_readiness_count > 0) out.push(`${r.low_readiness_count} low-readiness events`)
  if (r.followup_debt_on_completed > 0) out.push(`${r.followup_debt_on_completed} completed events still need follow-up phase`)
  if (r.saturation_band === 'high') out.push('High forward event saturation')
  if (out.length === 0 && r.upcoming_event_count > 0) out.push('Forward workload present — monitor execution quality')
  return out.slice(0, 4)
}

export function rankGeographicInterventionCandidates(
  rollups: readonly GeographicAreaRollup[],
  limit = 8,
): GeographicInterventionCandidate[] {
  const scored = rollups.map((r) => ({
    r,
    reasons: reasonLines(r),
    band: pressureBandFromScore(r.pressure_score_0_100),
    sortKey: r.pressure_score_0_100,
  }))
  scored.sort((a, b) => b.sortKey - a.sortKey)
  return scored.slice(0, limit).map((x, idx) => ({
    ...x.r,
    priority: idx + 1,
    reasons: x.reasons,
    pressure_band: x.band,
  }))
}

/** Normalize pressure to 0–1 heat (UI), roster-safe. */
export function heatIntensity01(pressureScore0_100: number): number {
  return Math.max(0, Math.min(1, pressureScore0_100 / 100))
}

export type AgentJonesGeographicCommandSnapshot = {
  source: 'geographic_command_v1'
  window_days: number
  counties_in_view: number
  precinct_rows_in_view: number
  critical_hotspot_count: number
  top_pressure_labels: string[]
  under_scheduled_county_hints: string[]
  summary_lines: string[]
}

export function buildAgentJonesGeographicCommandSnapshot(
  events: readonly CampaignCalendarEventRecord[],
  nowMs: number,
): AgentJonesGeographicCommandSnapshot | null {
  if (!events.length) return null
  const county = buildCountyCommandRollups(events, nowMs, 14)
  const precinct = buildPrecinctCommandRollups(events, nowMs, 14)
  const ranked = rankGeographicInterventionCandidates(county, 6)
  const critical = county.filter((c) => pressureBandFromScore(c.pressure_score_0_100) === 'critical')
  const gaps = deriveCoverageGaps([...events])
  const under = gaps
    .filter((g) => g.kind === 'county_low_volume')
    .map((g) => g.label)
    .slice(0, 5)

  const topLabels = ranked.slice(0, 4).map((r) => r.label.slice(0, 80))
  const lines: string[] = []
  if (critical.length) {
    lines.push(`${critical.length} counties above critical pressure band (forward window + debt proxies).`)
  }
  if (ranked[0]) {
    lines.push(`Top attention: ${ranked[0].label} — ${ranked[0].reasons[0] ?? 'review war room + county ops'}.`)
  }
  if (under.length) {
    lines.push(`Low-volume counties on file: ${under.join(', ')}.`)
  }
  if (!lines.length) {
    lines.push('Geographic pressure looks evenly distributed in the visible program — keep monitoring staffing and Mobilize.')
  }

  return {
    source: 'geographic_command_v1',
    window_days: 14,
    counties_in_view: Math.max(0, Math.min(200, county.length)),
    precinct_rows_in_view: Math.max(0, Math.min(500, precinct.length)),
    critical_hotspot_count: Math.max(0, Math.min(100, critical.length)),
    top_pressure_labels: topLabels,
    under_scheduled_county_hints: under.map((u) => u.slice(0, 64)),
    summary_lines: lines.slice(0, 4),
  }
}
