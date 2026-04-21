/**
 * Canonical finance / resource domain for CampaignOS (command layer, not accounting software).
 */

export const FUND_SOURCE_SLUGS = [
  'individual_donor',
  'event_fundraiser',
  'digital',
  'major_donor',
  'pac_other',
] as const
export type FundSourceSlug = (typeof FUND_SOURCE_SLUGS)[number]

export const DONOR_AMOUNT_TIERS = [
  'under_100',
  '100_500',
  '500_2500',
  '2500_plus',
  'unknown',
] as const
export type DonorAmountTier = (typeof DONOR_AMOUNT_TIERS)[number]

export const DONATION_CHANNELS = ['online', 'event', 'mail', 'in_person', 'other', 'unknown'] as const
export type DonationChannel = (typeof DONATION_CHANNELS)[number]

export const EXPENSE_CATEGORIES = [
  'event',
  'staffing',
  'media',
  'field_ops',
  'admin',
  'gotv',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const BUDGET_CATEGORIES = [
  'event',
  'staffing',
  'media',
  'field_ops',
  'admin',
  'gotv',
  'reserve',
  'other',
] as const
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

export const DEPLOYMENT_KINDS = [
  'media_buy',
  'field_surge',
  'staff_capacity',
  'event_support',
  'gotv_infrastructure',
  'tech',
  'other',
] as const
export type DeploymentKind = (typeof DEPLOYMENT_KINDS)[number]

export type FinanceRoiInputs = {
  /** Sum donations / revenue entries (same currency units). */
  total_revenue: number
  total_expenses: number
  /** Count of voter contact attempts (DB or estimate). */
  voter_contact_attempts: number
  /** Tracked voters in conversion state (denominator for cost per tracked). */
  tracked_voters: number
  /** Volunteers active or recruited (denominator for cost per volunteer). */
  volunteer_count: number
}

export type FinanceRoiMetrics = {
  net_position: number
  cost_per_contact: number | null
  cost_per_tracked_voter: number | null
  cost_per_volunteer: number | null
  burn_ratio: number | null
}

export const FUND_SOURCE_LABELS: Record<FundSourceSlug, string> = {
  individual_donor: 'Individual donor',
  event_fundraiser: 'Event / fundraiser',
  digital: 'Digital',
  major_donor: 'Major donor',
  pac_other: 'PAC / other (compliance)',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  event: 'Events',
  staffing: 'Staffing',
  media: 'Media',
  field_ops: 'Field operations',
  admin: 'Admin',
  gotv: 'GOTV',
  other: 'Other',
}

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  ...EXPENSE_CATEGORY_LABELS,
  reserve: 'Reserve',
}
