import { describe, expect, it } from 'vitest'
import { computeBudgetHeadroom, computeFinanceRoiMetrics } from './financeAnalytics'
import type { CampaignBudgetAllocationRow, CampaignExpenseRow } from './financeDb'

describe('computeFinanceRoiMetrics', () => {
  it('returns null cost_per_volunteer when volunteer_count is zero', () => {
    const m = computeFinanceRoiMetrics({
      total_revenue: 1000,
      total_expenses: 400,
      voter_contact_attempts: 10,
      tracked_voters: 5,
      volunteer_count: 0,
    })
    expect(m.cost_per_volunteer).toBeNull()
    expect(m.cost_per_contact).toBe(40)
    expect(m.cost_per_tracked_voter).toBe(80)
  })

  it('computes burn_ratio when revenue positive', () => {
    const m = computeFinanceRoiMetrics({
      total_revenue: 200,
      total_expenses: 100,
      voter_contact_attempts: 0,
      tracked_voters: 0,
      volunteer_count: 0,
    })
    expect(m.burn_ratio).toBe(0.5)
    expect(m.net_position).toBe(100)
  })
})

describe('computeBudgetHeadroom', () => {
  const allocations: CampaignBudgetAllocationRow[] = [
    {
      id: '1',
      campaign_id: 'default',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      budget_category: 'media',
      allocated_amount: 1000,
      county_id: null,
      priority_weight: 1,
      notes_internal: null,
      recorded_by_profile_id: 'p',
      created_at: '',
    },
  ]
  const expenses: CampaignExpenseRow[] = [
    {
      id: 'e1',
      campaign_id: 'default',
      expense_category: 'media',
      amount: 250,
      incurred_at: '2026-06-15T12:00:00Z',
      county_id: null,
      event_id: null,
      vendor_label: null,
      notes_internal: null,
      recorded_by_profile_id: 'x',
      created_at: '',
    },
  ]

  it('subtracts same-category spend for active period', () => {
    const h = computeBudgetHeadroom(allocations, expenses, new Date('2026-06-01T00:00:00Z'))
    expect(h.media).toBe(750)
  })
})
