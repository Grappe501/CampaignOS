/**
 * Mobilize Pass 2 — server-only helpers (mirrors client eligibility + sync hash in src/lib/mobilizeFieldMapping.ts).
 * Self-contained: do not import from src/ (Netlify function bundles may not include the app tree).
 */

export const MOBILIZE_API_BASE = 'https://api.mobilize.us/v1'

/** Mirrors MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS in src/lib/mobilizeIntegration.ts */
const MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS = [
  'public_fair_festival',
  'house_party_intro_candidate',
  'campaign_rally',
  'county_party_meeting',
  'volunteer_recruitment_event',
  'early_vote_rally',
] as const

/** Row shape from `campaign_events` (Supabase). */
export type CampaignEventDbRow = {
  id: string
  title: string
  event_type: string
  public_title: string | null
  public_description: string | null
  public_instructions: string | null
  public_contact_name: string | null
  public_contact_email: string | null
  status: string
  staffing_state: string
  visibility_scope: string
  finance_related: boolean
  venue_name: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  virtual_url: string | null
  timezone: string | null
  start_at: string
  end_at: string | null
}

const APPROVED_LIKE = new Set([
  'approved',
  'scheduled',
  'published_internal',
  'published_public',
])

const PUBLIC_VISIBILITY_FOR_MOBILIZE = new Set([
  'public_visible',
  'volunteer_visible',
  'field_team',
])

const BLOCKED_VISIBILITY_FOR_MOBILIZE = new Set([
  'internal_staff',
  'leadership_only',
  'finance_private',
])

const MOBILIZE_TIMEZONES = new Set([
  'America/New_York',
  'Pacific/Honolulu',
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
])

const MOBILIZE_TAG_MAPPINGS: readonly {
  eventTypeSlug: string
  defaultMobilizeTags: string[]
  optionalMobilizeTags?: string[]
}[] = [
  {
    eventTypeSlug: 'public_fair_festival',
    defaultMobilizeTags: ['community-event', 'volunteer', 'public'],
    optionalMobilizeTags: ['canvass', 'visibility'],
  },
  {
    eventTypeSlug: 'house_party_intro_candidate',
    defaultMobilizeTags: ['meet-the-candidate', 'community'],
    optionalMobilizeTags: ['house-party'],
  },
  {
    eventTypeSlug: 'campaign_rally',
    defaultMobilizeTags: ['rally', 'public', 'volunteer'],
    optionalMobilizeTags: ['visibility'],
  },
  {
    eventTypeSlug: 'county_party_meeting',
    defaultMobilizeTags: ['party-meeting', 'community'],
    optionalMobilizeTags: ['county'],
  },
  {
    eventTypeSlug: 'volunteer_recruitment_event',
    defaultMobilizeTags: ['volunteer', 'training'],
    optionalMobilizeTags: ['community-event'],
  },
  {
    eventTypeSlug: 'early_vote_rally',
    defaultMobilizeTags: ['early-vote', 'gotv', 'public'],
    optionalMobilizeTags: ['visibility'],
  },
]

function resolveMobilizeTagsForEventType(eventTypeSlug: string): string[] {
  const m = MOBILIZE_TAG_MAPPINGS.find((x) => x.eventTypeSlug === eventTypeSlug)
  if (!m) return []
  const opt = m.optionalMobilizeTags ?? []
  return [...new Set([...m.defaultMobilizeTags, ...opt.slice(0, 2)])]
}

export type MobilizeEligibilityInput = {
  event_type: string
  stage_status: string | null
  visibility_scope: string | null
  title: string | null
  start_at: string | null
  venue_name: string | null
  address_or_virtual: string | null
  staffing_state: string | null
}

export function eligibilityInputFromDbRow(row: CampaignEventDbRow): MobilizeEligibilityInput {
  return {
    event_type: row.event_type,
    stage_status: row.status,
    visibility_scope: row.visibility_scope,
    title: row.title,
    start_at: row.start_at,
    venue_name: row.venue_name,
    address_or_virtual: addressOrVirtualForSync(row),
    staffing_state: row.staffing_state,
  }
}

function isPublishableTypeKey(t: string): boolean {
  return (MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS as readonly string[]).includes(t)
}

function hasVenueOrAddress(input: MobilizeEligibilityInput): boolean {
  const v = (input.venue_name ?? '').trim()
  const a = (input.address_or_virtual ?? '').trim()
  if (a.length > 0) return true
  if (v.length > 0 && v.toUpperCase() !== 'TBD') return true
  return false
}

function validStart(input: MobilizeEligibilityInput): boolean {
  if (!input.start_at) return false
  return !Number.isNaN(new Date(input.start_at).getTime())
}

/** Base six-rule engine (mirrors src/lib/mobilizePublishEligibility.ts). */
export function evaluateBaseMobilizePublishRules(input: MobilizeEligibilityInput): {
  eligible: boolean
  blockers: string[]
} {
  const blockers: string[] = []

  const approved = input.stage_status != null && APPROVED_LIKE.has(input.stage_status)
  if (!approved) blockers.push(`Stage “${input.stage_status ?? 'unknown'}” is not approved-like.`)

  const titleOk = (input.title ?? '').trim().length > 0
  const fieldsOk = titleOk && validStart(input)
  if (!fieldsOk) blockers.push('Title and valid start time are required.')

  const vis = input.visibility_scope ?? ''
  const visibilityOk =
    !BLOCKED_VISIBILITY_FOR_MOBILIZE.has(vis) &&
    (PUBLIC_VISIBILITY_FOR_MOBILIZE.has(vis) || vis === 'county_specific' || vis === 'precinct_specific')
  if (!visibilityOk) blockers.push(`Visibility “${vis || 'unset'}” is not public-promotable.`)

  const venueOk = validStart(input) && hasVenueOrAddress(input)
  if (!venueOk) blockers.push('Venue or address and start time must be present.')

  const typeOk = isPublishableTypeKey(input.event_type)
  if (!typeOk) blockers.push(`Event type “${input.event_type}” is not in the default publishable set.`)

  const staff = input.staffing_state ?? ''
  const staffingOk = staff !== 'unstaffed' && staff !== 'at_risk'
  if (!staffingOk) blockers.push(`Staffing state “${staff || 'unset'}” must be resolved before promotion.`)

  return { eligible: blockers.length === 0, blockers }
}

/**
 * Extended eligibility (mirrors buildMobilizeEligibility): finance + public copy + Mobilize postal gate for in-person.
 */
export function buildServerMobilizeEligibility(row: CampaignEventDbRow): {
  isEligible: boolean
  blockingReasons: string[]
} {
  const input = eligibilityInputFromDbRow(row)
  const base = evaluateBaseMobilizePublishRules(input)
  const blockingReasons = [...base.blockers]
  let isEligible = base.eligible

  if (row.finance_related && isEligible) {
    isEligible = false
    blockingReasons.push(
      'Finance-flagged events are not published to Mobilize under default policy.',
    )
  }

  const hasPublicCopy = (row.public_description ?? '').trim().length > 0
  if (isEligible && !hasPublicCopy) {
    isEligible = false
    blockingReasons.push(
      'Public-facing description is required before Mobilize publish (use public description fields).',
    )
  }

  const virtual = isVirtualEvent(row)
  if (isEligible && !virtual) {
    const pc = (row.postal_code ?? '').trim()
    if (!pc) {
      isEligible = false
      blockingReasons.push(
        'Mobilize requires postal_code on the location object for in-person events — set postal_code (or use a virtual event with virtual_url).',
      )
    }
  }

  return { isEligible, blockingReasons }
}

export function combinedPhysicalAddress(row: CampaignEventDbRow): string {
  const parts = [row.address_line_1, row.address_line_2, row.city, row.state, row.postal_code]
    .map((x) => (x ?? '').trim())
    .filter((x) => x.length > 0)
  return parts.join(', ')
}

/** Aligns with client `address_or_virtual` / publish payload address. */
export function addressOrVirtualForSync(row: CampaignEventDbRow): string | null {
  const vu = (row.virtual_url ?? '').trim()
  const phys = combinedPhysicalAddress(row).trim()
  if (phys.length > 0) return phys
  if (vu.length > 0) return vu
  return null
}

export function isVirtualEvent(row: CampaignEventDbRow): boolean {
  const vu = (row.virtual_url ?? '').trim()
  const phys = combinedPhysicalAddress(row).trim()
  return vu.length > 0 && phys.length === 0
}

function hash32(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Mirrors computeMobilizeSyncHash / buildMobilizePublishPayload in src/lib/mobilizeFieldMapping.ts */
export function computeMobilizeSyncHash(row: CampaignEventDbRow): string {
  const title = (row.public_title ?? row.title).trim()
  const description = (row.public_description ?? '').trim()
  const startAt = new Date(row.start_at).toISOString()
  const endAt = row.end_at ? new Date(row.end_at).toISOString() : null
  const timezone = row.timezone?.trim() || null
  const locationName = row.venue_name ?? null
  const address = addressOrVirtualForSync(row)
  const tags = [...resolveMobilizeTagsForEventType(row.event_type)].sort()
  const publicInstructions = (row.public_instructions ?? '').trim() || null

  const stable = JSON.stringify({
    title,
    description,
    startAt,
    endAt,
    timezone,
    locationName,
    address,
    tags,
    publicInstructions,
  })
  return hash32(stable)
}

const EVENT_TYPE_TO_MOBILIZE: Record<string, string> = {
  public_fair_festival: 'VISIBILITY_EVENT',
  house_party_intro_candidate: 'HOUSE_PARTY',
  campaign_rally: 'RALLY',
  county_party_meeting: 'MEETING',
  volunteer_recruitment_event: 'VISIBILITY_EVENT',
  early_vote_rally: 'RALLY',
  community_listening_session: 'MEETING',
  gotv_staging_event: 'MEETING',
}

export function mapCampaignEventTypeToMobilizeApi(eventType: string): string | null {
  return EVENT_TYPE_TO_MOBILIZE[eventType] ?? null
}

export function resolveMobilizeVisibility(scope: string): 'PUBLIC' | 'PRIVATE' {
  const s = scope.trim()
  if (
    PUBLIC_VISIBILITY_FOR_MOBILIZE.has(s) ||
    s === 'county_specific' ||
    s === 'precinct_specific'
  ) {
    return 'PUBLIC'
  }
  return 'PRIVATE'
}

export function normalizeMobilizeTimezone(tz: string | null | undefined, fallback: string): string {
  const raw = (tz ?? '').trim()
  if (raw && MOBILIZE_TIMEZONES.has(raw)) return raw
  if (fallback && MOBILIZE_TIMEZONES.has(fallback)) return fallback
  return 'America/Chicago'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function descriptionToMobilizeHtml(plain: string): string {
  const t = plain.trim()
  if (!t) return '<p></p>'
  if (/</.test(t) && />/.test(t)) return t
  return `<p>${escapeHtml(t)}</p>`
}

export function unixRangeForEvent(row: CampaignEventDbRow): { start: number; end: number } {
  const startMs = new Date(row.start_at).getTime()
  const endMs = row.end_at ? new Date(row.end_at).getTime() : startMs + 2 * 60 * 60 * 1000
  if (Number.isNaN(startMs)) throw new Error('invalid_start_at')
  const end = Number.isNaN(endMs) ? startMs + 2 * 60 * 60 * 1000 : Math.max(endMs, startMs + 60 * 1000)
  return { start: Math.floor(startMs / 1000), end: Math.floor(end / 1000) }
}

export type MobilizeEventApiBody = Record<string, unknown>

export function buildMobilizeCreateBody(
  row: CampaignEventDbRow,
  opts: { defaultContactEmail: string; defaultTimezone: string },
): { body: MobilizeEventApiBody; error?: string } {
  const eventType = mapCampaignEventTypeToMobilizeApi(row.event_type)
  if (!eventType) {
    return { body: {}, error: `No Mobilize API event_type mapping for “${row.event_type}”.` }
  }

  const email = (row.public_contact_email ?? '').trim() || opts.defaultContactEmail.trim()
  if (!email) {
    return {
      body: {},
      error:
        'Mobilize requires contact.email_address — set public_contact_email on the event or MOBILIZE_DEFAULT_CONTACT_EMAIL on the server.',
    }
  }

  const { start, end } = unixRangeForEvent(row)
  const tz = normalizeMobilizeTimezone(row.timezone, opts.defaultTimezone)
  const visibility = resolveMobilizeVisibility(row.visibility_scope)
  const virtual = isVirtualEvent(row)

  const title = (row.public_title ?? row.title).trim()
  const description = descriptionToMobilizeHtml((row.public_description ?? '').trim())
  const instructions = (row.public_instructions ?? '').trim() || undefined

  const base: MobilizeEventApiBody = {
    title,
    description,
    timeslots: [{ start_date: start, end_date: end }],
    timezone: tz,
    event_type: eventType,
    visibility,
    contact: {
      name: (row.public_contact_name ?? '').trim() || '',
      email_address: email,
      phone_number: '',
    },
  }

  if (instructions) base.instructions = instructions

  if (virtual) {
    base.is_virtual = true
    const u = (row.virtual_url ?? '').trim()
    if (u) base.virtual_action_url = u
  } else {
    base.is_virtual = false
    base.location = {
      venue: (row.venue_name ?? '').trim() || '',
      address_lines: [(row.address_line_1 ?? '').trim() || '', (row.address_line_2 ?? '').trim() || ''],
      locality: (row.city ?? '').trim() || '',
      region: (row.state ?? '').trim() || '',
      postal_code: (row.postal_code ?? '').trim() || '',
    }
  }

  /** Tag names are not Mobilize tag_ids — omit until ID map exists (Pass 3). */
  return { body: base }
}

/** Merge existing Mobilize timeslot ids for PUT (full replacement semantics). */
export function buildMobilizeUpdateBody(
  row: CampaignEventDbRow,
  existing: { timeslots?: { id?: number; start_date?: number; end_date?: number }[] },
  opts: { defaultContactEmail: string; defaultTimezone: string },
): { body: MobilizeEventApiBody; error?: string } {
  const created = buildMobilizeCreateBody(row, opts)
  if (created.error) return created

  const { start, end } = unixRangeForEvent(row)
  const upcoming = (existing.timeslots ?? []).filter((t) => {
    const sd = t.start_date
    return typeof sd === 'number' && sd * 1000 > Date.now() - 60 * 60 * 1000
  })
  const first = upcoming[0] ?? existing.timeslots?.[0]
  const slot: Record<string, unknown> = { start_date: start, end_date: end }
  if (first?.id != null) slot.id = first.id

  return {
    body: {
      ...created.body,
      timeslots: [slot],
    },
  }
}

export function parseMobilizeJson(resText: string): { data?: unknown; error?: string } {
  try {
    return JSON.parse(resText) as { data?: unknown }
  } catch {
    return { error: 'invalid_json' }
  }
}
