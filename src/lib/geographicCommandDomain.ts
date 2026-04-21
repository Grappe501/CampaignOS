/**
 * Geographic Command Layer — canonical types and labels (field control, no map server).
 */

export type GeoUnitKind = 'county' | 'precinct' | 'district' | 'neighborhood' | 'campaign_wide'

/** Saturation proxy from event counts in a sliding window (not RSVP capacity). */
export type GeoSaturationBand = 'low' | 'medium' | 'high'

/** Coarse pressure for sorting and UI chrome. */
export type GeoPressureBand = 'stable' | 'watch' | 'critical'

export function saturationBandFromCount(upcomingInWindow: number): GeoSaturationBand {
  if (upcomingInWindow >= 9) return 'high'
  if (upcomingInWindow >= 4) return 'medium'
  return 'low'
}

export function pressureBandFromScore(score0_100: number): GeoPressureBand {
  if (score0_100 >= 72) return 'critical'
  if (score0_100 >= 44) return 'watch'
  return 'stable'
}

export function formatGeoAreaLabel(input: {
  county_id: string | null
  precinct_id?: string | null
}): string {
  const c = input.county_id?.replace(/-/g, ' ').trim()
  const p = input.precinct_id?.replace(/-/g, ' ').trim()
  if (c && p) return `${c} · ${p}`
  if (c) return c
  if (p) return `Precinct ${p}`
  return 'Unspecified geography'
}
