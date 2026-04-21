/**
 * Supabase access — campaign finance tables (RLS: editors).
 */

import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import type {
  BudgetCategory,
  DeploymentKind,
  DonationChannel,
  DonorAmountTier,
  ExpenseCategory,
  FundSourceSlug,
} from './financeDomain'

export type CampaignDonationRow = {
  id: string
  campaign_id: string
  fund_source_slug: FundSourceSlug
  amount: number
  donor_amount_tier: DonorAmountTier
  channel: DonationChannel
  event_id: string | null
  county_id: string | null
  recorded_by_profile_id: string
  received_at: string
  notes_internal: string | null
  created_at: string
}

export type CampaignExpenseRow = {
  id: string
  campaign_id: string
  expense_category: ExpenseCategory
  amount: number
  vendor_label: string | null
  event_id: string | null
  county_id: string | null
  recorded_by_profile_id: string
  incurred_at: string
  notes_internal: string | null
  created_at: string
}

export type CampaignBudgetAllocationRow = {
  id: string
  campaign_id: string
  period_start: string
  period_end: string
  budget_category: BudgetCategory
  allocated_amount: number
  county_id: string | null
  priority_weight: number
  notes_internal: string | null
  recorded_by_profile_id: string
  created_at: string
}

export type CampaignResourceDeploymentRow = {
  id: string
  campaign_id: string
  deployment_kind: DeploymentKind
  amount: number
  county_id: string | null
  event_id: string | null
  rationale: string | null
  recorded_by_profile_id: string
  deployed_at: string
  created_at: string
}

export type FinanceLeadershipSummaryRow = {
  total_donations: number
  total_expenses: number
  donation_count: number
  expense_count: number
  expense_by_category: Record<string, number>
}

function mapDonation(r: Record<string, unknown>): CampaignDonationRow {
  return {
    id: String(r.id ?? ''),
    campaign_id: String(r.campaign_id ?? 'default'),
    fund_source_slug: r.fund_source_slug as CampaignDonationRow['fund_source_slug'],
    amount: Number(r.amount ?? 0),
    donor_amount_tier: r.donor_amount_tier as CampaignDonationRow['donor_amount_tier'],
    channel: r.channel as CampaignDonationRow['channel'],
    event_id: r.event_id != null ? String(r.event_id) : null,
    county_id: r.county_id != null ? String(r.county_id) : null,
    recorded_by_profile_id: String(r.recorded_by_profile_id ?? ''),
    received_at: String(r.received_at ?? ''),
    notes_internal: r.notes_internal != null ? String(r.notes_internal) : null,
    created_at: String(r.created_at ?? ''),
  }
}

function mapExpense(r: Record<string, unknown>): CampaignExpenseRow {
  return {
    id: String(r.id ?? ''),
    campaign_id: String(r.campaign_id ?? 'default'),
    expense_category: r.expense_category as CampaignExpenseRow['expense_category'],
    amount: Number(r.amount ?? 0),
    vendor_label: r.vendor_label != null ? String(r.vendor_label) : null,
    event_id: r.event_id != null ? String(r.event_id) : null,
    county_id: r.county_id != null ? String(r.county_id) : null,
    recorded_by_profile_id: String(r.recorded_by_profile_id ?? ''),
    incurred_at: String(r.incurred_at ?? ''),
    notes_internal: r.notes_internal != null ? String(r.notes_internal) : null,
    created_at: String(r.created_at ?? ''),
  }
}

function mapBudget(r: Record<string, unknown>): CampaignBudgetAllocationRow {
  return {
    id: String(r.id ?? ''),
    campaign_id: String(r.campaign_id ?? 'default'),
    period_start: String(r.period_start ?? ''),
    period_end: String(r.period_end ?? ''),
    budget_category: r.budget_category as CampaignBudgetAllocationRow['budget_category'],
    allocated_amount: Number(r.allocated_amount ?? 0),
    county_id: r.county_id != null ? String(r.county_id) : null,
    priority_weight: Number(r.priority_weight ?? 50),
    notes_internal: r.notes_internal != null ? String(r.notes_internal) : null,
    recorded_by_profile_id: String(r.recorded_by_profile_id ?? ''),
    created_at: String(r.created_at ?? ''),
  }
}

function mapDeployment(r: Record<string, unknown>): CampaignResourceDeploymentRow {
  return {
    id: String(r.id ?? ''),
    campaign_id: String(r.campaign_id ?? 'default'),
    deployment_kind: r.deployment_kind as CampaignResourceDeploymentRow['deployment_kind'],
    amount: Number(r.amount ?? 0),
    county_id: r.county_id != null ? String(r.county_id) : null,
    event_id: r.event_id != null ? String(r.event_id) : null,
    rationale: r.rationale != null ? String(r.rationale) : null,
    recorded_by_profile_id: String(r.recorded_by_profile_id ?? ''),
    deployed_at: String(r.deployed_at ?? ''),
    created_at: String(r.created_at ?? ''),
  }
}

export async function fetchFinanceLeadershipSummary(): Promise<FinanceLeadershipSummaryRow | null> {
  if (isDevAuthBypassEnabled()) {
    return {
      total_donations: 0,
      total_expenses: 0,
      donation_count: 0,
      expense_count: 0,
      expense_by_category: {},
    }
  }
  const { data, error } = await supabase.rpc('finance_leadership_summary')
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const rawCat = r.expense_by_category
  const expense_by_category: Record<string, number> = {}
  if (rawCat && typeof rawCat === 'object' && !Array.isArray(rawCat)) {
    for (const [k, v] of Object.entries(rawCat)) {
      expense_by_category[k] = Number(v) || 0
    }
  }
  return {
    total_donations: Number(r.total_donations ?? 0),
    total_expenses: Number(r.total_expenses ?? 0),
    donation_count: Number(r.donation_count ?? 0),
    expense_count: Number(r.expense_count ?? 0),
    expense_by_category,
  }
}

export async function fetchDonations(limit = 200): Promise<CampaignDonationRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('campaign_donations')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((x) => mapDonation(x as Record<string, unknown>))
}

export async function fetchExpenses(limit = 200): Promise<CampaignExpenseRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('campaign_expenses')
    .select('*')
    .order('incurred_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((x) => mapExpense(x as Record<string, unknown>))
}

export async function fetchBudgetAllocations(limit = 100): Promise<CampaignBudgetAllocationRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('campaign_budget_allocations')
    .select('*')
    .order('period_start', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((x) => mapBudget(x as Record<string, unknown>))
}

export async function fetchVoterConversionContactAttemptCount(): Promise<number> {
  if (isDevAuthBypassEnabled()) return 0
  const { count, error } = await supabase
    .from('voter_conversion_contact_attempts')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function fetchResourceDeployments(limit = 100): Promise<CampaignResourceDeploymentRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('campaign_resource_deployments')
    .select('*')
    .order('deployed_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((x) => mapDeployment(x as Record<string, unknown>))
}
