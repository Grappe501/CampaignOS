import { supabase } from './supabaseClient'

/** Row returned by `search_voter_candidates` (safe fields only). */
export type VoterCandidateRow = {
  voter_id: string
  name_last: string
  name_first: string
  date_of_birth: string
  county: string | null
  registrant_status: string | null
  res_city: string | null
  precinct_name: string | null
  congressional_district: string | null
  state_senate_district: string | null
  state_representative_district: string | null
  match_rank: number
}

/** Row from `get_matched_voter_display_for_profile`. */
export type MatchedVoterDisplayRow = {
  voter_id: string
  name_last: string
  name_first: string
  county: string | null
  registrant_status: string | null
  precinct_name: string | null
  res_city: string | null
  res_state: string | null
  res_zip5: string | null
  congressional_district: string | null
  state_senate_district: string | null
  state_representative_district: string | null
  match_status: string | null
}

export async function searchVoterCandidates(params: {
  nameLast: string
  nameFirst: string
  dateOfBirth: string
  county?: string | null
}) {
  const { data, error } = await supabase.rpc('search_voter_candidates', {
    p_name_last: params.nameLast.trim(),
    p_name_first: params.nameFirst.trim(),
    p_date_of_birth: params.dateOfBirth,
    p_county: params.county?.trim() || null,
  })

  if (error) throw error
  return (data ?? []) as VoterCandidateRow[]
}

export async function confirmVoterSelfMatch(params: {
  campaignProfileId: string
  voterId: string
  nameLast: string
  nameFirst: string
  dateOfBirth: string
  county?: string | null
  confidenceScore: number
}) {
  const { error } = await supabase.rpc('confirm_voter_self_match', {
    p_campaign_profile_id: params.campaignProfileId,
    p_voter_id: params.voterId,
    p_name_last: params.nameLast.trim(),
    p_name_first: params.nameFirst.trim(),
    p_date_of_birth: params.dateOfBirth,
    p_county: params.county?.trim() || null,
    p_confidence_score: params.confidenceScore,
  })

  if (error) throw error
}

export async function fetchMatchedVoterDisplay(campaignProfileId: string) {
  const { data, error } = await supabase.rpc(
    'get_matched_voter_display_for_profile',
    { p_campaign_profile_id: campaignProfileId },
  )

  if (error) throw error
  const rows = (data ?? []) as MatchedVoterDisplayRow[]
  return rows[0] ?? null
}

export function confidenceForSelection(candidateCount: number): number {
  if (candidateCount <= 1) return 1
  return Math.max(0.5, 1 - 0.15 * (candidateCount - 1))
}
