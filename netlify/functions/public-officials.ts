type NetlifyEvent = {
  httpMethod: string
  headers: Record<string, string | undefined>
  body?: string
}

type NetlifyResponse = {
  statusCode: number
  headers?: Record<string, string>
  body?: string
}

type CivicOffice = {
  name?: string
  divisionId?: string
  levels?: string[]
  roles?: string[]
  officialIndices?: number[]
}

type CivicAddress = {
  line1?: string
  line2?: string
  line3?: string
  city?: string
  state?: string
  zip?: string
}

type CivicOfficial = {
  name?: string
  address?: CivicAddress[]
  party?: string
  phones?: string[]
  urls?: string[]
  photoUrl?: string
  emails?: string[]
  channels?: Array<{ type?: string; id?: string }>
}

type CivicRepresentativesResponse = {
  offices?: CivicOffice[]
  officials?: CivicOfficial[]
  error?: { message?: string; code?: number }
}

export type PublicOfficialAddress = {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zip?: string
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
  channels?: Array<{ type?: string; id?: string }>
  addresses?: PublicOfficialAddress[]
}

type DistrictSlotKey = 'usHouse' | 'stateSenate' | 'stateHouse'

type DistrictOfficialsMap = {
  usHouse: PublicOfficialEntry | null
  stateSenate: PublicOfficialEntry | null
  stateHouse: PublicOfficialEntry | null
}

function corsHeaders(event: NetlifyEvent): Record<string, string> {
  const origin = event.headers.origin || event.headers.Origin || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(
  event: NetlifyEvent,
  status: number,
  payload: Record<string, unknown>,
): NetlifyResponse {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event),
    },
    body: JSON.stringify(payload),
  }
}

function levelRank(levels: string[] | undefined): number {
  if (!levels?.length) return 99
  const order = [
    'country',
    'administrativeArea1',
    'administrativeArea2',
    'locality',
    'subLocality1',
    'subLocality2',
  ]
  let best = 99
  for (const l of levels) {
    const i = order.indexOf(l)
    if (i >= 0 && i < best) best = i
  }
  return best
}

function toPublicEntry(
  officeTitle: string,
  levels: string[] | undefined,
  o: CivicOfficial,
): PublicOfficialEntry {
  const addresses = o.address
    ?.map((a) => ({
      line1: a.line1?.trim() || undefined,
      line2: a.line2?.trim() || undefined,
      city: a.city?.trim() || undefined,
      state: a.state?.trim() || undefined,
      zip: a.zip?.trim() || undefined,
    }))
    .filter((a) => a.line1 || a.city || a.state || a.zip)

  return {
    office: officeTitle.trim() || 'Office',
    name: o.name!.trim(),
    party: o.party?.trim() || undefined,
    phones: o.phones?.filter(Boolean),
    urls: o.urls?.filter(Boolean),
    emails: o.emails?.filter((e) => Boolean(e && String(e).trim())) as string[] | undefined,
    photoUrl: o.photoUrl?.trim() || undefined,
    levels: levels?.length ? [...levels] : undefined,
    channels: o.channels
      ?.filter((c) => c?.id && String(c.id).trim())
      .map((c) => ({ type: c.type, id: String(c.id).trim() })),
    addresses: addresses?.length ? addresses : undefined,
  }
}

function classifyDistrictSlot(
  officeName: string | undefined,
  levels?: string[],
): DistrictSlotKey | null {
  const o = (officeName ?? '').toLowerCase()
  const hasCountry = levels?.includes('country')
  const hasState = levels?.includes('administrativeArea1')

  if (o.includes('state senate')) return 'stateSenate'

  const usHouse =
    hasCountry &&
    (o.includes('united states house') ||
      o.includes('u.s. house') ||
      o.includes('u.s. representative') ||
      (o.includes('house of representatives') && o.includes('united states')))

  if (usHouse) return 'usHouse'

  const stateHouse =
    hasState &&
    !o.includes('state senate') &&
    !o.includes('united states') &&
    !o.includes('u.s. senate') &&
    (o.includes('house of representatives') ||
      o.includes('state house') ||
      (/\bgeneral assembly\b/.test(o) && /\bhouse\b/.test(o)))

  if (stateHouse) return 'stateHouse'

  if (!hasState && (o.includes('u.s. house') || o.includes('u.s. representative')))
    return 'usHouse'

  return null
}

function pickDistrictOfficials(data: CivicRepresentativesResponse): DistrictOfficialsMap {
  const offices = data.offices ?? []
  const officials = data.officials ?? []
  const out: DistrictOfficialsMap = {
    usHouse: null,
    stateSenate: null,
    stateHouse: null,
  }

  for (const office of offices) {
    const slot = classifyDistrictSlot(office.name, office.levels)
    if (!slot || out[slot]) continue
    const indices = office.officialIndices ?? []
    for (const idx of indices) {
      const raw = officials[idx]
      if (!raw?.name?.trim()) continue
      out[slot] = toPublicEntry(office.name ?? 'Office', office.levels, raw)
      break
    }
  }

  return out
}

function normalizeFromCivic(data: CivicRepresentativesResponse): PublicOfficialEntry[] {
  const offices = data.offices ?? []
  const officials = data.officials ?? []
  const out: PublicOfficialEntry[] = []

  for (const office of offices) {
    const title = office.name?.trim() || 'Office'
    const indices = office.officialIndices ?? []
    const levels = office.levels

    for (const idx of indices) {
      const o = officials[idx]
      if (!o?.name?.trim()) continue
      out.push(toPublicEntry(title, levels, o))
    }
  }

  out.sort((a, b) => {
    const ra = levelRank(a.levels)
    const rb = levelRank(b.levels)
    if (ra !== rb) return ra - rb
    return a.office.localeCompare(b.office)
  })

  return out
}

function emptyDistrictOfficials(): DistrictOfficialsMap {
  return {
    usHouse: null,
    stateSenate: null,
    stateHouse: null,
  }
}

/** Prefer dedicated Civic key; fall back to GOOGLE_API_KEY if Civic API is enabled on that key. */
function googleCivicApiKey(): string {
  return (
    process.env.GOOGLE_CIVIC_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ''
  )
}

async function geocodeToLatLng(
  addressLine: string,
): Promise<{ lat: number; lng: number } | null> {
  const oc = process.env.OPENCAGE_API_KEY?.trim()
  if (oc) {
    try {
      const u = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(addressLine)}&key=${encodeURIComponent(oc)}&limit=1`
      const r = await fetch(u)
      const j = (await r.json()) as {
        results?: Array<{ geometry?: { lat?: number; lng?: number } }>
      }
      const geo = j.results?.[0]?.geometry
      if (geo?.lat != null && geo?.lng != null) {
        return { lat: Number(geo.lat), lng: Number(geo.lng) }
      }
    } catch {
      /* try Google Geocoding */
    }
  }
  const gk = process.env.GOOGLE_API_KEY?.trim()
  if (gk) {
    try {
      const u = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressLine)}&key=${encodeURIComponent(gk)}`
      const r = await fetch(u)
      const j = (await r.json()) as {
        results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>
      }
      const loc = j.results?.[0]?.geometry?.location
      if (loc?.lat != null && loc?.lng != null) {
        return { lat: Number(loc.lat), lng: Number(loc.lng) }
      }
    } catch {
      /* noop */
    }
  }
  return null
}

type OsPersonRaw = {
  name?: string
  party?: string
  image?: string
  contact_details?: Array<{ type?: string; value?: string }>
  current_role?: {
    title?: string
    district?: string | number
    org_classification?: string
  }
}

function extractContactFields(
  person: OsPersonRaw,
): Pick<PublicOfficialEntry, 'phones' | 'urls' | 'emails'> {
  const phones: string[] = []
  const urls: string[] = []
  const emails: string[] = []
  for (const c of person.contact_details ?? []) {
    const t = String(c.type ?? '').toLowerCase()
    const v = String(c.value ?? '').trim()
    if (!v) continue
    if (t.includes('voice') || t === 'phone') phones.push(v)
    else if (t.includes('email')) emails.push(v)
    else if (t.includes('url') || t.includes('website')) urls.push(v)
  }
  return {
    phones: phones.length ? phones : undefined,
    urls: urls.length ? urls : undefined,
    emails: emails.length ? emails : undefined,
  }
}

function openStatesPersonToEntry(person: OsPersonRaw): PublicOfficialEntry | null {
  const name = typeof person.name === 'string' ? person.name.trim() : ''
  if (!name) return null
  const role = person.current_role
  const title =
    typeof role?.title === 'string' && role.title.trim()
      ? role.title.trim()
      : 'Legislator'
  const d = role?.district
  const districtLabel =
    d != null && String(d).trim() ? ` — District ${String(d).trim()}` : ''
  const office = `${title}${districtLabel}`
  const party = typeof person.party === 'string' ? person.party.trim() : undefined
  const { phones, urls, emails } = extractContactFields(person)
  const photoUrl = typeof person.image === 'string' ? person.image.trim() : undefined
  return {
    office,
    name,
    party: party || undefined,
    phones,
    urls,
    emails,
    photoUrl: photoUrl || undefined,
  }
}

function normalizeOpenStatesGeoPayload(data: unknown): PublicOfficialEntry[] {
  const rawList: unknown[] = []
  if (Array.isArray(data)) rawList.push(...data)
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const k of ['results', 'items', 'people']) {
      const v = o[k]
      if (Array.isArray(v)) {
        rawList.push(...v)
        break
      }
    }
  }
  const out: PublicOfficialEntry[] = []
  for (const row of rawList) {
    let person: unknown = row
    if (row && typeof row === 'object' && 'person' in row) {
      person = (row as { person: unknown }).person
    }
    if (!person || typeof person !== 'object') continue
    const e = openStatesPersonToEntry(person as OsPersonRaw)
    if (e) out.push(e)
  }
  out.sort((a, b) => a.office.localeCompare(b.office))
  return out
}

function districtSlotsFromOpenStatesEntries(
  entries: PublicOfficialEntry[],
): DistrictOfficialsMap {
  const out = emptyDistrictOfficials()
  for (const e of entries) {
    const o = e.office.toLowerCase()
    const isFederal =
      o.includes('united states') || o.includes('u.s.') || o.includes('congress')
    if (isFederal) continue
    const isSenate = o.includes('senate')
    const isHouse =
      o.includes('house') ||
      o.includes('assembly') ||
      (o.includes('delegate') && !o.includes('delegation'))

    if (isSenate && !out.stateSenate) {
      out.stateSenate = e
    } else if (isHouse && !isSenate && !out.stateHouse) {
      out.stateHouse = e
    }
  }
  return out
}

async function fetchOpenStatesGeoPeople(
  apiKey: string,
  lat: number,
  lng: number,
): Promise<PublicOfficialEntry[]> {
  const u = `https://v3.openstates.org/people.geo?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  const r = await fetch(u, { headers: { 'X-API-KEY': apiKey } })
  const text = await r.text()
  let data: unknown
  try {
    data = JSON.parse(text) as unknown
  } catch {
    return []
  }
  if (!r.ok) {
    return []
  }
  return normalizeOpenStatesGeoPayload(data)
}

async function tryGoogleCivic(
  apiKey: string,
  addressLine: string,
): Promise<
  | { ok: true; officials: PublicOfficialEntry[]; districtOfficials: DistrictOfficialsMap }
  | { ok: false; error: string; message: string }
> {
  const addressParam = encodeURIComponent(addressLine)
  const url = `https://www.googleapis.com/civicinfo/v2/representatives?address=${addressParam}&key=${encodeURIComponent(apiKey)}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: 'upstream_fetch_failed', message: msg }
  }

  const rawText = await res.text()
  let civic: CivicRepresentativesResponse
  try {
    civic = JSON.parse(rawText) as CivicRepresentativesResponse
  } catch {
    return { ok: false, error: 'upstream_invalid_json', message: rawText.slice(0, 200) }
  }

  if (!res.ok) {
    const gErr = civic.error?.message || rawText.slice(0, 300)
    return {
      ok: false,
      error: 'civic_api_error',
      message: gErr || `HTTP ${res.status}`,
    }
  }

  const officials = normalizeFromCivic(civic)
  const districtOfficials = pickDistrictOfficials(civic)
  return { ok: true, officials, districtOfficials }
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) }
  }

  if (event.httpMethod !== 'POST') {
    return json(event, 405, {
      ok: false,
      error: 'method_not_allowed',
      officials: [] as PublicOfficialEntry[],
      districtOfficials: emptyDistrictOfficials(),
    })
  }

  const civicKey = googleCivicApiKey()
  const osKey = process.env.OPENSTATES_API_KEY?.trim() || ''

  if (!civicKey && !osKey) {
    return json(event, 200, {
      ok: false,
      error: 'not_configured',
      officials: [] as PublicOfficialEntry[],
      districtOfficials: emptyDistrictOfficials(),
      message:
        'Set GOOGLE_CIVIC_API_KEY or GOOGLE_API_KEY (Civic Information API enabled), and/or OPENSTATES_API_KEY with OPENCAGE_API_KEY or Geocoding-enabled GOOGLE_API_KEY. Never expose keys to the browser.',
    })
  }

  let parsed: unknown
  try {
    parsed = event.body ? JSON.parse(event.body) : {}
  } catch {
    return json(event, 400, {
      ok: false,
      error: 'invalid_json',
      officials: [] as PublicOfficialEntry[],
      districtOfficials: emptyDistrictOfficials(),
    })
  }

  const body = parsed as Record<string, unknown>
  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const state = typeof body.state === 'string' ? body.state.trim() : ''
  const zip = typeof body.zip === 'string' ? body.zip.trim() : ''

  const addressLine = [city, state, zip].filter(Boolean).join(' ')
  if (!addressLine) {
    return json(event, 200, {
      ok: false,
      error: 'insufficient_address',
      officials: [] as PublicOfficialEntry[],
      districtOfficials: emptyDistrictOfficials(),
      message: 'Need at least city, state, or ZIP from the matched voter record.',
    })
  }

  let lastMessage: string | undefined

  if (civicKey) {
    const civicTry = await tryGoogleCivic(civicKey, addressLine)
    if (civicTry.ok && civicTry.officials.length > 0) {
      return json(event, 200, {
        ok: true,
        error: null,
        source: 'google_civic',
        addressUsed: addressLine,
        officials: civicTry.officials,
        districtOfficials: civicTry.districtOfficials,
      })
    }
    if (!civicTry.ok) {
      lastMessage = civicTry.message
    }
  }

  if (osKey) {
    const ll = await geocodeToLatLng(addressLine)
    if (ll) {
      const osOfficials = await fetchOpenStatesGeoPeople(osKey, ll.lat, ll.lng)
      if (osOfficials.length > 0) {
        return json(event, 200, {
          ok: true,
          error: null,
          source: 'openstates_geo',
          addressUsed: addressLine,
          officials: osOfficials,
          districtOfficials: districtSlotsFromOpenStatesEntries(osOfficials),
        })
      }
      lastMessage = lastMessage || 'Open States returned no legislators for this location.'
    } else {
      lastMessage =
        lastMessage ||
        'Geocoding failed. Add OPENCAGE_API_KEY or enable Geocoding on GOOGLE_API_KEY for Open States fallback.'
    }
  }

  return json(event, 200, {
    ok: false,
    error: 'no_officials',
    officials: [] as PublicOfficialEntry[],
    districtOfficials: emptyDistrictOfficials(),
    message:
      lastMessage ||
      'No representatives found. Confirm voter city/state/ZIP and API keys (see docs/campaign-api-keys.md).',
  })
}
