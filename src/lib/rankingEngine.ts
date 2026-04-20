/**
 * Lightweight tier labels for team rank (no full leaderboard).
 * Mirrors `daily_activation_team_tier` SQL for tests / client preview.
 */
export function tierFromRank(rank: number, teamSize: number): string | null {
  if (teamSize < 3 || rank < 1) return null
  if (rank === 1) return '#1'
  if (rank <= 5) return 'Top 5'
  if (rank <= 10) return 'Top 10'
  const cutoff = Math.max(1, Math.ceil(teamSize * 0.25))
  if (rank <= cutoff) return 'Top 25'
  return null
}

/** Placeholder for future lane-level ranks (not exposed in UI this pass). */
export function laneTierFromRank(rank: number, laneSize: number): string | null {
  void rank
  void laneSize
  return null
}
