/**
 * Leadership / command rollups (pure).
 */

import type { GotvSiteRollup } from './gotvMetrics'
import type { GotvTurnoutPhase } from './gotvDomain'

export type GotvProgramAnalytics = {
  total_sites: number
  by_band: Record<string, number>
  mean_coverage_pct: number
  red_site_count: number
  orange_site_count: number
  counties_touched: number
  weakest_county_labels: string[]
  phase: GotvTurnoutPhase
  headline: string
}

export function buildGotvProgramAnalytics(
  rollups: readonly GotvSiteRollup[],
  phase: GotvTurnoutPhase,
  countyLabelLookup?: ReadonlyMap<string, string>,
): GotvProgramAnalytics {
  const by_band: Record<string, number> = { green: 0, yellow: 0, orange: 0, red: 0 }
  let covSum = 0
  const countyWorst = new Map<string | null, { worst: number; label: string }>()

  for (const r of rollups) {
    by_band[r.readiness_band] = (by_band[r.readiness_band] ?? 0) + 1
    covSum += r.coverage_pct
    const prev = countyWorst.get(r.county_id)
    const label =
      (r.county_id && countyLabelLookup?.get(r.county_id)) || r.county_id || 'Unknown county'
    if (!prev || r.score < prev.worst) {
      countyWorst.set(r.county_id, { worst: r.score, label })
    }
  }

  const n = rollups.length || 1
  const weakest = [...countyWorst.values()]
    .sort((a, b) => a.worst - b.worst)
    .slice(0, 4)
    .map((x) => x.label)

  const counties = new Set(rollups.map((r) => r.county_id))

  let headline = `Turnout command: ${rollups.length} site(s) in ${phase.replace(/_/g, ' ')} phase.`
  if ((by_band.red ?? 0) > 0) {
    headline += ` ${by_band.red} critical site(s) need immediate coverage.`
  } else if ((by_band.orange ?? 0) > 0) {
    headline += ` ${by_band.orange} site(s) unstable — assign captains and confirm shifts.`
  } else {
    headline += ' Coverage posture is stable in this snapshot.'
  }

  return {
    total_sites: rollups.length,
    by_band,
    mean_coverage_pct: Math.round(covSum / n),
    red_site_count: by_band.red ?? 0,
    orange_site_count: by_band.orange ?? 0,
    counties_touched: counties.size,
    weakest_county_labels: weakest,
    phase,
    headline,
  }
}
