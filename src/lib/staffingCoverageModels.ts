/**
 * Staffing coverage analytics models (Step 3.2).
 */

export type StaffingCoverageWindowId = 'today' | 'next_72h' | 'next_7d' | 'next_14d' | 'custom'

export type StaffingCoverageBucket =
  | 'fully_covered'
  | 'partial'
  | 'critical_gap'
  | 'overstaffed'
  | 'not_applicable'
  /** Volunteer request not approved — not live capacity */
  | 'blocked_pending_approval'
  /** Name on file but invite not confirmed (matrix may still show deficit) */
  | 'stale_uncertain'

export type StaffingCoverageMetrics = {
  event_id: string
  /** Live vs request-only — gates heatmap + load policy */
  operational_gate: 'live' | 'pending_approval'
  coverage_percentage: number
  critical_role_coverage_percentage: number
  shift_fill_percentage: number | null
  assignment_fill_percentage: number
  backup_coverage_score: number
  volunteer_confirmation_rate: number
  staffing_risk_score: number
  bucket: StaffingCoverageBucket
  missing_critical_slugs: string[]
  missing_any_slugs: string[]
}

export type StaffingHeatmapCell = {
  /** YYYY-MM-DD local key */
  dayKey: string
  agg_coverage: number
  agg_risk: number
  eventCount: number
  criticalGapCount: number
  atRiskCount: number
}

export type StaffingCoverageFiltersState = {
  window: StaffingCoverageWindowId
  eventType: string
  countyId: string
  organizerQuery: string
  roleCategory: string
  mode: 'assignment' | 'shift' | 'both'
  criticalOnly: boolean
}
