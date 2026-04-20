/**
 * Deterministic eligibility + view rules (source of truth — AI does not override).
 */

import type { VolunteerOpportunity, OpportunityEligibilitySummary } from './volunteerOpportunityDomain'
import type { VolunteerEligibilityState } from './volunteerRecommendationSchemas'

export function canVolunteerViewOpportunity(input: {
  opportunity: VolunteerOpportunity
  isCoordinator: boolean
}): { canView: boolean; reason?: string } {
  const { opportunity, isCoordinator } = input
  if (opportunity.visibilityScope === 'team_coordinator_only' && !isCoordinator) {
    return { canView: false, reason: 'Visible to coordinators only.' }
  }
  if (opportunity.status !== 'open' && opportunity.status !== 'paused') {
    return { canView: false, reason: 'Not listed.' }
  }
  return { canView: true }
}

export function eligibilitySummaryToState(
  summary: OpportunityEligibilitySummary,
  viewBlocked: boolean,
): VolunteerEligibilityState {
  if (viewBlocked) return 'blocked_visibility'
  switch (summary.claimState) {
    case 'eligible':
      return 'eligible'
    case 'blocked_onboarding':
      return 'blocked_onboarding'
    case 'blocked_training':
      return 'blocked_training'
    case 'blocked_load':
      return 'blocked_load'
    case 'blocked_no_self_claim':
      return 'blocked_no_self_claim'
    case 'blocked_role':
      return 'blocked_role'
    default:
      return 'blocked_other'
  }
}

export function getVolunteerEligibilityBlockers(summary: OpportunityEligibilitySummary): string[] {
  return summary.reasons.slice()
}

export function getVolunteerOpportunityBaseScore(input: {
  roleFit: number
  skillFit: number
  trainingFit: number
  availabilityFit: number
  geographyFit: number
  reliabilityFit: number
  preferenceFit: number
  loadFit: number
  recencyFit: number
  urgencyFit: number
}): number {
  const w = {
    role: 0.18,
    skill: 0.14,
    training: 0.12,
    availability: 0.1,
    geography: 0.08,
    reliability: 0.08,
    preference: 0.1,
    load: 0.1,
    recency: 0.05,
    urgency: 0.05,
  }
  const s =
    input.roleFit * w.role +
    input.skillFit * w.skill +
    input.trainingFit * w.training +
    input.availabilityFit * w.availability +
    input.geographyFit * w.geography +
    input.reliabilityFit * w.reliability +
    input.preferenceFit * w.preference +
    input.loadFit * w.load +
    input.recencyFit * w.recency +
    input.urgencyFit * w.urgency
  return Math.max(0, Math.min(1, s))
}
