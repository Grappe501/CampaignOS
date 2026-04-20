/**
 * Netlify `public-officials` — Google Civic representatives for a voter address.
 * Same-origin in production; set VITE_NETLIFY_FUNCTIONS_ORIGIN for netlify dev + Vite.
 */

import type { MatchedVoterDisplayRow } from '../voterMatch'
import { getNetlifyFunctionsOrigin } from './agentJones'

export type PublicOfficialAddress = {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zip?: string
}

export type PublicOfficialChannel = {
  type?: string
  id?: string
}

export type PublicOfficialEntry = {
  office: string
  name: string
  party?: string
  phones?: string[]
  urls?: string[]
  emails?: string[]
  photoUrl?: string
  levels?: string[]
  channels?: PublicOfficialChannel[]
  addresses?: PublicOfficialAddress[]
}

export type DistrictOfficialsMap = {
  usHouse: PublicOfficialEntry | null
  stateSenate: PublicOfficialEntry | null
  stateHouse: PublicOfficialEntry | null
}

export type PublicOfficialsResponse = {
  ok: boolean
  error?: string | null
  source?: string
  addressUsed?: string
  officials: PublicOfficialEntry[]
  districtOfficials: DistrictOfficialsMap
  message?: string
}

const emptyDistricts = (): DistrictOfficialsMap => ({
  usHouse: null,
  stateSenate: null,
  stateHouse: null,
})

function parseOfficialEntry(raw: unknown): PublicOfficialEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const office = typeof o.office === 'string' ? o.office.trim() : ''
  if (!name || !office) return null
  return o as PublicOfficialEntry
}

function parseDistrictOfficials(data: Record<string, unknown>): DistrictOfficialsMap {
  const d = data.districtOfficials
  if (!d || typeof d !== 'object') return emptyDistricts()
  const r = d as Record<string, unknown>
  return {
    usHouse: parseOfficialEntry(r.usHouse),
    stateSenate: parseOfficialEntry(r.stateSenate),
    stateHouse: parseOfficialEntry(r.stateHouse),
  }
}

/** Dedupe key for officials list display. */
function officialKey(e: Pick<PublicOfficialEntry, 'office' | 'name'>): string {
  return `${e.office.trim().toLowerCase()}|${e.name.trim().toLowerCase()}`
}

/**
 * Merge district-highlighted officials with full Civic/Open States list for header/UI.
 * District slots appear first (US House, state senate, state house), then remaining rows.
 */
export function buildExpandedOfficialsList(
  districtOfficials: DistrictOfficialsMap | null | undefined,
  officials: PublicOfficialEntry[] | undefined,
): PublicOfficialEntry[] {
  const seen = new Set<string>()
  const out: PublicOfficialEntry[] = []

  const push = (e: PublicOfficialEntry | null | undefined) => {
    if (!e?.name?.trim() || !e.office?.trim()) return
    const k = officialKey(e)
    if (seen.has(k)) return
    seen.add(k)
    out.push(e)
  }

  const d = districtOfficials
  if (d) {
    push(d.usHouse)
    push(d.stateSenate)
    push(d.stateHouse)
  }
  for (const e of officials ?? []) {
    push(e)
  }
  return out
}

export function getPublicOfficialsEndpointUrl(): string {
  const origin = getNetlifyFunctionsOrigin()
  const path = '/.netlify/functions/public-officials'
  return origin ? `${origin}${path}` : path
}

export function buildPublicOfficialsPayload(voter: MatchedVoterDisplayRow): {
  city: string
  state: string
  zip: string
} {
  return {
    city: voter.res_city?.trim() ?? '',
    state: voter.res_state?.trim() ?? '',
    zip: voter.res_zip5?.trim() ?? '',
  }
}

export async function fetchPublicOfficials(
  voter: MatchedVoterDisplayRow,
): Promise<PublicOfficialsResponse> {
  const url = getPublicOfficialsEndpointUrl()
  const body = buildPublicOfficialsPayload(voter)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return {
      ok: false,
      error: 'http_error',
      officials: [],
      districtOfficials: emptyDistricts(),
      message: `Representatives service HTTP ${res.status}. For local dev run Netlify functions (e.g. netlify dev on port 8888) or set VITE_NETLIFY_FUNCTIONS_ORIGIN.`,
    }
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return {
      ok: false,
      error: 'invalid_response',
      officials: [],
      districtOfficials: emptyDistricts(),
      message: 'Could not read representatives response.',
    }
  }

  const o = data as Record<string, unknown>
  const officials = Array.isArray(o.officials)
    ? (o.officials as PublicOfficialEntry[]).filter(
        (e) => e && typeof e.name === 'string' && e.name.trim() !== '',
      )
    : []

  return {
    ok: Boolean(o.ok),
    error: typeof o.error === 'string' ? o.error : o.error != null ? String(o.error) : null,
    source: typeof o.source === 'string' ? o.source : undefined,
    addressUsed: typeof o.addressUsed === 'string' ? o.addressUsed : undefined,
    officials,
    districtOfficials: parseDistrictOfficials(o),
    message: typeof o.message === 'string' ? o.message : undefined,
  }
}
