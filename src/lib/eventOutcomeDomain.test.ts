import { describe, expect, it } from 'vitest'
import { computeEventOutcomeHealth, parseOutcomeStage } from './eventOutcomeDomain'

describe('eventOutcomeDomain', () => {
  it('parseOutcomeStage accepts canonical values', () => {
    expect(parseOutcomeStage('followup_generated')).toBe('followup_generated')
    expect(parseOutcomeStage('nope')).toBeNull()
  })

  it('computeEventOutcomeHealth flags missing attendance after event', () => {
    const h = computeEventOutcomeHealth({
      recordExpectedAudience: 50,
      attendanceCheckins: 0,
      outcomeRow: null,
      followupsTotal: 2,
      followupsOpen: 1,
      learningCaptureFilled: false,
      eventEnded: true,
    })
    expect(h.flags).toContain('missing_attendance')
    expect(h.completeness_0_100).toBeLessThan(100)
  })

  it('computeEventOutcomeHealth is lenient pre-event', () => {
    const h = computeEventOutcomeHealth({
      recordExpectedAudience: null,
      attendanceCheckins: 0,
      outcomeRow: null,
      followupsTotal: 0,
      followupsOpen: 0,
      learningCaptureFilled: false,
      eventEnded: false,
    })
    expect(h.completeness_0_100).toBe(100)
    expect(h.flags.length).toBe(0)
  })
})
