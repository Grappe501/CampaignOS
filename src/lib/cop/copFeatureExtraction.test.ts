import { describe, expect, it } from 'vitest'
import { buildFeatureVector, extractSignalsFromLeadershipSnapshot, type CopSourceSignals } from './copFeatureExtraction'

function mockSig(over: Partial<CopSourceSignals> = {}): CopSourceSignals {
  return {
    criticalEvents: 1,
    staffingIncomplete: 2,
    approvalPending: 3,
    commsRisk: 1,
    posteventGaps: 0,
    upcoming7d: 8,
    liveNow: 0,
    trendVsPrior: 'stable',
    aggregatePressureScore: 12,
    ...over,
  }
}

describe('copFeatureExtraction', () => {
  it('buildFeatureVector keeps features within 0–1', () => {
    const fv = buildFeatureVector(mockSig({ criticalEvents: 10, approvalPending: 30 }))
    expect(fv.eventCriticalShare).toBeLessThanOrEqual(1)
    expect(fv.approvalPressure).toBeLessThanOrEqual(1)
    expect(fv.staffingGapPressure).toBeLessThanOrEqual(1)
  })

  it('extractSignalsFromLeadershipSnapshot maps counts', () => {
    const snap = {
      counts: {
        critical_risk_events: 2,
        staffing_incomplete_events: 3,
        approval_pending: 4,
        communications_risk_events: 1,
        postevent_followup_gaps: 5,
        upcoming_7d: 6,
        live_now: 0,
        trend_vs_prior: 'improving' as const,
        aggregate_pressure_score: 9,
      },
    }
    const s = extractSignalsFromLeadershipSnapshot(snap as never)
    expect(s.criticalEvents).toBe(2)
    expect(s.trendVsPrior).toBe('improving')
  })
})
