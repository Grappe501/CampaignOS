import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CopSourceHealth } from './copTypes'

export function buildSourceHealth(
  snap: LeadershipBriefingSnapshot,
  assignmentMapLoaded: boolean,
): CopSourceHealth[] {
  const notes = snap.meta.data_quality_notes
  const h: CopSourceHealth[] = [
    {
      source: 'program_events',
      responded: snap.counts.active_program_events >= 0,
      stale: false,
      incomplete: snap.counts.active_program_events === 0,
      confidenceHint: snap.counts.active_program_events > 0 ? 0.85 : 0.35,
      note: snap.counts.active_program_events === 0 ? 'No program events in current list.' : null,
    },
    {
      source: 'staffing_assignments',
      responded: true,
      stale: false,
      incomplete: !assignmentMapLoaded && snap.counts.active_program_events > 0,
      confidenceHint: assignmentMapLoaded ? 0.8 : 0.5,
      note: !assignmentMapLoaded
        ? 'Staffing assignment map not fully loaded — roster-based gaps only.'
        : null,
    },
    {
      source: 'kpi_prior_browser',
      responded: snap.meta.trend_basis === 'browser_prior_snapshot',
      stale: (snap.meta.prior_snapshot_age_ms ?? 0) > 14 * 86400000,
      incomplete: snap.meta.trend_basis !== 'browser_prior_snapshot',
      confidenceHint: snap.meta.trend_basis === 'browser_prior_snapshot' ? 0.55 : 0.4,
      note:
        snap.meta.trend_basis !== 'browser_prior_snapshot'
          ? 'No prior KPI snapshot — trend vs last visit unavailable.'
          : null,
    },
    {
      source: 'leadership_briefing_engine',
      responded: true,
      stale: false,
      incomplete: notes.length > 2,
      confidenceHint: snap.meta.summary_confidence === 'high' ? 0.85 : snap.meta.summary_confidence === 'medium' ? 0.65 : 0.45,
      note: notes[0] ?? null,
    },
  ]
  return h
}

export function buildFreshness(
  snapshotMs: number,
  sourceHealth: CopSourceHealth[],
): CopFreshness {
  const incompleteCount = sourceHealth.filter((s) => s.incomplete).length
  const staleCount = sourceHealth.filter((s) => s.stale).length
  const confAvg =
    sourceHealth.reduce((a, s) => a + s.confidenceHint, 0) /
    Math.max(1, sourceHealth.length)
  const dataFreshnessScore = Math.max(
    5,
    Math.min(
      100,
      Math.round(confAvg * 100 - incompleteCount * 8 - staleCount * 6),
    ),
  )
  const notes: string[] = []
  if (incompleteCount) notes.push(`${String(incompleteCount)} source(s) incomplete.`)
  if (staleCount) notes.push('Some auxiliary history is stale.')
  return { generatedAtMs: snapshotMs, dataFreshnessScore, notes }
}
