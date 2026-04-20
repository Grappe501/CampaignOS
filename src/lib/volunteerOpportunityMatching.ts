/**
 * Explainable marketplace recommendations for a volunteer.
 */

import type { VolunteerProfile, VolunteerSkill } from './volunteerCommandDomain'
import type {
  VolunteerOpportunity,
  OpportunityRecommendationSummary,
  OpportunityRecommendationReason,
} from './volunteerOpportunityDomain'

export function scoreOpportunityForVolunteer(
  volunteer: VolunteerProfile,
  skills: VolunteerSkill[],
  opportunity: VolunteerOpportunity,
): OpportunityRecommendationSummary {
  const reasons: OpportunityRecommendationReason[] = []
  let score = 0.5

  const skillSet = new Set(skills.map((s) => s.skillSlug))
  const pref = volunteer.preferredRoleSlugs ?? []
  if (opportunity.roleSlug && pref.includes(opportunity.roleSlug)) {
    reasons.push({ code: 'preferred_role', detail: 'Matches a role you prefer.', scoreImpact: 0.2 })
    score += 0.2
  }

  if (opportunity.roleSlug && skillSet.has(opportunity.roleSlug)) {
    reasons.push({ code: 'skill_overlap', detail: 'Overlaps with skills on your profile.', scoreImpact: 0.1 })
    score += 0.1
  }

  if (volunteer.locationText && opportunity.locationLabel) {
    const a = volunteer.locationText.toLowerCase()
    const b = opportunity.locationLabel.toLowerCase()
    if (a.length > 2 && b.length > 2 && (a.includes(b.slice(0, 5)) || b.includes(a.slice(0, 5)))) {
      reasons.push({ code: 'nearby', detail: 'Location looks close to yours.', scoreImpact: 0.08 })
      score += 0.08
    }
  }

  if (opportunity.priority === 'urgent') {
    reasons.push({ code: 'urgent', detail: 'Marked urgent by coordinators.', scoreImpact: 0.05 })
    score += 0.05
  }

  if (opportunity.sourceType === 'staffing_requirement') {
    reasons.push({ code: 'event_staff', detail: 'Supports a scheduled event.', scoreImpact: 0.06 })
    score += 0.06
  }

  score = Math.max(0, Math.min(1, score))
  return {
    recommended: score >= 0.62,
    reasons: reasons.slice(0, 5),
  }
}

export function recommendMarketplaceOpportunitiesForVolunteer(
  volunteer: VolunteerProfile | null,
  skills: VolunteerSkill[],
  opportunities: VolunteerOpportunity[],
  limit = 24,
): Array<{ opportunity: VolunteerOpportunity; summary: OpportunityRecommendationSummary }> {
  if (!volunteer) return []
  const scored = opportunities.map((o) => ({
    opportunity: o,
    summary: scoreOpportunityForVolunteer(volunteer, skills, o),
  }))
  scored.sort((a, b) => {
    const sa =
      a.summary.reasons.reduce((s, r) => s + r.scoreImpact, 0) +
      (a.summary.recommended ? 0.15 : 0)
    const sb =
      b.summary.reasons.reduce((s, r) => s + r.scoreImpact, 0) +
      (b.summary.recommended ? 0.15 : 0)
    return sb - sa
  })
  return scored.slice(0, limit)
}

export function getUrgentOpportunities(opportunities: VolunteerOpportunity[]): VolunteerOpportunity[] {
  return opportunities.filter((o) => o.priority === 'urgent' && o.quantityOpen > 0)
}

export function getUnfilledCriticalOpportunities(
  opportunities: VolunteerOpportunity[],
): VolunteerOpportunity[] {
  return opportunities.filter((o) => o.quantityOpen > 0 && (o.priority === 'urgent' || o.priority === 'high'))
}
