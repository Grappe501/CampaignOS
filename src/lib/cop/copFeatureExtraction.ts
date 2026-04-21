import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CopFeatureVector } from './copTypes'

export type CopSourceSignals = {
  criticalEvents: number
  staffingIncomplete: number
  approvalPending: number
  commsRisk: number
  posteventGaps: number
  upcoming7d: number
  liveNow: number
  trendVsPrior: 'improving' | 'stable' | 'declining' | 'unknown'
  aggregatePressureScore: number
}

export function extractSignalsFromLeadershipSnapshot(
  snap: LeadershipBriefingSnapshot,
): CopSourceSignals {
  const c = snap.counts
  return {
    criticalEvents: c.critical_risk_events,
    staffingIncomplete: c.staffing_incomplete_events,
    approvalPending: c.approval_pending,
    commsRisk: c.communications_risk_events,
    posteventGaps: c.postevent_followup_gaps,
    upcoming7d: c.upcoming_7d,
    liveNow: c.live_now,
    trendVsPrior: c.trend_vs_prior,
    aggregatePressureScore: c.aggregate_pressure_score,
  }
}

export function buildFeatureVector(sigs: CopSourceSignals, maxUpcoming = 40): CopFeatureVector {
  const evDenom = Math.max(1, maxUpcoming)
  const eventCriticalShare = Math.min(1, sigs.criticalEvents / evDenom)
  const approvalPressure = Math.min(1, sigs.approvalPending / 25)
  const staffingGapPressure = Math.min(1, sigs.staffingIncomplete / 25)
  const commsRiskPressure = Math.min(1, sigs.commsRisk / 25)
  const followupBacklogPressure = Math.min(1, sigs.posteventGaps / 20)
  const trendDeltaSigned =
    sigs.trendVsPrior === 'improving' ? 0.2 : sigs.trendVsPrior === 'declining' ? -0.2 : 0
  return {
    eventCriticalShare,
    approvalPressure,
    staffingGapPressure,
    commsRiskPressure,
    followupBacklogPressure,
    trendDeltaSigned,
  }
}
