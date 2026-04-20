/**
 * Orchestrates deterministic fit, optional embeddings, AI rerank (server), and snapshot persistence.
 */

import {
  fetchAssignmentsForVolunteer,
  fetchTrainingForVolunteer,
  fetchVolunteerInterests,
  fetchVolunteerRoleDefinitions,
  fetchVolunteerSkills,
} from './volunteerCommandApi'
import type { VolunteerProfile } from './volunteerCommandDomain'
import { fetchMergedMarketplaceOpportunities } from './volunteerOpportunityMerge'
import type { VolunteerOpportunity } from './volunteerOpportunityDomain'
import { canVolunteerClaimOpportunity } from './volunteerOpportunityEligibility'
import {
  eligibilitySummaryToState,
  canVolunteerViewOpportunity,
  getVolunteerEligibilityBlockers,
} from './volunteerEligibilityService'
import { calculateVolunteerOpportunityFit } from './volunteerOpportunityRanking'
import {
  parseVolunteerOpportunityPreferenceProfile,
  type VolunteerRecommendationBlocker,
  type VolunteerRecommendationReason,
  type VolunteerRecommendationResult,
  type RecommendationStrength,
} from './volunteerRecommendationSchemas'
import { requestVolunteerIntelligenceRecommend } from './api/volunteerIntelligence'
import {
  buildOpportunityRecommendationText,
  buildVolunteerRecommendationText,
  fetchEmbeddingVector,
  loadOpportunityEmbeddingVector,
  loadVolunteerEmbeddingVector,
  upsertOpportunityEmbedding,
  upsertVolunteerProfileEmbedding,
} from './volunteerRecommendationEmbeddings'
import {
  fetchLatestRecommendationBatchAgeSeconds,
  insertVolunteerRecommendationBatch,
  insertVolunteerRecommendationSnapshots,
} from './volunteerRecommendationSnapshots'

const CACHE_AI_SECONDS = 15 * 60
const TOP_N = 18

function mapStrength(s: string | undefined): RecommendationStrength {
  if (s === 'strong' || s === 'good' || s === 'moderate' || s === 'weak') return s
  return 'moderate'
}

function finalScore(det: number, sem: number | null, ai: number | null): number {
  const s = sem ?? det
  const a = ai ?? det
  return Math.max(0, Math.min(1, det * 0.45 + s * 0.25 + a * 0.35))
}

function blockersFromStrings(rows: string[]): VolunteerRecommendationBlocker[] {
  return rows.slice(0, 8).map((detail, i) => ({
    code: `b${i}`,
    detail,
  }))
}

function reasonsFromStrings(rows: string[]): VolunteerRecommendationReason[] {
  return rows.slice(0, 8).map((detail, i) => ({
    code: `r${i}`,
    detail,
  }))
}

export type GenerateRecommendationsOptions = {
  campaignId?: string
  isCoordinator?: boolean
  forceRefresh?: boolean
  skipAi?: boolean
  skipEmbeddingRefresh?: boolean
}

/**
 * Full pipeline: deterministic candidates → optional embedding refresh → optional AI rerank → snapshots.
 */
export async function generateVolunteerOpportunityRecommendations(
  volunteer: VolunteerProfile,
  opts: GenerateRecommendationsOptions = {},
): Promise<{
  results: VolunteerRecommendationResult[]
  usedAi: boolean
  modelName: string | null
  fallbackReason?: string
}> {
  const campaignId = opts.campaignId ?? volunteer.campaignId ?? 'default'
  const prefs = volunteer.recommendationPreferences ?? parseVolunteerOpportunityPreferenceProfile(null)
  if (!prefs.recommendationOptIn) {
    const detOnly = await buildDeterministicOnly(volunteer, campaignId, opts.isCoordinator ?? false)
    return { results: detOnly, usedAi: false, modelName: null, fallbackReason: 'recommendations opted out' }
  }

  const opportunities = await fetchMergedMarketplaceOpportunities(campaignId)
  const [skills, interests, training, assignments, roles] = await Promise.all([
    fetchVolunteerSkills(volunteer.id),
    fetchVolunteerInterests(volunteer.id),
    fetchTrainingForVolunteer(volunteer.id),
    fetchAssignmentsForVolunteer(volunteer.id),
    fetchVolunteerRoleDefinitions(),
  ])

  const completedRoleSlugs = assignments
    .filter((a) => a.status === 'completed')
    .map((a) => a.roleSlug)

  const viewable: VolunteerOpportunity[] = []
  for (const o of opportunities) {
    const v = canVolunteerViewOpportunity({ opportunity: o, isCoordinator: opts.isCoordinator ?? false })
    if (v.canView) viewable.push(o)
  }

  type Row = {
    opportunity: VolunteerOpportunity
    det: number
    sem: number | null
    eligibilityState: VolunteerRecommendationResult['eligibilityState']
    claimBlockers: string[]
    canClaim: boolean
    fitReasons: VolunteerRecommendationReason[]
  }

  const scored: Row[] = []
  for (const o of viewable) {
    const role = roles.find((r) => r.roleSlug === (o.roleSlug ?? '')) ?? null
    const claim = canVolunteerClaimOpportunity({
      opportunity: o,
      volunteer,
      training,
      assignmentsForVolunteer: assignments,
      role,
    })
    const fit = calculateVolunteerOpportunityFit({
      volunteer,
      skills,
      training,
      assignments,
      prefs,
      opportunity: o,
      role,
    })
    const eligibilityState = eligibilitySummaryToState(claim, false)
    const claimBlockers = getVolunteerEligibilityBlockers(claim)
    const fitReasons: VolunteerRecommendationReason[] = [
      { code: 'deterministic_fit', detail: `Base fit ${(fit.baseScore * 100).toFixed(0)}%` },
    ]
    scored.push({
      opportunity: o,
      det: fit.baseScore,
      sem: null,
      eligibilityState,
      claimBlockers,
      canClaim: claim.canClaim,
      fitReasons,
    })
  }

  scored.sort((a, b) => b.det - a.det)
  const top = scored.slice(0, TOP_N)

  if (!opts.skipEmbeddingRefresh) {
    let volEmb = await loadVolunteerEmbeddingVector(volunteer.id)
    const volText = buildVolunteerRecommendationText({
      volunteer,
      skills,
      interests,
      prefs,
      publicNotes: null,
      completedRoleSlugs,
    })
    const needVol = !volEmb
    if (needVol) {
      try {
        const emb = await fetchEmbeddingVector(volText)
        volEmb = emb
        await upsertVolunteerProfileEmbedding({
          volunteerId: volunteer.id,
          embeddedText: volText,
          embeddingVector: emb,
          model: 'text-embedding-3-small',
        })
      } catch {
        /* optional */
      }
    }

    for (const row of top) {
      const o = row.opportunity
      const otext = buildOpportunityRecommendationText(o)
      let oemb = await loadOpportunityEmbeddingVector(campaignId, o.sourceType, o.id)
      if (!oemb) {
        try {
          const emb = await fetchEmbeddingVector(otext)
          oemb = emb
          await upsertOpportunityEmbedding({
            campaignId,
            sourceType: o.sourceType,
            sourceId: o.id,
            embeddedText: otext,
            embeddingVector: emb,
            model: 'text-embedding-3-small',
          })
        } catch {
          /* optional */
        }
      }
      if (volEmb && oemb) {
        const sim =
          volEmb.length === oemb.length
            ? (() => {
                let dot = 0
                let na = 0
                let nb = 0
                for (let i = 0; i < volEmb.length; i++) {
                  dot += volEmb[i] * oemb[i]
                  na += volEmb[i] * volEmb[i]
                  nb += oemb[i] * oemb[i]
                }
                const d = Math.sqrt(na) * Math.sqrt(nb)
                return d === 0 ? 0 : dot / d
              })()
            : null
        row.sem = sim
      }
    }
  }

  let usedAi = false
  let modelName: string | null = null
  let fallbackReason: string | undefined

  const age = await fetchLatestRecommendationBatchAgeSeconds(volunteer.id)
  const cacheOk = age != null && age < CACHE_AI_SECONDS && !opts.forceRefresh

  const volunteerSummary: Record<string, unknown> = {
    volunteer_id: volunteer.id,
    display_name: volunteer.displayName,
    onboarding_status: volunteer.onboardingStatus,
    preferred_roles: volunteer.preferredRoleSlugs,
    location: volunteer.locationText,
    skills: skills.map((s) => s.skillSlug),
    reliability: volunteer.reliabilityScore,
  }

  const candidates = top.map((row) => ({
    opportunity_id: row.opportunity.id,
    title: row.opportunity.title,
    role_slug: row.opportunity.roleSlug,
    commitment: row.opportunity.commitmentType,
    priority: row.opportunity.priority,
    deterministic_fit_score: row.det,
    semantic_similarity: row.sem,
    can_claim: row.canClaim,
    eligibility_state: row.eligibilityState,
    blockers: row.claimBlockers,
  }))

  let ranked: Awaited<ReturnType<typeof requestVolunteerIntelligenceRecommend>>['ranked'] = []

  if (!opts.skipAi && !cacheOk) {
    try {
      const ai = await requestVolunteerIntelligenceRecommend({ volunteerSummary, candidates })
      ranked = ai.ranked
      modelName = ai.model
      usedAi = true
    } catch (e) {
      fallbackReason = e instanceof Error ? e.message : 'AI unavailable'
    }
  } else if (cacheOk) {
    fallbackReason = 'using recent cache window for AI (skipped)'
  }

  const aiMap = new Map(ranked.map((r) => [r.opportunity_id, r]))
  const now = new Date().toISOString()
  const results: VolunteerRecommendationResult[] = top.map((row) => {
    const o = row.opportunity
    const ai = aiMap.get(o.id)
    const aiFit = ai ? Math.max(0, Math.min(1, ai.ai_fit_score)) : null
    const fs = finalScore(row.det, row.sem, aiFit)
    const reasons: VolunteerRecommendationReason[] = [...row.fitReasons]
    if (ai?.top_reasons?.length) {
      reasons.push(...reasonsFromStrings(ai.top_reasons))
    }
    const blockers: VolunteerRecommendationBlocker[] = []
    for (const b of row.claimBlockers) blockers.push({ code: 'eligibility', detail: b })
    if (ai?.blockers?.length) blockers.push(...blockersFromStrings(ai.blockers))

    return {
      volunteerId: volunteer.id,
      opportunityId: o.id,
      opportunityTitle: o.title,
      locationLabel: o.locationLabel,
      commitmentType: o.commitmentType,
      startsAt: o.startsAt ?? o.dueAt,
      priority: o.priority,
      eligibilityState: row.eligibilityState,
      deterministicFitScore: row.det,
      semanticSimilarityScore: row.sem,
      aiFitScore: aiFit,
      finalRankScore: fs,
      recommendationStrength: ai ? mapStrength(ai.recommendation_strength) : mapStrengthFromScore(fs),
      reasonsJson: reasons,
      blockersJson: blockers,
      suggestedNextStep: ai?.suggested_next_step?.trim() ? ai.suggested_next_step : null,
      generatedAt: now,
      modelName,
      explanationSummary: ai?.explanation_summary ?? null,
      confidence: ai?.confidence ?? null,
    }
  })

  results.sort((a, b) => b.finalRankScore - a.finalRankScore)

  if (results.length && usedAi) {
    const batch = await insertVolunteerRecommendationBatch({
      volunteerId: volunteer.id,
      campaignId,
      modelName,
      metadataJson: { used_ai: true, candidate_count: top.length },
    })
    if (batch?.id) {
      await insertVolunteerRecommendationSnapshots(batch.id, volunteer.id, results)
    }
  }

  return { results, usedAi, modelName, fallbackReason }
}

function mapStrengthFromScore(fs: number): RecommendationStrength {
  if (fs >= 0.78) return 'strong'
  if (fs >= 0.62) return 'good'
  if (fs >= 0.45) return 'moderate'
  return 'weak'
}

async function buildDeterministicOnly(
  volunteer: VolunteerProfile,
  campaignId: string,
  isCoordinator: boolean,
): Promise<VolunteerRecommendationResult[]> {
  const opportunities = await fetchMergedMarketplaceOpportunities(campaignId)
  const [skills, training, assignments, roles] = await Promise.all([
    fetchVolunteerSkills(volunteer.id),
    fetchTrainingForVolunteer(volunteer.id),
    fetchAssignmentsForVolunteer(volunteer.id),
    fetchVolunteerRoleDefinitions(),
  ])
  const prefs = volunteer.recommendationPreferences ?? parseVolunteerOpportunityPreferenceProfile(null)
  const now = new Date().toISOString()
  const out: VolunteerRecommendationResult[] = []
  for (const o of opportunities) {
    const v = canVolunteerViewOpportunity({ opportunity: o, isCoordinator })
    if (!v.canView) continue
    const role = roles.find((r) => r.roleSlug === (o.roleSlug ?? '')) ?? null
    const claim = canVolunteerClaimOpportunity({
      opportunity: o,
      volunteer,
      training,
      assignmentsForVolunteer: assignments,
      role,
    })
    const fit = calculateVolunteerOpportunityFit({
      volunteer,
      skills,
      training,
      assignments,
      prefs,
      opportunity: o,
      role,
    })
    const eligibilityState = eligibilitySummaryToState(claim, false)
    const blockers = getVolunteerEligibilityBlockers(claim).map((detail) => ({
      code: 'eligibility' as const,
      detail,
    }))
    out.push({
      volunteerId: volunteer.id,
      opportunityId: o.id,
      opportunityTitle: o.title,
      locationLabel: o.locationLabel,
      commitmentType: o.commitmentType,
      startsAt: o.startsAt ?? o.dueAt,
      priority: o.priority,
      eligibilityState,
      deterministicFitScore: fit.baseScore,
      semanticSimilarityScore: null,
      aiFitScore: null,
      finalRankScore: fit.baseScore,
      recommendationStrength: mapStrengthFromScore(fit.baseScore),
      reasonsJson: [{ code: 'deterministic', detail: `Base fit ${(fit.baseScore * 100).toFixed(0)}%` }],
      blockersJson: blockers,
      suggestedNextStep: null,
      generatedAt: now,
      modelName: null,
    })
  }
  out.sort((a, b) => b.finalRankScore - a.finalRankScore)
  return out.slice(0, TOP_N)
}

export async function rerankDeterministicCandidatesWithAI(
  volunteer: VolunteerProfile,
  opts?: GenerateRecommendationsOptions,
): Promise<ReturnType<typeof generateVolunteerOpportunityRecommendations>> {
  return generateVolunteerOpportunityRecommendations(volunteer, { ...opts, skipEmbeddingRefresh: true })
}

export function summarizeRecommendationReasons(results: VolunteerRecommendationResult[]): string {
  const top = results[0]
  if (!top) return 'No recommendations yet.'
  const r = top.reasonsJson[0]
  const detail = r && typeof r === 'object' && 'detail' in r ? String((r as { detail?: string }).detail) : ''
  return detail || 'Review open opportunities that fit your role preferences.'
}
