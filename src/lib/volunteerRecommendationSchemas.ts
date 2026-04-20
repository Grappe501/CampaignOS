/**
 * Step 2.6 — Volunteer recommendation + engagement intelligence (shared types).
 */

import type { OpportunityClaimState } from './volunteerOpportunityDomain'

export type RecommendationStrength = 'strong' | 'good' | 'moderate' | 'weak'

export type VolunteerEligibilityState =
  | 'eligible'
  | 'blocked_onboarding'
  | 'blocked_training'
  | 'blocked_load'
  | 'blocked_no_self_claim'
  | 'blocked_role'
  | 'blocked_visibility'
  | 'blocked_other'

export type VolunteerRecommendationReason = {
  code: string
  detail: string
}

export type VolunteerRecommendationBlocker = {
  code: string
  detail: string
}

export type VolunteerRecommendationCandidate = {
  opportunityId: string
  eligibilityState: VolunteerEligibilityState
  claimState: OpportunityClaimState
  deterministicFitScore: number
  semanticSimilarityScore: number | null
  baseReasons: VolunteerRecommendationReason[]
  blockers: VolunteerRecommendationBlocker[]
}

export type VolunteerRecommendationResult = {
  volunteerId: string
  opportunityId: string
  /** Denormalized for volunteer UI (no extra join). */
  opportunityTitle?: string
  locationLabel?: string | null
  commitmentType?: string
  startsAt?: string | null
  priority?: string
  eligibilityState: VolunteerEligibilityState
  deterministicFitScore: number
  semanticSimilarityScore: number | null
  aiFitScore: number | null
  finalRankScore: number
  recommendationStrength: RecommendationStrength
  reasonsJson: VolunteerRecommendationReason[]
  blockersJson: VolunteerRecommendationBlocker[]
  suggestedNextStep: string | null
  generatedAt: string
  modelName: string | null
  explanationSummary?: string | null
  confidence?: number | null
}

export type VolunteerRecommendationBatch = {
  id: string
  volunteerId: string
  campaignId: string
  modelName: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
}

export type VolunteerRecommendationSnapshot = {
  id: string
  recommendationBatchId: string
  volunteerId: string
  opportunityId: string
  eligibilityState: string
  deterministicFitScore: number | null
  semanticSimilarityScore: number | null
  aiFitScore: number | null
  finalRankScore: number | null
  recommendationStrength: string | null
  reasonsJson: unknown
  blockersJson: unknown
  suggestedNextStep: string | null
  modelName: string | null
  createdAt: string
}

export type VolunteerEngagementEventType =
  | 'viewed_recommended_opportunity'
  | 'opened_opportunity_detail'
  | 'saved_opportunity'
  | 'unsaved_opportunity'
  | 'ignored_opportunity'
  | 'dismissed_recommendation'
  | 'claimed_opportunity'
  | 'declined_opportunity'
  | 'completed_assignment'
  | 'missed_shift'
  | 'clicked_recommendation'
  | 'accepted_invite'
  | 'returned_to_recommendation'
  | 'recommendation_hidden_due_to_blocker'

export type VolunteerEngagementEvent = {
  id: string
  volunteerId: string
  opportunityId: string | null
  eventType: VolunteerEngagementEventType
  eventValue: number | null
  metadataJson: Record<string, unknown>
  createdAt: string
}

export type EngagementCategory =
  | 'highly_active'
  | 'warming_up'
  | 'steady'
  | 'drifting'
  | 'inactive'

export type VolunteerEngagementSummary = {
  volunteerId: string
  engagementScore: number
  engagementCategory: EngagementCategory
  trendDirection: 'up' | 'flat' | 'down'
  topInterestThemes: string[]
  actionRecommendation: string
  windowDays: number
  eventsInWindow: number
}

export type VolunteerOpportunityPreferenceProfile = {
  taskManagementOptIn: boolean
  prefersSelfClaim: boolean
  prefersDirectAssignment: boolean
  preferredRolesJson: string[]
  preferredRegionsJson: string[]
  preferredCommitmentTypesJson: string[]
  preferredTimeWindowsJson: unknown[]
  maxActiveAssignments: number | null
  notificationPreferencesJson: Record<string, unknown>
  recommendationOptIn: boolean
  engagementTrackingOptIn: boolean
}

export const DEFAULT_VOLUNTEER_OPPORTUNITY_PREFERENCE_PROFILE: VolunteerOpportunityPreferenceProfile =
  {
    taskManagementOptIn: true,
    prefersSelfClaim: true,
    prefersDirectAssignment: false,
    preferredRolesJson: [],
    preferredRegionsJson: [],
    preferredCommitmentTypesJson: [],
    preferredTimeWindowsJson: [],
    maxActiveAssignments: null,
    notificationPreferencesJson: {},
    recommendationOptIn: true,
    engagementTrackingOptIn: true,
  }

export function parseVolunteerOpportunityPreferenceProfile(
  raw: unknown,
): VolunteerOpportunityPreferenceProfile {
  const d = DEFAULT_VOLUNTEER_OPPORTUNITY_PREFERENCE_PROFILE
  if (!raw || typeof raw !== 'object') return { ...d }
  const o = raw as Record<string, unknown>
  return {
    taskManagementOptIn:
      typeof o.task_management_opt_in === 'boolean' ? o.task_management_opt_in : d.taskManagementOptIn,
    prefersSelfClaim:
      typeof o.prefers_self_claim === 'boolean' ? o.prefers_self_claim : d.prefersSelfClaim,
    prefersDirectAssignment:
      typeof o.prefers_direct_assignment === 'boolean'
        ? o.prefers_direct_assignment
        : d.prefersDirectAssignment,
    preferredRolesJson: Array.isArray(o.preferred_roles_json)
      ? (o.preferred_roles_json as string[]).filter((x) => typeof x === 'string')
      : d.preferredRolesJson,
    preferredRegionsJson: Array.isArray(o.preferred_regions_json)
      ? (o.preferred_regions_json as string[]).filter((x) => typeof x === 'string')
      : d.preferredRegionsJson,
    preferredCommitmentTypesJson: Array.isArray(o.preferred_commitment_types_json)
      ? (o.preferred_commitment_types_json as string[]).filter((x) => typeof x === 'string')
      : d.preferredCommitmentTypesJson,
    preferredTimeWindowsJson: Array.isArray(o.preferred_time_windows_json)
      ? (o.preferred_time_windows_json as unknown[])
      : d.preferredTimeWindowsJson,
    maxActiveAssignments:
      typeof o.max_active_assignments === 'number' && Number.isFinite(o.max_active_assignments)
        ? o.max_active_assignments
        : o.max_active_assignments === null
          ? null
          : d.maxActiveAssignments,
    notificationPreferencesJson:
      o.notification_preferences_json && typeof o.notification_preferences_json === 'object'
        ? (o.notification_preferences_json as Record<string, unknown>)
        : d.notificationPreferencesJson,
    recommendationOptIn:
      typeof o.recommendation_opt_in === 'boolean' ? o.recommendation_opt_in : d.recommendationOptIn,
    engagementTrackingOptIn:
      typeof o.engagement_tracking_opt_in === 'boolean'
        ? o.engagement_tracking_opt_in
        : d.engagementTrackingOptIn,
  }
}

export function toPreferenceProfileJson(p: VolunteerOpportunityPreferenceProfile): Record<string, unknown> {
  return {
    task_management_opt_in: p.taskManagementOptIn,
    prefers_self_claim: p.prefersSelfClaim,
    prefers_direct_assignment: p.prefersDirectAssignment,
    preferred_roles_json: p.preferredRolesJson,
    preferred_regions_json: p.preferredRegionsJson,
    preferred_commitment_types_json: p.preferredCommitmentTypesJson,
    preferred_time_windows_json: p.preferredTimeWindowsJson,
    max_active_assignments: p.maxActiveAssignments,
    notification_preferences_json: p.notificationPreferencesJson,
    recommendation_opt_in: p.recommendationOptIn,
    engagement_tracking_opt_in: p.engagementTrackingOptIn,
  }
}
