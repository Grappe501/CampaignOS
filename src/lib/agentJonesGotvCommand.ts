/**
 * Bounded GOTV / polling-place command snapshot for Agent Jones (advisory).
 */

import type { GotvSiteRollup } from './gotvMetrics'
import type { GotvTurnoutPhase } from './gotvDomain'
import type { GotvProgramAnalytics } from './gotvAnalytics'
import { sortSitesByRisk } from './gotvSelectors'

export type AgentJonesGotvCommandSnapshot = {
  source: 'gotv_command_v1'
  generated_at_ms: number
  turnout_phase: GotvTurnoutPhase
  phase_priorities: string[]
  site_readiness_distribution: { green: number; yellow: number; orange: number; red: number }
  top_at_risk_site_labels: { label: string; county_id: string | null; score: number; band: string }[]
  top_under_covered_county_hints: string[]
  replacement_or_fill_hints: string[]
  operational_lines: string[]
  program_headline: string
}

export function buildAgentJonesGotvCommandSnapshot(input: {
  generatedAtMs: number
  phase: GotvTurnoutPhase
  phasePriorities: string[]
  rollups: readonly GotvSiteRollup[]
  analytics: GotvProgramAnalytics
}): AgentJonesGotvCommandSnapshot | null {
  const { rollups, analytics, phase, phasePriorities, generatedAtMs } = input
  if (!rollups.length) return null

  const dist = { green: 0, yellow: 0, orange: 0, red: 0 }
  for (const r of rollups) {
    dist[r.readiness_band] += 1
  }

  const risky = sortSitesByRisk(rollups).filter((r) => r.readiness_band === 'red' || r.readiness_band === 'orange')
  const top_at_risk_site_labels = risky.slice(0, 6).map((r) => ({
    label: r.label.slice(0, 120),
    county_id: r.county_id,
    score: r.score,
    band: r.readiness_band,
  }))

  const replacement_or_fill_hints = risky.slice(0, 4).map(
    (r) => `Fill/repair: ${r.label} (${r.readiness_band}, coverage ${r.coverage_pct}%)`,
  )

  const operational_lines: string[] = [analytics.headline]
  if (phasePriorities.length) {
    operational_lines.push(...phasePriorities.slice(0, 2))
  }
  if (analytics.red_site_count > 0) {
    operational_lines.push(`${analytics.red_site_count} site(s) in critical band — county lead review.`)
  }

  return {
    source: 'gotv_command_v1',
    generated_at_ms: generatedAtMs,
    turnout_phase: phase,
    phase_priorities: phasePriorities.slice(0, 4),
    site_readiness_distribution: dist,
    top_at_risk_site_labels,
    top_under_covered_county_hints: analytics.weakest_county_labels.slice(0, 5),
    replacement_or_fill_hints: replacement_or_fill_hints.slice(0, 6),
    operational_lines: operational_lines.slice(0, 5),
    program_headline: analytics.headline.slice(0, 360),
  }
}
