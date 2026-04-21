import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveGotvTurnoutPhase } from '../lib/gotvCountdownEngine'
import {
  fetchBudgetAllocations,
  fetchDonations,
  fetchExpenses,
  fetchFinanceLeadershipSummary,
  fetchResourceDeployments,
  fetchVoterConversionContactAttemptCount,
} from '../lib/financeDb'
import { computeBudgetHeadroom, computeFinanceRoiMetrics } from '../lib/financeAnalytics'
import { recommendResourceAllocations } from '../lib/resourceAllocationEngine'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import { useVoterConversionLeadership } from './useVoterConversionLeadership'
import type { FinanceLeadershipSummaryRow } from '../lib/financeDb'
import type { CampaignBudgetAllocationRow, CampaignDonationRow, CampaignExpenseRow, CampaignResourceDeploymentRow } from '../lib/financeDb'
import type { AllocationRecommendation } from '../lib/resourceAllocationEngine'
import type { FinanceRoiMetrics } from '../lib/financeDomain'

export function useFinanceCommandLayer(primaryRole: string | null | undefined) {
  const voterConv = useVoterConversionLeadership(primaryRole)
  const enabled = canAccessEventCoordinatorDesk(primaryRole)

  const [summary, setSummary] = useState<FinanceLeadershipSummaryRow | null>(null)
  const [donations, setDonations] = useState<CampaignDonationRow[]>([])
  const [expenses, setExpenses] = useState<CampaignExpenseRow[]>([])
  const [budgets, setBudgets] = useState<CampaignBudgetAllocationRow[]>([])
  const [deployments, setDeployments] = useState<CampaignResourceDeploymentRow[]>([])
  const [contactAttempts, setContactAttempts] = useState(0)
  const [volunteerEstimate] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || isDevAuthBypassEnabled()) {
      setSummary(
        isDevAuthBypassEnabled()
          ? { total_donations: 0, total_expenses: 0, donation_count: 0, expense_count: 0, expense_by_category: {} }
          : null,
      )
      setDonations([])
      setExpenses([])
      setBudgets([])
      setDeployments([])
      setContactAttempts(0)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [s, d, e, b, dep, cc] = await Promise.all([
        fetchFinanceLeadershipSummary(),
        fetchDonations(400),
        fetchExpenses(400),
        fetchBudgetAllocations(120),
        fetchResourceDeployments(80),
        fetchVoterConversionContactAttemptCount(),
      ])
      setSummary(s)
      setDonations(d)
      setExpenses(e)
      setBudgets(b)
      setDeployments(dep)
      setContactAttempts(cc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finance load failed')
      setSummary(null)
      setDonations([])
      setExpenses([])
      setBudgets([])
      setDeployments([])
      setContactAttempts(0)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 120_000)
    return () => window.clearInterval(id)
  }, [])

  const trackedVoters = useMemo(
    () => voterConv.rollups.reduce((a, r) => a + r.tracked_voters, 0),
    [voterConv.rollups],
  )

  const headroom = useMemo(
    () => computeBudgetHeadroom(budgets, expenses),
    [budgets, expenses],
  )

  const roi: FinanceRoiMetrics = useMemo(() => {
    const revenue = summary?.total_donations ?? 0
    const spend = summary?.total_expenses ?? 0
    return computeFinanceRoiMetrics({
      total_revenue: revenue,
      total_expenses: spend,
      voter_contact_attempts: contactAttempts,
      tracked_voters: trackedVoters,
      volunteer_count: Math.max(0, volunteerEstimate),
    })
  }, [summary, contactAttempts, trackedVoters, volunteerEstimate])

  const recommendations: AllocationRecommendation[] = useMemo(() => {
    const phase = resolveGotvTurnoutPhase(nowMs).phase
    return recommendResourceAllocations({
      phase,
      pressure_counties: [],
      headroom_by_category: headroom,
      turnout_risk_by_county: {},
    })
  }, [headroom, nowMs])

  return {
    enabled,
    summary,
    donations,
    expenses,
    budgets,
    deployments,
    contactAttempts,
    trackedVoters,
    headroom,
    roi,
    recommendations,
    loading,
    error,
    refresh,
    voterConvLoading: voterConv.loading,
  }
}
