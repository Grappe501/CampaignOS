/**
 * Deterministic similar-event ranking for comparative intelligence (no ML).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventSimilarityTier, SimilarEventMatch } from './eventIntelligenceContracts'

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

function sameDayOfWeek(a: string, b: string): boolean {
  const da = new Date(a).getDay()
  const db = new Date(b).getDay()
  return !Number.isNaN(da) && !Number.isNaN(db) && da === db
}

function daysApart(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000
}

export function tierFromScore(score: number, peerOutcomes?: { volunteer_outcome: number | null }): EventSimilarityTier {
  if (peerOutcomes?.volunteer_outcome != null && peerOutcomes.volunteer_outcome >= 85) return 'high_performer'
  if (peerOutcomes?.volunteer_outcome != null && peerOutcomes.volunteer_outcome <= 35) return 'low_performer'
  if (score >= 72) return 'strong'
  if (score >= 52) return 'moderate'
  if (score >= 36) return 'loose'
  return 'comparison_useful'
}

export function explainSimilarity(
  current: CampaignCalendarEventRecord,
  peer: CampaignCalendarEventRecord,
  score: number,
): string[] {
  const reasons: string[] = []
  if (norm(current.event_type) === norm(peer.event_type) && current.event_type) {
    reasons.push(`Same event type (${current.event_type})`)
  }
  if (current.county_id && peer.county_id && current.county_id === peer.county_id) {
    reasons.push('Same county footprint')
  }
  if (current.precinct_id && peer.precinct_id && current.precinct_id === peer.precinct_id) {
    reasons.push('Same precinct')
  }
  if (norm(current.event_objective) && norm(current.event_objective) === norm(peer.event_objective)) {
    reasons.push('Matching event objective label')
  }
  if (norm(current.visibility_scope) === norm(peer.visibility_scope) && current.visibility_scope) {
    reasons.push('Same visibility segment')
  }
  if (sameDayOfWeek(current.start_at, peer.start_at)) {
    reasons.push('Same day-of-week timing pattern')
  }
  const apart = daysApart(current.start_at, peer.start_at)
  if (apart > 30 && apart < 400) {
    reasons.push('Comparable seasonal distance (past season window)')
  }
  if (peer.operational_status === 'completed') {
    reasons.push('Peer event completed — outcomes available for comparison')
  }
  if (reasons.length === 0) {
    reasons.push(score >= 40 ? 'Loose calendar neighborhood match' : 'Marginal match — use for contrast only')
  }
  return reasons.slice(0, 8)
}

export function scorePeerAgainstCurrent(
  current: CampaignCalendarEventRecord,
  peer: CampaignCalendarEventRecord,
): number {
  if (peer.event_id === current.event_id) return 0
  let s = 0
  if (norm(current.event_type) === norm(peer.event_type) && current.event_type) s += 38
  if (current.county_id && peer.county_id && current.county_id === peer.county_id) s += 22
  if (current.precinct_id && peer.precinct_id && current.precinct_id === peer.precinct_id) s += 12
  if (norm(current.event_objective) && norm(current.event_objective) === norm(peer.event_objective)) s += 14
  if (norm(current.visibility_scope) === norm(peer.visibility_scope) && current.visibility_scope) s += 6
  if (sameDayOfWeek(current.start_at, peer.start_at)) s += 5
  const apart = daysApart(current.start_at, peer.start_at)
  if (apart > 14 && apart < 540) s += 3
  if (peer.operational_status === 'completed') s += 4
  return Math.min(100, Math.round(s))
}

export function rankSimilarEvents(
  current: CampaignCalendarEventRecord,
  pool: readonly CampaignCalendarEventRecord[],
  limit = 6,
): SimilarEventMatch[] {
  const scored = pool
    .filter((p) => p.event_id !== current.event_id)
    .map((peer) => {
      const score = scorePeerAgainstCurrent(current, peer)
      const tier = tierFromScore(score, { volunteer_outcome: peer.volunteer_outcome ?? null })
      const similarity_reasons = explainSimilarity(current, peer, score)
      const m: SimilarEventMatch = {
        similar_event_id: peer.event_id,
        title: peer.title,
        start_at: peer.start_at,
        score,
        tier,
        similarity_reasons,
        operational_status: peer.operational_status ?? null,
        volunteer_outcome_hint: peer.volunteer_outcome ?? null,
      }
      return m
    })
    .filter((m) => m.score > 8)
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const out: SimilarEventMatch[] = []
  for (const m of scored) {
    if (seen.has(m.similar_event_id)) continue
    seen.add(m.similar_event_id)
    out.push(m)
    if (out.length >= limit) break
  }
  return out
}

export function patternHintsFromMatches(matches: SimilarEventMatch[]): string[] {
  const hints: string[] = []
  const strong = matches.filter((m) => m.tier === 'strong' || m.tier === 'high_performer')
  if (strong.length >= 2) {
    hints.push('Multiple strong analogs in this footprint — borrow staffing and comms sequencing from the highest-scoring completed peer.')
  }
  const low = matches.find((m) => m.tier === 'low_performer')
  if (low) {
    hints.push(`Low performer in similar tier (“${low.title.slice(0, 42)}…”) — compare logistics and follow-up closure before going live.`)
  }
  return hints.slice(0, 5)
}
