/**
 * Site rollups for automation + Agent Jones (pure).
 */

import type { GotvReadinessBand } from './gotvDomain'
import type { GotvSiteReadiness } from './gotvReadiness'

export type GotvSiteRollup = {
  site_id: string
  label: string
  county_id: string | null
  site_kind: string
  readiness_band: GotvReadinessBand
  score: number
  primary_reasons: string[]
  open_incidents: number
  coverage_pct: number
  next_intervention_hint: string | null
}

export function buildGotvSiteRollups(
  sites: readonly { id: string; label: string; county_id: string | null; site_kind: string }[],
  readinessBySiteId: ReadonlyMap<string, GotvSiteReadiness>,
): GotvSiteRollup[] {
  return sites.flatMap((s) => {
    const r = readinessBySiteId.get(s.id)
    if (!r) return []
    return [{
      site_id: s.id,
      label: s.label,
      county_id: s.county_id,
      site_kind: s.site_kind,
      readiness_band: r.band,
      score: r.score_0_100,
      primary_reasons: r.primary_reasons,
      open_incidents: r.open_incidents,
      coverage_pct: r.coverage_pct,
      next_intervention_hint: r.next_intervention_hint,
    }]
  })
}
