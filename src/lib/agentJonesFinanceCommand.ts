/**
 * Bounded finance / resource command digest for Agent Jones (advisory — no transactions).
 */

import type { FinanceLeadershipSummaryRow } from './financeDb'
import type { FinanceRoiMetrics } from './financeDomain'
import { financeHealthHeadline, largestExpenseCategories } from './financeAnalytics'
import type { AllocationRecommendation } from './resourceAllocationEngine'

export type AgentJonesFinanceCommandSnapshot = {
  source: 'finance_command_v1'
  generated_at_ms: number
  totals: {
    donations: number
    expenses: number
    donation_rows: number
    expense_rows: number
  }
  roi: {
    net_position: number
    cost_per_contact: number | null
    cost_per_tracked_voter: number | null
    cost_per_volunteer: number | null
    burn_ratio: number | null
  }
  top_expense_categories: { label: string; amount: number }[]
  allocation_hints: string[]
  headline: string
  discipline_reminders: string[]
}

export function buildAgentJonesFinanceCommandSnapshot(input: {
  generatedAtMs: number
  summary: FinanceLeadershipSummaryRow | null
  roi: FinanceRoiMetrics
  recommendations: AllocationRecommendation[]
}): AgentJonesFinanceCommandSnapshot | null {
  if (!input.summary) {
    return {
      source: 'finance_command_v1',
      generated_at_ms: input.generatedAtMs,
      totals: { donations: 0, expenses: 0, donation_rows: 0, expense_rows: 0 },
      roi: {
        net_position: 0,
        cost_per_contact: input.roi.cost_per_contact,
        cost_per_tracked_voter: input.roi.cost_per_tracked_voter,
        cost_per_volunteer: input.roi.cost_per_volunteer,
        burn_ratio: input.roi.burn_ratio,
      },
      top_expense_categories: [],
      allocation_hints: input.recommendations.map((r) => r.action_line).slice(0, 5),
      headline: 'Finance tables empty or not visible — log revenue and spend for command view.',
      discipline_reminders: [
        'Agent Jones does not move money, approve vendors, or file compliance reports.',
        'All spend still flows through finance desk approvals and bank reality.',
      ],
    }
  }

  const s = input.summary
  const top = largestExpenseCategories(s.expense_by_category, 5).map((x) => ({
    label: x.label,
    amount: x.amount,
  }))

  return {
    source: 'finance_command_v1',
    generated_at_ms: input.generatedAtMs,
    totals: {
      donations: s.total_donations,
      expenses: s.total_expenses,
      donation_rows: s.donation_count,
      expense_rows: s.expense_count,
    },
    roi: {
      net_position: input.roi.net_position,
      cost_per_contact: input.roi.cost_per_contact,
      cost_per_tracked_voter: input.roi.cost_per_tracked_voter,
      cost_per_volunteer: input.roi.cost_per_volunteer,
      burn_ratio: input.roi.burn_ratio,
    },
    top_expense_categories: top,
    allocation_hints: input.recommendations.map((r) => `${r.severity}: ${r.action_line}`).slice(0, 6),
    headline: financeHealthHeadline(s, input.roi),
    discipline_reminders: [
      'No wire transfers, card charges, or donation processing from Agent Jones.',
      'Treat ROI as directional — reconcile to accounting and compliance.',
    ],
  }
}
