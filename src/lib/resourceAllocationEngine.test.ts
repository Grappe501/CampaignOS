import { describe, expect, it } from 'vitest'
import { recommendResourceAllocations } from './resourceAllocationEngine'

describe('recommendResourceAllocations', () => {
  it('suggests GOTV when phase and headroom align', () => {
    const recs = recommendResourceAllocations({
      phase: 'election_day',
      pressure_counties: [],
      headroom_by_category: { gotv: 500 },
      turnout_risk_by_county: {},
    })
    expect(recs.some((r) => r.id === 'alloc_gotv_surge')).toBe(true)
  })

  it('suggests field surge when pressure counties present', () => {
    const recs = recommendResourceAllocations({
      phase: 'early_vote_sustain',
      pressure_counties: ['Jefferson'],
      headroom_by_category: { field_ops: 100 },
      turnout_risk_by_county: {},
    })
    expect(recs.some((r) => r.id === 'alloc_field_geo')).toBe(true)
  })

  it('falls back to reserve hold when nothing else matches', () => {
    const recs = recommendResourceAllocations({
      phase: 'post_election_review',
      pressure_counties: [],
      headroom_by_category: { reserve: 1000 },
      turnout_risk_by_county: {},
    })
    expect(recs.some((r) => r.id === 'alloc_reserve_hold')).toBe(true)
  })
})
