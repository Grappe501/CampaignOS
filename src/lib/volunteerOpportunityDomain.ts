/**
 * Volunteer Opportunity Marketplace — domain types (maps to volunteer_opportunities + virtual merged rows).
 */

export const OPPORTUNITY_SOURCE_TYPES = [
  'assignment',
  'shift_slot',
  'staffing_requirement',
  'onboarding_step',
  'training_support',
  'custom_opportunity',
] as const

export type OpportunitySourceType = (typeof OPPORTUNITY_SOURCE_TYPES)[number]

export type OpportunityCommitmentType = 'task' | 'shift' | 'hybrid'

export type OpportunityMarketplaceStatus = 'open' | 'paused' | 'filled' | 'archived' | 'cancelled'

export type OpportunityVisibilityScope = 'public' | 'campaign' | 'team_coordinator_only'

export type OpportunityClaimState =
  | 'eligible'
  | 'blocked_onboarding'
  | 'blocked_training'
  | 'blocked_load'
  | 'blocked_no_self_claim'
  | 'blocked_role'
  | 'blocked_other'

export type OpportunityEligibilitySummary = {
  canClaim: boolean
  claimState: OpportunityClaimState
  reasons: string[]
}

export type OpportunityRecommendationReason = {
  code: string
  detail: string
  scoreImpact: number
}

export type OpportunityRecommendationSummary = {
  recommended: boolean
  reasons: OpportunityRecommendationReason[]
}

export type OpportunityCoverageSummary = {
  quantityOpen: number
  quantityFilled: number
  atRisk: boolean
}

export type VolunteerOpportunityFilterState = {
  search: string
  roleSlug: string | null
  category: string | null
  eventId: string | null
  commitmentType: OpportunityCommitmentType | null
  trainingRequiredOnly: boolean
  selfClaimOnly: boolean
  recommendedOnly: boolean
  urgentOnly: boolean
  dateFrom: string | null
  dateTo: string | null
  regionLabel: string | null
}

export type VolunteerOpportunity = {
  id: string
  campaignId: string
  sourceType: OpportunitySourceType
  sourceId: string
  title: string
  description: string | null
  roleSlug: string | null
  eventId: string | null
  shiftId: string | null
  shiftSlotId: string | null
  staffingRequirementId: string | null
  opportunityType: string
  category: string
  startsAt: string | null
  endsAt: string | null
  dueAt: string | null
  locationLabel: string | null
  regionLabel: string | null
  commitmentType: OpportunityCommitmentType
  quantityOpen: number
  quantityFilled: number
  selfClaimAllowed: boolean
  coordinatorAssignmentAllowed: boolean
  requiredSkillsJson: unknown[]
  preferredSkillsJson: unknown[]
  requiredTrainingJson: unknown[]
  onboardingRequired: boolean
  reliabilityPreference: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: OpportunityMarketplaceStatus
  visibilityScope: OpportunityVisibilityScope
  metadataJson: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
  /** True when merged from live sources, not yet persisted in volunteer_opportunities. */
  virtual?: boolean
}

export const DEFAULT_MARKETPLACE_FILTERS: VolunteerOpportunityFilterState = {
  search: '',
  roleSlug: null,
  category: null,
  eventId: null,
  commitmentType: null,
  trainingRequiredOnly: false,
  selfClaimOnly: false,
  recommendedOnly: false,
  urgentOnly: false,
  dateFrom: null,
  dateTo: null,
  regionLabel: null,
}
