/**
 * Pure filters / sorts for GOTV command data.
 */

import type { GotvSiteRollup } from './gotvMetrics'
import type { GotvReadinessBand } from './gotvDomain'

const BAND_ORDER: Record<GotvReadinessBand, number> = {
  red: 3,
  orange: 2,
  yellow: 1,
  green: 0,
}

export function sortSitesByRisk(sites: readonly GotvSiteRollup[]): GotvSiteRollup[] {
  return [...sites].sort((a, b) => {
    const db = BAND_ORDER[b.readiness_band] - BAND_ORDER[a.readiness_band]
    if (db !== 0) return db
    return a.score - b.score
  })
}

export function filterSitesByCounty(
  sites: readonly GotvSiteRollup[],
  countyId: string | null,
): GotvSiteRollup[] {
  if (!countyId) return [...sites]
  return sites.filter((s) => s.county_id === countyId)
}

export function groupRollupsByCounty(
  sites: readonly GotvSiteRollup[],
): Map<string | null, GotvSiteRollup[]> {
  const m = new Map<string | null, GotvSiteRollup[]>()
  for (const s of sites) {
    const k = s.county_id
    const cur = m.get(k) ?? []
    cur.push(s)
    m.set(k, cur)
  }
  return m
}
