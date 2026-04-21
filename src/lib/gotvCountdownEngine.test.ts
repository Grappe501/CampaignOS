import { describe, expect, it } from 'vitest'
import { electionDayStartUtcMs, resolveGotvTurnoutPhase } from './gotvCountdownEngine'
import { GOTV_ELECTION_CALENDAR } from './gotvDomain'

describe('gotvCountdownEngine', () => {
  it('returns pre_early_vote_ramp before early vote window', () => {
    const t = GOTV_ELECTION_CALENDAR.earlyVoteStartUtcMs - 7 * 86400000
    const r = resolveGotvTurnoutPhase(t)
    expect(r.phase).toBe('pre_early_vote_ramp')
    expect(r.phase_priorities.length).toBeGreaterThan(0)
  })

  it('returns election_day on election day start instant', () => {
    const r = resolveGotvTurnoutPhase(electionDayStartUtcMs())
    expect(r.phase).toBe('election_day')
  })
})
