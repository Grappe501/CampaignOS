import type { AgentJonesGeoIntelligence } from './agentJonesContextV2'
import type { MatchedVoterDisplayRow } from './voterMatch'

/** Roster-linked geography only — no campaign turf engine. */
export function buildAgentJonesGeoIntelligence(input: {
  matchedVoter: MatchedVoterDisplayRow | null
  voterMatched: boolean
}): AgentJonesGeoIntelligence | null {
  if (!input.voterMatched || !input.matchedVoter) return null
  const v = input.matchedVoter
  const county = v.county?.trim() || null
  const precinct = v.precinct_name?.trim() || null
  const cd = v.congressional_district?.trim() || null
  const sen = v.state_senate_district?.trim() || null
  const house = v.state_representative_district?.trim() || null

  const labels: string[] = []
  if (precinct) labels.push(precinct)
  if (county) labels.push(county)
  if (cd) labels.push(`Congressional ${cd}`)
  if (sen) labels.push(`State Senate ${sen}`)
  if (house) labels.push(`State House ${house}`)

  if (labels.length === 0) return null

  let scope_type: NonNullable<AgentJonesGeoIntelligence['scope_type']> = 'campaign'
  if (precinct) scope_type = 'precinct'
  else if (county) scope_type = 'county'
  else if (cd || sen || house) scope_type = 'district'

  const primary =
    precinct && county
      ? `${county} — ${precinct}`
      : precinct ?? county ?? cd ?? labels[0] ?? null

  return {
    scope_type,
    primary_area_label: primary,
    target_area_labels: labels.slice(0, 5),
    area_count_in_view: labels.length,
  }
}
