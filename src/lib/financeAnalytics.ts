/**
 * ROI & efficiency metrics — deterministic; advisory for leadership.
 */

import type {
  CampaignBudgetAllocationRow,
  CampaignExpenseRow,
  FinanceLeadershipSummaryRow,
} from './financeDb'
import type { BudgetCategory, FinanceRoiInputs, FinanceRoiMetrics } from './financeDomain'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from './financeDomain'

export function computeFinanceRoiMetrics(input: FinanceRoiInputs): FinanceRoiMetrics {
  const net_position = input.total_revenue - input.total_expenses
  const burn_ratio =
    input.total_revenue > 0 ? Math.round((input.total_expenses / input.total_revenue) * 1000) / 1000 : null
  const cost_per_contact =
    input.voter_contact_attempts > 0
      ? Math.round((input.total_expenses / input.voter_contact_attempts) * 100) / 100
      : null
  const cost_per_tracked_voter =
    input.tracked_voters > 0
      ? Math.round((input.total_expenses / input.tracked_voters) * 100) / 100
      : null
  const cost_per_volunteer =
    input.volunteer_count > 0
      ? Math.round((input.total_expenses / input.volunteer_count) * 100) / 100
      : null
  return {
    net_position,
    cost_per_contact,
    cost_per_tracked_voter,
    cost_per_volunteer,
    burn_ratio,
  }
}

export function financeHealthHeadline(summary: FinanceLeadershipSummaryRow | null, roi: FinanceRoiMetrics): string {
  if (!summary) return 'Finance data not loaded.'
  const net = summary.total_donations - summary.total_expenses
  const netLabel = net >= 0 ? `+${net.toFixed(0)}` : net.toFixed(0)
  return `Raised ${summary.total_donations.toFixed(0)} · Spent ${summary.total_expenses.toFixed(0)} · Net ${netLabel} · burn/rev ${roi.burn_ratio != null ? (roi.burn_ratio * 100).toFixed(0) + '%' : 'n/a'}`
}

/** Remaining envelope by category for active budget lines (period contains asOf date). */
export function computeBudgetHeadroom(
  allocations: readonly CampaignBudgetAllocationRow[],
  expenses: readonly CampaignExpenseRow[],
  asOf = new Date(),
): Partial<Record<BudgetCategory, number>> {
  const y = asOf.toISOString().slice(0, 10)
  const planned = new Map<BudgetCategory, number>()
  for (const a of allocations) {
    if (a.period_start <= y && a.period_end >= y) {
      planned.set(a.budget_category, (planned.get(a.budget_category) ?? 0) + a.allocated_amount)
    }
  }
  const spent = new Map<ExpenseCategory, number>()
  for (const e of expenses) {
    const d = String(e.incurred_at).slice(0, 10)
    if (d.length >= 10) {
      spent.set(e.expense_category, (spent.get(e.expense_category) ?? 0) + e.amount)
    }
  }
  const out: Partial<Record<BudgetCategory, number>> = {}
  for (const [k, v] of planned) {
    const s = spent.get(k as ExpenseCategory) ?? 0
    out[k] = Math.max(0, Math.round((v - s) * 100) / 100)
  }
  return out
}

export function largestExpenseCategories(
  byCat: Record<string, number>,
  limit = 4,
): { category: string; label: string; amount: number }[] {
  const entries = Object.entries(byCat)
    .map(([k, v]) => ({
      category: k,
      label: EXPENSE_CATEGORY_LABELS[k as ExpenseCategory] ?? k,
      amount: Number(v) || 0,
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  return entries.slice(0, limit)
}
