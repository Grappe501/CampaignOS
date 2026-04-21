import { describe, expect, it } from 'vitest'
import { foldVoterConversionStateFromAttempts } from './voterConversionDisposition'

describe('foldVoterConversionStateFromAttempts', () => {
  it('records supporter then commitment secured with sticky commitment across no_answer', () => {
    const s = foldVoterConversionStateFromAttempts([
      { disposition: 'supporter' },
      { disposition: 'commitment_secured' },
      { disposition: 'no_answer' },
    ])
    expect(s.commitment_status).toBe('secured')
    expect(s.lifecycle_stage).toBe('committed_to_vote')
    expect(s.chase_sequence_state).toBe('ballot_plan_pending')
  })

  it('ballot_plan_recorded sticks', () => {
    const s = foldVoterConversionStateFromAttempts([
      { disposition: 'commitment_secured' },
      { disposition: 'ballot_plan_recorded' },
      { disposition: 'no_answer' },
    ])
    expect(s.ballot_plan_status).toBe('recorded')
    expect(s.lifecycle_stage).toBe('ballot_plan_recorded')
  })

  it('do_not_contact clears stickies', () => {
    const s = foldVoterConversionStateFromAttempts([
      { disposition: 'commitment_secured' },
      { disposition: 'do_not_contact' },
    ])
    expect(s.commitment_status).toBe('none')
    expect(s.lifecycle_stage).toBe('do_not_contact')
  })
})

describe('chase priority helpers', () => {
  it('commitment ask surfaces for supporter with no commitment', async () => {
    const { needsCommitmentAsk } = await import('./voterCommitmentService')
    expect(
      needsCommitmentAsk({ lifecycle: 'supporter', commitment: 'none' }),
    ).toBe(true)
    expect(
      needsCommitmentAsk({ lifecycle: 'supporter', commitment: 'secured' }),
    ).toBe(false)
  })
})
