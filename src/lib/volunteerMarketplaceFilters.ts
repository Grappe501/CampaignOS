/**
 * Client-side filter + search for marketplace lists.
 */

import type {
  OpportunityRecommendationSummary,
  VolunteerOpportunity,
  VolunteerOpportunityFilterState,
} from './volunteerOpportunityDomain'

export function applyMarketplaceFilters(
  rows: VolunteerOpportunity[],
  filters: VolunteerOpportunityFilterState,
  recommendedIds?: Set<string>,
): VolunteerOpportunity[] {
  const q = filters.search.trim().toLowerCase()
  return rows.filter((o) => {
    if (filters.urgentOnly && o.priority !== 'urgent') return false
    if (filters.selfClaimOnly && !o.selfClaimAllowed) return false
    if (filters.trainingRequiredOnly) {
      const tr = o.requiredTrainingJson
      if (!Array.isArray(tr) || tr.length === 0) return false
    }
    if (filters.roleSlug && o.roleSlug !== filters.roleSlug) return false
    if (filters.category && o.category !== filters.category) return false
    if (filters.eventId && o.eventId !== filters.eventId) return false
    if (filters.commitmentType && o.commitmentType !== filters.commitmentType) return false
    if (filters.regionLabel && (o.regionLabel ?? '').toLowerCase() !== filters.regionLabel.toLowerCase())
      return false
    if (filters.recommendedOnly && recommendedIds && !recommendedIds.has(o.id)) return false

    if (filters.dateFrom) {
      const t = o.startsAt ?? o.dueAt
      if (t && t < filters.dateFrom) return false
    }
    if (filters.dateTo) {
      const t = o.startsAt ?? o.dueAt
      if (t && t > filters.dateTo) return false
    }

    if (q) {
      const hay = `${o.title} ${o.description ?? ''} ${o.roleSlug ?? ''} ${o.locationLabel ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function buildRecommendedIdSet(
  rows: { opportunity: VolunteerOpportunity; summary: OpportunityRecommendationSummary }[],
): Set<string> {
  const s = new Set<string>()
  for (const r of rows) {
    if (r.summary.recommended) s.add(r.opportunity.id)
  }
  return s
}
