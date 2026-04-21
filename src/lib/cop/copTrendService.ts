import type { CopMetricSnapshot, CopTrendKind } from './copTypes'
import type { LeadershipTrendDirection } from '../leadershipBriefingSchemas'

export function mapLeadershipTrend(
  d: LeadershipTrendDirection | undefined | null,
): CopTrendKind {
  if (!d || d === 'unknown') return 'insufficient_data'
  if (d === 'improving') return 'up'
  if (d === 'declining') return 'down'
  return 'flat'
}

export function applyDefaultTrend(m: CopMetricSnapshot, trend: CopTrendKind): CopMetricSnapshot {
  return { ...m, trend }
}
