import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeSignupExtracted,
  type SignupExtractedFields,
  type SignupNormalizedFields,
} from './signupSheetNormalize'

export type SignupMatchCandidate = {
  profile_id: string
  volunteer_id: string
  display_name: string | null
  score: number
  reasons: string[]
  tier: string
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Map CSV/header cell to extracted field keys (expand as templates grow). */
function headerToFieldKey(h: string): keyof SignupExtractedFields | null {
  const k = normalizeHeader(h)
  const map: Record<string, keyof SignupExtractedFields> = {
    county: 'county',
    'county name': 'county',
    first: 'first_name',
    'first name': 'first_name',
    first_name: 'first_name',
    last: 'last_name',
    'last name': 'last_name',
    last_name: 'last_name',
    address: 'address',
    street: 'address',
    phone: 'phone',
    tel: 'phone',
    mobile: 'phone',
    email: 'email',
    e_mail: 'email',
    notes: 'notes',
    note: 'notes',
    dob: 'dob',
    birthday: 'dob',
    'date of birth': 'dob',
    birth: 'dob',
  }
  return map[k] ?? null
}

export function parseSignupTable(text: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }
  const headers = lines[0].split('\t').length > 1 ? lines[0].split('\t') : lines[0].split(',')
  const hClean = headers.map((h) => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t').length > 1 ? lines[i].split('\t') : lines[i].split(',')
    const row: Record<string, string> = {}
    hClean.forEach((h, j) => {
      row[h] = (parts[j] ?? '').trim()
    })
    rows.push(row)
  }
  return { headers: hClean, rows }
}

export function rowRecordToExtracted(record: Record<string, string>): SignupExtractedFields {
  const out: SignupExtractedFields = {}
  for (const [hdr, val] of Object.entries(record)) {
    const key = headerToFieldKey(hdr)
    if (key && val) {
      out[key] = val
    }
  }
  return out
}

export async function runSignupRowMatcher(
  supabase: SupabaseClient,
  campaignId: string,
  normalized: SignupNormalizedFields,
): Promise<{
  candidates: SignupMatchCandidate[]
  confidence: number | null
  match_reasons: string[]
}> {
  const { data, error } = await supabase.rpc('signup_sheet_match_candidates', {
    p_campaign_id: campaignId,
    p_county: normalized.county ?? null,
    p_address: normalized.address ?? null,
    p_last_name: normalized.last_name ?? null,
    p_first_name: normalized.first_name ?? null,
    p_email: normalized.email ?? null,
    p_phone: normalized.phone ?? null,
    p_max: 12,
  })
  if (error) {
    return { candidates: [], confidence: null, match_reasons: [`match_error:${error.message}`] }
  }
  const raw = data as unknown
  const arr = Array.isArray(raw) ? raw : []
  const candidates: SignupMatchCandidate[] = (arr as Record<string, unknown>[]).map((c) => ({
    profile_id: String(c.profile_id ?? ''),
    volunteer_id: String(c.volunteer_id ?? ''),
    display_name: (c.display_name as string) ?? null,
    score: Number(c.score ?? 0),
    reasons: Array.isArray(c.reasons) ? (c.reasons as string[]) : [],
    tier: String(c.tier ?? 'low'),
  }))
  const top = candidates[0]
  const confidence = top ? Math.min(1, top.score) : 0
  const match_reasons = top?.reasons ?? []
  return { candidates, confidence: top ? confidence : null, match_reasons }
}

export async function refreshSignupRowMatch(
  supabase: SupabaseClient,
  rowId: string,
  campaignId: string,
  extracted: SignupExtractedFields,
): Promise<void> {
  const normalized = normalizeSignupExtracted(extracted)
  const { candidates, confidence, match_reasons } = await runSignupRowMatcher(
    supabase,
    campaignId,
    normalized,
  )
  await supabase
    .from('signup_sheet_rows')
    .update({
      extracted: extracted as unknown as Record<string, unknown>,
      normalized: { ...normalized } as unknown as Record<string, unknown>,
      dob_raw: extracted.dob ?? null,
      dob_normalized: normalized.dob_iso ?? null,
      match_candidates: candidates as unknown as Record<string, unknown>[],
      confidence,
      match_reasons,
      review_status: 'pending_review',
    })
    .eq('id', rowId)
}

export async function createSignupBatchFromTable(
  supabase: SupabaseClient,
  opts: {
    campaignId: string
    profileId: string
    title: string
    eventId: string | null
    tableText: string
  },
): Promise<{ batchId: string; rowCount: number; error?: string }> {
  const { headers, rows } = parseSignupTable(opts.tableText)
  if (headers.length === 0 || rows.length === 0) {
    return { batchId: '', rowCount: 0, error: 'No rows parsed — use a header row and data rows.' }
  }

  const { data: batch, error: bErr } = await supabase
    .from('signup_sheet_batches')
    .insert({
      campaign_id: opts.campaignId,
      event_id: opts.eventId,
      uploaded_by_profile_id: opts.profileId,
      title: opts.title || `Signup sheet ${new Date().toISOString().slice(0, 10)}`,
      status: 'extracting',
      row_count: 0,
    })
    .select('id')
    .single()

  if (bErr || !batch?.id) {
    return { batchId: '', rowCount: 0, error: bErr?.message ?? 'batch_insert_failed' }
  }

  const batchId = batch.id as string

  const rowPayload = rows.map((rec, i) => {
    const extracted = rowRecordToExtracted(rec)
    const normalized = normalizeSignupExtracted(extracted)
    return {
      batch_id: batchId,
      sheet_row_index: i,
      raw_cells: rec as Record<string, unknown>,
      extracted: extracted as unknown as Record<string, unknown>,
      normalized: { ...normalized } as unknown as Record<string, unknown>,
      dob_raw: extracted.dob ?? null,
      dob_normalized: normalized.dob_iso ?? null,
      review_status: 'pending_extraction' as const,
    }
  })

  const { data: inserted, error: rErr } = await supabase
    .from('signup_sheet_rows')
    .insert(rowPayload)
    .select('id')

  if (rErr || !inserted?.length) {
    return { batchId, rowCount: 0, error: rErr?.message ?? 'rows_insert_failed' }
  }

  for (let i = 0; i < inserted.length; i++) {
    const row = rows[i]
    const id = (inserted[i] as { id: string }).id
    const extracted = rowRecordToExtracted(row)
    await refreshSignupRowMatch(supabase, id, opts.campaignId, extracted)
  }

  await supabase
    .from('signup_sheet_batches')
    .update({ status: 'ready_for_review', row_count: inserted.length })
    .eq('id', batchId)

  return { batchId, rowCount: inserted.length }
}
