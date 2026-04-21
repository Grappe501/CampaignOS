/**
 * Growth / expansion hints — advisory heuristics from the same snapshot as leadership briefing.
 */

import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'

export function buildGrowthExpansionLines(snapshot: LeadershipBriefingSnapshot, maxLines: number): string[] {
  const c = snapshot.counts
  const out: string[] = []
  if (c.upcoming_7d >= 12 && c.staffing_incomplete_events >= 5) {
    out.push(
      'High 7-day program density with staffing gaps — scaling load may outpace volunteer bench without relief.',
    )
  }
  if (c.aggregate_pressure_score >= 55 && snapshot.pulse.overall_operational_status === 'concern') {
    out.push('Aggregate pressure elevated — consider deferring non-critical programs before adding counties.')
  }
  if (snapshot.emphasis === 'candidate' && c.upcoming_7d >= 8) {
    out.push('Candidate-heavy week — expansion asks should route through principal schedule truth first.')
  }
  return out.slice(0, maxLines)
}
