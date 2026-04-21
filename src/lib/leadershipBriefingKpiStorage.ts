/**
 * Browser-only prior KPI snapshot for leadership trend hints (localStorage v1).
 */

const STORAGE_KEY = 'campaignos_leadership_kpi_prior_v1'

export type LeadershipKpiPrior = {
  saved_at_ms: number
  active_program_count: number
  critical_event_count: number
  approval_pending_count: number
  staffing_gap_count: number
  comms_risk_count: number
  postevent_gap_count: number
  live_now_count: number
}

export function loadLeadershipKpiPrior(): LeadershipKpiPrior | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<LeadershipKpiPrior>
    if (typeof o.saved_at_ms !== 'number') return null
    return {
      saved_at_ms: o.saved_at_ms,
      active_program_count: Number(o.active_program_count) || 0,
      critical_event_count: Number(o.critical_event_count) || 0,
      approval_pending_count: Number(o.approval_pending_count) || 0,
      staffing_gap_count: Number(o.staffing_gap_count) || 0,
      comms_risk_count: Number(o.comms_risk_count) || 0,
      postevent_gap_count: Number(o.postevent_gap_count) || 0,
      live_now_count: Number(o.live_now_count) || 0,
    }
  } catch {
    return null
  }
}

export function persistLeadershipKpiPrior(k: Omit<LeadershipKpiPrior, 'saved_at_ms'>): void {
  if (typeof localStorage === 'undefined') return
  try {
    const payload: LeadershipKpiPrior = { ...k, saved_at_ms: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}
