import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchVolunteerSkills } from '../lib/volunteerCommandApi'
import { fetchAssignmentsForVolunteer } from '../lib/volunteerCommandApi'
import { fetchVolunteerRoleDefinitions } from '../lib/volunteerCommandApi'
import type { VolunteerProfile, VolunteerSkill } from '../lib/volunteerCommandDomain'
import { fetchMergedMarketplaceOpportunities } from '../lib/volunteerOpportunityMerge'
import {
  recommendMarketplaceOpportunitiesForVolunteer,
  getUrgentOpportunities,
} from '../lib/volunteerOpportunityMatching'
import { computeMarketplaceAnalytics } from '../lib/volunteerOpportunityAnalytics'
import {
  applyMarketplaceFilters,
  buildRecommendedIdSet,
} from '../lib/volunteerMarketplaceFilters'
import {
  DEFAULT_MARKETPLACE_FILTERS,
  type VolunteerOpportunityFilterState,
} from '../lib/volunteerOpportunityDomain'
import { canVolunteerClaimOpportunity } from '../lib/volunteerOpportunityEligibility'
import { claimOpportunity } from '../lib/volunteerOpportunityClaim'
import { fetchTrainingForVolunteer } from '../lib/volunteerCommandApi'
import { recomputeAndPersistVolunteerReliability } from '../lib/volunteerCommandReliabilityCompute'
import { logVolunteerEngagementEvent } from '../lib/volunteerEngagementTracker'

export function useVolunteerMarketplace(volunteer: VolunteerProfile | null, profileId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [opportunities, setOpportunities] = useState<Awaited<
    ReturnType<typeof fetchMergedMarketplaceOpportunities>
  >>([])
  const [skills, setSkills] = useState<VolunteerSkill[]>([])
  const [filters, setFilters] = useState<VolunteerOpportunityFilterState>(DEFAULT_MARKETPLACE_FILTERS)
  const [claimBusy, setClaimBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [merged, sk] = await Promise.all([
        fetchMergedMarketplaceOpportunities('default'),
        volunteer ? fetchVolunteerSkills(volunteer.id) : Promise.resolve([] as VolunteerSkill[]),
      ])
      setOpportunities(merged)
      setSkills(sk)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load opportunities'))
    } finally {
      setLoading(false)
    }
  }, [volunteer?.id])

  useEffect(() => {
    void load()
  }, [load])

  const recommended = useMemo(() => {
    if (!volunteer) return [] as ReturnType<typeof recommendMarketplaceOpportunitiesForVolunteer>
    return recommendMarketplaceOpportunitiesForVolunteer(volunteer, skills, opportunities)
  }, [volunteer, skills, opportunities])

  const recommendedIds = useMemo(() => buildRecommendedIdSet(recommended), [recommended])

  const filtered = useMemo(
    () => applyMarketplaceFilters(opportunities, filters, recommendedIds),
    [opportunities, filters, recommendedIds],
  )

  const analytics = useMemo(() => computeMarketplaceAnalytics(opportunities), [opportunities])

  const urgent = useMemo(() => getUrgentOpportunities(opportunities), [opportunities])

  const [roleList, setRoleList] = useState<Awaited<ReturnType<typeof fetchVolunteerRoleDefinitions>>>([])

  useEffect(() => {
    void fetchVolunteerRoleDefinitions().then(setRoleList).catch(() => setRoleList([]))
  }, [])

  const claim = useCallback(
    async (opp: (typeof opportunities)[0]) => {
      if (!volunteer || !profileId) return { ok: false as const, error: 'Sign in and create a volunteer profile.' }
      setClaimBusy(opp.id)
      try {
        const [training, mine] = await Promise.all([
          fetchTrainingForVolunteer(volunteer.id),
          fetchAssignmentsForVolunteer(volunteer.id),
        ])
        const role = roleList.find((r) => r.roleSlug === (opp.roleSlug ?? '')) ?? null
        const el = canVolunteerClaimOpportunity({
          opportunity: opp,
          volunteer,
          training,
          assignmentsForVolunteer: mine,
          role,
        })
        if (!el.canClaim) return { ok: false as const, error: el.reasons.join(' ') }

        const res = await claimOpportunity({
          volunteerId: volunteer.id,
          profileId,
          opportunity: opp,
        })
        if (!res.ok) return { ok: false as const, error: res.error }
        await recomputeAndPersistVolunteerReliability(volunteer.id).catch(() => {})
        if (volunteer.recommendationPreferences?.engagementTrackingOptIn !== false) {
          await logVolunteerEngagementEvent({
            volunteerId: volunteer.id,
            opportunityId: opp.id,
            eventType: 'claimed_opportunity',
            metadataJson: { role_slug: opp.roleSlug ?? null, source_type: opp.sourceType },
          }).catch(() => {})
        }
        await load()
        return { ok: true as const }
      } finally {
        setClaimBusy(null)
      }
    },
    [volunteer, profileId, roleList, load],
  )

  return {
    loading,
    error,
    refetch: load,
    opportunities,
    filtered,
    recommended,
    recommendedIds,
    urgent,
    analytics,
    filters,
    setFilters,
    claim,
    claimBusy,
    skills,
    roleList,
  }
}
