/**
 * Fast voter contact capture payloads (validated before insert).
 */

import {
  VOTER_CONTACT_METHODS,
  VOTER_CONVERSION_DISPOSITIONS,
  VOTER_SUPPORT_SIGNALS,
  type VoterContactMethod,
  type VoterConversionDisposition,
  type VoterSupportSignal,
} from './voterConversionDomain'

export type VoterContactCapturePayload = {
  voter_id: string
  contact_method: VoterContactMethod
  disposition: VoterConversionDisposition
  support_signal?: VoterSupportSignal | null
  follow_up_needed?: boolean
  follow_up_owner_profile_id?: string | null
  power5_node_id?: string | null
  route_hint?: string | null
  notes?: string | null
  county_snapshot?: string | null
}

export function normalizeVoterId(raw: string | null | undefined): string | null {
  const v = String(raw ?? '').trim()
  return v.length ? v : null
}

export function validateVoterContactCapturePayload(
  p: VoterContactCapturePayload,
): { ok: true } | { ok: false; error: string } {
  const vid = normalizeVoterId(p.voter_id)
  if (!vid) return { ok: false, error: 'voter_id required' }
  if (!VOTER_CONTACT_METHODS.includes(p.contact_method)) return { ok: false, error: 'contact_method invalid' }
  if (!VOTER_CONVERSION_DISPOSITIONS.includes(p.disposition)) return { ok: false, error: 'disposition invalid' }
  if (p.support_signal != null && !VOTER_SUPPORT_SIGNALS.includes(p.support_signal)) {
    return { ok: false, error: 'support_signal invalid' }
  }
  const notes = p.notes != null ? String(p.notes).trim() : ''
  if (notes.length > 2000) return { ok: false, error: 'notes too long' }
  return { ok: true }
}
