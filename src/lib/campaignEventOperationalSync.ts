/**
 * Align readiness_score and operational_status with task progress and event clock.
 */

import type { EventOperationalStatus } from './campaignEventDomain'

export type OperationalClockInput = {
  readinessPct: number
  nowMs: number
  startAtMs: number
  endAtMs: number | null
  /** Preserve terminal states from editors. */
  current: EventOperationalStatus
}

/**
 * Spec: &lt;40 planning, 40–70 in_prep, 70–90 ready; live during window; completed after end.
 * Does not override canceled/archived.
 */
export function operationalStatusFromReadinessAndClock(input: OperationalClockInput): EventOperationalStatus {
  const { current } = input
  if (current === 'canceled' || current === 'archived') return current
  if (current === 'completed') return 'completed'

  const { nowMs, startAtMs, endAtMs, readinessPct } = input
  if (Number.isNaN(startAtMs)) return current === 'draft' ? 'draft' : 'planning'

  if (nowMs >= startAtMs && (endAtMs == null || nowMs <= endAtMs)) {
    return 'live'
  }
  if (endAtMs != null && nowMs > endAtMs) {
    return 'completed'
  }

  const r = Math.max(0, Math.min(100, readinessPct))
  if (r < 40) return 'planning'
  if (r < 70) return 'in_prep'
  if (r < 90) return 'ready'
  return 'ready'
}
