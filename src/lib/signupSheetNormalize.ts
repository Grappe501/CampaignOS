/**
 * Deterministic normalization for signup-sheet fields (mirrors DB helpers where possible).
 * Parsed DOB from paper is retained for review only — not used for volunteer profile matching.
 */
export type SignupExtractedFields = {
  county?: string | null
  first_name?: string | null
  last_name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  dob?: string | null
}

export type SignupNormalizedFields = {
  county?: string | null
  first_name?: string | null
  last_name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  dob_iso?: string | null
  flags: string[]
}

function squashWs(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function signupNormalizeCountyToken(input: string | null | undefined): string | null {
  if (!input) return null
  const t = squashWs(String(input))
    .replace(/\s*(county|parish|borough)$/i, '')
    .toLowerCase()
  return t.length ? t : null
}

export function signupNormalizeNameToken(input: string | null | undefined): string | null {
  if (!input) return null
  const t = squashWs(String(input)).toLowerCase()
  return t.length ? t : null
}

export function signupNormalizeAddressLine(input: string | null | undefined): string | null {
  if (!input) return null
  const t = squashWs(String(input))
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
  return t.length ? t : null
}

const PHONE_DIGIT_MIN = 7

export function signupNormalizePhoneDigits(input: string | null | undefined): string | null {
  if (!input) return null
  const d = String(input).replace(/\D/g, '')
  return d.length >= PHONE_DIGIT_MIN ? d : null
}

export function signupNormalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null
  const e = String(input).trim().toLowerCase()
  return e.length && e.includes('@') ? e : null
}

/** Best-effort DOB parse for sheet display; invalid → flag, no throw. */
export function signupNormalizeDobIso(raw: string | null | undefined): {
  iso: string | null
  flag?: string
} {
  if (!raw || !String(raw).trim()) return { iso: null }
  const s = squashWs(String(raw))
  const mdy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s)
  if (mdy) {
    const mm = Number(mdy[1])
    const dd = Number(mdy[2])
    let yyyy = Number(mdy[3])
    if (mdy[3].length === 2) yyyy += yyyy >= 70 ? 1900 : 2000
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 2100) {
      const iso = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
      return { iso }
    }
  }
  const isoTry = Date.parse(s)
  if (!Number.isNaN(isoTry)) {
    const d = new Date(isoTry)
    if (!Number.isNaN(d.getTime())) {
      return { iso: d.toISOString().slice(0, 10) }
    }
  }
  return { iso: null, flag: 'dob_unparsed' }
}

export function normalizeSignupExtracted(extracted: SignupExtractedFields): SignupNormalizedFields {
  const flags: string[] = []
  const dob = signupNormalizeDobIso(extracted.dob ?? null)
  if (dob.flag) flags.push(dob.flag)

  if (extracted.county != null && String(extracted.county).trim() === '') {
    flags.push('county_missing')
  }
  if (!signupNormalizeAddressLine(extracted.address ?? null) && String(extracted.address ?? '').trim()) {
    flags.push('address_weak')
  }

  return {
    county: signupNormalizeCountyToken(extracted.county ?? null),
    first_name: signupNormalizeNameToken(extracted.first_name ?? null),
    last_name: signupNormalizeNameToken(extracted.last_name ?? null),
    address: signupNormalizeAddressLine(extracted.address ?? null),
    phone: signupNormalizePhoneDigits(extracted.phone ?? null),
    email: signupNormalizeEmail(extracted.email ?? null),
    notes: extracted.notes ? squashWs(String(extracted.notes)) : null,
    dob_iso: dob.iso,
    flags,
  }
}
