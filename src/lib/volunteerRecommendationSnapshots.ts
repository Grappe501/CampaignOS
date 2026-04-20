/**
 * Persist recommendation batches + snapshots (audit trail).
 */

import { supabase } from './supabaseClient'
import type { VolunteerRecommendationResult } from './volunteerRecommendationSchemas'

export async function insertVolunteerRecommendationBatch(input: {
  volunteerId: string
  campaignId: string
  modelName: string | null
  metadataJson?: Record<string, unknown>
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('volunteer_recommendation_batches')
    .insert({
      volunteer_id: input.volunteerId,
      campaign_id: input.campaignId,
      model_name: input.modelName,
      metadata_json: input.metadataJson ?? {},
    })
    .select('id')
    .single()

  if (error) {
    console.warn('insertVolunteerRecommendationBatch', error.message)
    return null
  }
  return data ? { id: String((data as { id: string }).id) } : null
}

export async function insertVolunteerRecommendationSnapshots(
  batchId: string,
  volunteerId: string,
  rows: VolunteerRecommendationResult[],
): Promise<void> {
  if (rows.length === 0) return
  const payload = rows.map((r) => ({
    recommendation_batch_id: batchId,
    volunteer_id: volunteerId,
    opportunity_id: r.opportunityId,
    eligibility_state: r.eligibilityState,
    deterministic_fit_score: r.deterministicFitScore,
    semantic_similarity_score: r.semanticSimilarityScore,
    ai_fit_score: r.aiFitScore,
    final_rank_score: r.finalRankScore,
    recommendation_strength: r.recommendationStrength,
    reasons_json: r.reasonsJson,
    blockers_json: r.blockersJson,
    suggested_next_step: r.suggestedNextStep,
    model_name: r.modelName,
  }))

  const { error } = await supabase.from('volunteer_recommendation_snapshots').insert(payload)
  if (error) console.warn('insertVolunteerRecommendationSnapshots', error.message)
}

export async function fetchLatestRecommendationBatchAgeSeconds(
  volunteerId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('volunteer_recommendation_batches')
    .select('created_at')
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const t = new Date(String((data as { created_at: string }).created_at)).getTime()
  return (Date.now() - t) / 1000
}
