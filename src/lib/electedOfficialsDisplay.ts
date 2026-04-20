/**
 * Display helpers for elected-official UIs. Officeholder names come from the
 * `public-officials` Netlify function (Google Civic / Open States), not scraping.
 * District numbers come from the voter file (raw_vr / match).
 */

import type { PublicOfficialEntry } from './api/publicOfficials'

/** Normalize VR congressional district to display e.g. AR-02 */
export function formatArkansasUsHouseCode(raw: string | null | undefined): string {
  const s = String(raw ?? '').replace(/\D/g, '')
  if (!s) return '—'
  const n = parseInt(s, 10)
  if (Number.isNaN(n)) return '—'
  const two = n >= 100 ? String(n).padStart(3, '0') : String(n).padStart(2, '0')
  return `AR-${two.slice(-2)}`
}

export function formatArkansasStateSenateDistrict(raw: string | null | undefined): string {
  const s = String(raw ?? '').replace(/\D/g, '')
  if (!s) return '—'
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? '—' : `SD ${n}`
}

export function formatArkansasStateHouseDistrict(raw: string | null | undefined): string {
  const s = String(raw ?? '').replace(/\D/g, '')
  if (!s) return '—'
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? '—' : `HD ${n}`
}

export type ElectedOfficeBucket =
  | 'federal_legislature'
  | 'federal_executive'
  | 'state_executive'
  | 'state_legislature'
  | 'local'
  | 'other'

const BUCKET_ORDER: ElectedOfficeBucket[] = [
  'federal_executive',
  'federal_legislature',
  'state_executive',
  'state_legislature',
  'local',
  'other',
]

/** Classify Google Civic / Open States office title for dashboard grouping. */
export function bucketForOfficialOffice(office: string): ElectedOfficeBucket {
  const o = office.toLowerCase()

  if (
    o.includes('president') ||
    o.includes('vice president') ||
    o.includes('united states executive')
  ) {
    return 'federal_executive'
  }
  if (o.includes('united states') && o.includes('senate')) return 'federal_legislature'

  if (
    o.includes('u.s. senate') ||
    o.includes('united states senate') ||
    o.includes('u.s. house') ||
    o.includes('united states house') ||
    o.includes('u.s. representative') ||
    (o.includes('representative') && o.includes('united states'))
  ) {
    return 'federal_legislature'
  }

  if (
    o.includes('governor') ||
    o.includes('secretary of state') ||
    o.includes('attorney general') ||
    o.includes('treasurer') ||
    o.includes('auditor') ||
    o.includes('commissioner of state lands') ||
    o.includes('lieutenant governor') ||
    o.includes('lt. governor') ||
    o.includes('lt governor') ||
    (o.includes('arkansas') &&
      (o.includes('supreme court') || o.includes('chief justice')) &&
      !o.includes('circuit'))
  ) {
    return 'state_executive'
  }

  if (
    o.includes('state senate') ||
    o.includes('state house') ||
    (o.includes('general assembly') && (o.includes('house') || o.includes('senate'))) ||
    (o.includes('district') && o.includes('representative') && !o.includes('united states'))
  ) {
    return 'state_legislature'
  }

  if (
    o.includes('county') ||
    o.includes('municipal') ||
    o.includes('city') ||
    o.includes('mayor') ||
    o.includes('justice of the peace') ||
    o.includes('quorum court')
  ) {
    return 'local'
  }

  return 'other'
}

const BUCKET_LABEL: Record<ElectedOfficeBucket, string> = {
  federal_executive: 'Federal (executive)',
  federal_legislature: 'Federal (Congress)',
  state_executive: 'Arkansas statewide & constitutional',
  state_legislature: 'Arkansas General Assembly',
  local: 'Local & county',
  other: 'Other offices',
}

export function bucketLabel(bucket: ElectedOfficeBucket): string {
  return BUCKET_LABEL[bucket]
}

export type GroupedOfficials = Record<ElectedOfficeBucket, PublicOfficialEntry[]>

export function groupOfficialsByBucket(entries: readonly PublicOfficialEntry[]): GroupedOfficials {
  const out: GroupedOfficials = {
    federal_executive: [],
    federal_legislature: [],
    state_executive: [],
    state_legislature: [],
    local: [],
    other: [],
  }
  const seen = new Set<string>()
  for (const e of entries) {
    const k = `${e.office.trim().toLowerCase()}|${e.name.trim().toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    out[bucketForOfficialOffice(e.office)].push(e)
  }
  for (const b of BUCKET_ORDER) {
    out[b].sort((a, b) => a.office.localeCompare(b.office) || a.name.localeCompare(b.name))
  }
  return out
}

export function sortBucketKeysForDisplay(): ElectedOfficeBucket[] {
  return [...BUCKET_ORDER]
}
