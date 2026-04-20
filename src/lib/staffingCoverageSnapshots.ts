/**
 * Client-side staffing coverage snapshots for trend hints (sessionStorage).
 * Server could add scheduled rows later; deterministic core stays in heatmap service.
 */

import type { StaffingCoverageMetrics } from './staffingCoverageModels'

export type StaffingCoverageSnapshot = {
  event_id: string
  captured_at: string
  metrics: Pick<
    StaffingCoverageMetrics,
    | 'coverage_percentage'
    | 'critical_role_coverage_percentage'
    | 'staffing_risk_score'
    | 'bucket'
  >
}

const KEY = 'campaignos_staffing_coverage_snapshots_v1'
const MAX = 400

function read(): StaffingCoverageSnapshot[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as StaffingCoverageSnapshot[]) : []
  } catch {
    return []
  }
}

function write(rows: StaffingCoverageSnapshot[]) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)))
  } catch {
    /* quota */
  }
}

export function recordStaffingCoverageSnapshot(row: StaffingCoverageSnapshot): void {
  const next = [...read(), row]
  write(next)
}

export function snapshotsForEvent(eventId: string): StaffingCoverageSnapshot[] {
  return read().filter((r) => r.event_id === eventId)
}

export type CoverageTrend = 'improving' | 'stable' | 'declining' | 'unknown'

export function deriveCoverageTrend(eventId: string): CoverageTrend {
  const rows = snapshotsForEvent(eventId).sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  )
  if (rows.length < 2) return 'unknown'
  const a = rows[rows.length - 2]!.metrics.coverage_percentage
  const b = rows[rows.length - 1]!.metrics.coverage_percentage
  if (b > a + 3) return 'improving'
  if (b < a - 3) return 'declining'
  return 'stable'
}
