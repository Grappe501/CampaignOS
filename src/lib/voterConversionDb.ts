/**
 * Supabase access: voter conversion attempts + state (RLS).
 */

import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import type {
  VoterBallotPlanStatus,
  VoterChaseSequenceState,
  VoterCommitmentStatus,
  VoterContactMethod,
  VoterConversionDisposition,
  VoterLifecycleStage,
} from './voterConversionDomain'
import type { VoterContactCapturePayload } from './voterContactCapture'
import { validateVoterContactCapturePayload } from './voterContactCapture'

export type VoterConversionContactAttemptRow = {
  id: string
  voter_id: string
  recorded_by_profile_id: string
  power5_node_id: string | null
  contact_method: VoterContactMethod
  disposition: VoterConversionDisposition
  support_signal: string | null
  follow_up_needed: boolean
  follow_up_owner_profile_id: string | null
  route_hint: string | null
  notes: string | null
  county_snapshot: string | null
  created_at: string
}

export type VoterConversionStateRow = {
  voter_id: string
  lifecycle_stage: VoterLifecycleStage
  support_level: string | null
  commitment_status: VoterCommitmentStatus
  ballot_plan_status: VoterBallotPlanStatus
  chase_sequence_state: VoterChaseSequenceState
  turnout_risk: string | null
  relational_owner_profile_id: string | null
  primary_power5_node_id: string | null
  last_contact_attempt_id: string | null
  last_contact_at: string | null
  contact_attempt_count: number
  updated_at: string
}

export type VoterConversionCountyRollupRow = {
  county: string
  tracked_voters: number
  supporters: number
  committed: number
  ballot_recorded: number
  needs_chase: number
  relational_linked: number
  commitment_ask_pending: number
}

function mapAttempt(raw: Record<string, unknown>): VoterConversionContactAttemptRow {
  return {
    id: String(raw.id ?? ''),
    voter_id: String(raw.voter_id ?? ''),
    recorded_by_profile_id: String(raw.recorded_by_profile_id ?? ''),
    power5_node_id: raw.power5_node_id != null ? String(raw.power5_node_id) : null,
    contact_method: raw.contact_method as VoterContactMethod,
    disposition: raw.disposition as VoterConversionDisposition,
    support_signal: raw.support_signal != null ? String(raw.support_signal) : null,
    follow_up_needed: Boolean(raw.follow_up_needed),
    follow_up_owner_profile_id:
      raw.follow_up_owner_profile_id != null ? String(raw.follow_up_owner_profile_id) : null,
    route_hint: raw.route_hint != null ? String(raw.route_hint) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    county_snapshot: raw.county_snapshot != null ? String(raw.county_snapshot) : null,
    created_at: String(raw.created_at ?? ''),
  }
}

function mapState(raw: Record<string, unknown>): VoterConversionStateRow {
  return {
    voter_id: String(raw.voter_id ?? ''),
    lifecycle_stage: raw.lifecycle_stage as VoterLifecycleStage,
    support_level: raw.support_level != null ? String(raw.support_level) : null,
    commitment_status: raw.commitment_status as VoterCommitmentStatus,
    ballot_plan_status: raw.ballot_plan_status as VoterBallotPlanStatus,
    chase_sequence_state: raw.chase_sequence_state as VoterChaseSequenceState,
    turnout_risk: raw.turnout_risk != null ? String(raw.turnout_risk) : null,
    relational_owner_profile_id:
      raw.relational_owner_profile_id != null ? String(raw.relational_owner_profile_id) : null,
    primary_power5_node_id:
      raw.primary_power5_node_id != null ? String(raw.primary_power5_node_id) : null,
    last_contact_attempt_id:
      raw.last_contact_attempt_id != null ? String(raw.last_contact_attempt_id) : null,
    last_contact_at: raw.last_contact_at != null ? String(raw.last_contact_at) : null,
    contact_attempt_count: Number(raw.contact_attempt_count ?? 0),
    updated_at: String(raw.updated_at ?? ''),
  }
}

export async function insertVoterConversionAttempt(
  profileId: string,
  payload: VoterContactCapturePayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (isDevAuthBypassEnabled()) {
    return { ok: true, id: 'dev-bypass' }
  }
  const v = validateVoterContactCapturePayload(payload)
  if (!v.ok) return v
  const row = {
    voter_id: payload.voter_id.trim(),
    recorded_by_profile_id: profileId,
    power5_node_id: payload.power5_node_id ?? null,
    contact_method: payload.contact_method,
    disposition: payload.disposition,
    support_signal: payload.support_signal ?? null,
    follow_up_needed: Boolean(payload.follow_up_needed),
    follow_up_owner_profile_id: payload.follow_up_owner_profile_id ?? null,
    route_hint: payload.route_hint ?? null,
    notes: payload.notes ?? null,
    county_snapshot: payload.county_snapshot ?? null,
  }
  const { data, error } = await supabase
    .from('voter_conversion_contact_attempts')
    .insert(row)
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  if (!data?.id) return { ok: false, error: 'No row returned' }
  return { ok: true, id: String(data.id) }
}

export async function fetchVoterConversionState(
  voterId: string,
): Promise<VoterConversionStateRow | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase
    .from('voter_conversion_state')
    .select('*')
    .eq('voter_id', voterId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapState(data as Record<string, unknown>)
}

export async function fetchVoterConversionAttemptsForVoter(
  voterId: string,
  limit = 30,
): Promise<VoterConversionContactAttemptRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('voter_conversion_contact_attempts')
    .select('*')
    .eq('voter_id', voterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapAttempt(r as Record<string, unknown>))
}

export async function fetchVoterConversionLeadershipRollups(): Promise<VoterConversionCountyRollupRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase.rpc('voter_conversion_leadership_rollups')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    county: String(r.county ?? ''),
    tracked_voters: Number(r.tracked_voters ?? 0),
    supporters: Number(r.supporters ?? 0),
    committed: Number(r.committed ?? 0),
    ballot_recorded: Number(r.ballot_recorded ?? 0),
    needs_chase: Number(r.needs_chase ?? 0),
    relational_linked: Number(r.relational_linked ?? 0),
    commitment_ask_pending: Number(r.commitment_ask_pending ?? 0),
  }))
}
