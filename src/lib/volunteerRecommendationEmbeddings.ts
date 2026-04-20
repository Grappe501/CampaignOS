/**
 * Embedding text builders + cosine similarity (vectors stored as number[] / jsonb).
 */

import type { VolunteerProfile, VolunteerSkill, VolunteerInterest } from './volunteerCommandDomain'
import type { VolunteerOpportunity } from './volunteerOpportunityDomain'
import type { VolunteerOpportunityPreferenceProfile } from './volunteerRecommendationSchemas'
import { requestVolunteerIntelligenceEmbed } from './api/volunteerIntelligence'
import { supabase } from './supabaseClient'

export function hashEmbeddingText(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h >>> 0).toString(16)
}

export function buildVolunteerRecommendationText(input: {
  volunteer: VolunteerProfile
  skills: VolunteerSkill[]
  interests: VolunteerInterest[]
  prefs: VolunteerOpportunityPreferenceProfile
  /** Safe notes only — never pass notes_internal */
  publicNotes?: string | null
  completedRoleSlugs: string[]
}): string {
  const { volunteer, skills, interests, prefs, publicNotes, completedRoleSlugs } = input
  const lines = [
    `Display: ${volunteer.displayName ?? 'Volunteer'}`,
    `Preferred roles: ${volunteer.preferredRoleSlugs.join(', ')}`,
    `Location: ${volunteer.locationText ?? ''}`,
    `Onboarding: ${volunteer.onboardingStatus}`,
    `Skills: ${skills.map((s) => s.skillSlug).join(', ')}`,
    `Interests: ${interests.map((i) => i.interestSlug).join(', ')}`,
    `Prefs roles: ${prefs.preferredRolesJson.join(', ')}`,
    `Prefs regions: ${prefs.preferredRegionsJson.join(', ')}`,
    `Commitment prefs: ${prefs.preferredCommitmentTypesJson.join(', ')}`,
    `Recent completed roles: ${completedRoleSlugs.slice(0, 12).join(', ')}`,
  ]
  if (publicNotes?.trim()) lines.push(`Notes: ${publicNotes.trim().slice(0, 500)}`)
  return lines.join('\n')
}

export function buildOpportunityRecommendationText(o: VolunteerOpportunity): string {
  return [
    `Title: ${o.title}`,
    o.description ? `Description: ${o.description.slice(0, 2000)}` : '',
    `Role: ${o.roleSlug ?? ''}`,
    `Type: ${o.opportunityType} / ${o.category}`,
    `Commitment: ${o.commitmentType}`,
    `Event: ${o.eventId ?? ''}`,
    `Shift: ${o.shiftId ?? o.shiftSlotId ?? ''}`,
    `Location: ${o.locationLabel ?? ''}`,
    `Region: ${o.regionLabel ?? ''}`,
    `Required skills: ${JSON.stringify(o.requiredSkillsJson)}`,
    `Preferred skills: ${JSON.stringify(o.preferredSkillsJson)}`,
    `Training: ${JSON.stringify(o.requiredTrainingJson)}`,
    `Priority: ${o.priority}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

export async function fetchEmbeddingVector(text: string): Promise<number[]> {
  const res = await requestVolunteerIntelligenceEmbed(text)
  return res.embedding
}

export async function upsertVolunteerProfileEmbedding(input: {
  volunteerId: string
  embeddedText: string
  embeddingVector: number[]
  model: string
}): Promise<void> {
  const textHash = hashEmbeddingText(input.embeddedText)
  const { error } = await supabase.from('volunteer_profile_embeddings').upsert(
    {
      volunteer_id: input.volunteerId,
      embedding_model: input.model,
      text_hash: textHash,
      embedded_text: input.embeddedText.slice(0, 12000),
      embedding_vector: input.embeddingVector,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'volunteer_id' },
  )
  if (error) console.warn('upsertVolunteerProfileEmbedding', error.message)
}

export async function upsertOpportunityEmbedding(input: {
  campaignId: string
  sourceType: string
  sourceId: string
  embeddedText: string
  embeddingVector: number[]
  model: string
}): Promise<void> {
  const textHash = hashEmbeddingText(input.embeddedText)
  const { error } = await supabase.from('volunteer_opportunity_embeddings').upsert(
    {
      campaign_id: input.campaignId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      embedding_model: input.model,
      text_hash: textHash,
      embedded_text: input.embeddedText.slice(0, 12000),
      embedding_vector: input.embeddingVector,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id,source_type,source_id' },
  )
  if (error) console.warn('upsertOpportunityEmbedding', error.message)
}

export async function getSemanticOpportunityMatchesForVolunteer(input: {
  volunteerId: string
  campaignId: string
  opportunityIdToEmbedding: Map<string, number[]>
}): Promise<Map<string, number>> {
  const scores = new Map<string, number>()
  const { data: row, error } = await supabase
    .from('volunteer_profile_embeddings')
    .select('embedding_vector')
    .eq('volunteer_id', input.volunteerId)
    .maybeSingle()

  if (error || !row) return scores
  const v = (row as { embedding_vector: unknown }).embedding_vector
  if (!Array.isArray(v)) return scores
  const va = v.map((x) => Number(x)) as number[]

  for (const [oppId, emb] of input.opportunityIdToEmbedding) {
    scores.set(oppId, cosineSimilarity(va, emb))
  }
  return scores
}

export async function loadVolunteerEmbeddingVector(volunteerId: string): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('volunteer_profile_embeddings')
    .select('embedding_vector')
    .eq('volunteer_id', volunteerId)
    .maybeSingle()
  if (error || !data) return null
  const v = (data as { embedding_vector: unknown }).embedding_vector
  if (!Array.isArray(v)) return null
  return v.map((x) => Number(x))
}

export async function loadOpportunityEmbeddingVector(
  campaignId: string,
  sourceType: string,
  sourceId: string,
): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('volunteer_opportunity_embeddings')
    .select('embedding_vector')
    .eq('campaign_id', campaignId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle()
  if (error || !data) return null
  const v = (data as { embedding_vector: unknown }).embedding_vector
  if (!Array.isArray(v)) return null
  return v.map((x) => Number(x))
}

/** Pair volunteers to an opportunity by embedding similarity (coordinator / matching). */
export async function getSemanticVolunteerMatchesForOpportunity(input: {
  campaignId: string
  opportunitySourceType: string
  opportunitySourceId: string
  volunteerIds: string[]
}): Promise<Array<{ volunteerId: string; similarity: number }>> {
  const { data: row, error } = await supabase
    .from('volunteer_opportunity_embeddings')
    .select('embedding_vector')
    .eq('campaign_id', input.campaignId)
    .eq('source_type', input.opportunitySourceType)
    .eq('source_id', input.opportunitySourceId)
    .maybeSingle()

  if (error || !row) return []
  const ov = (row as { embedding_vector: unknown }).embedding_vector
  if (!Array.isArray(ov)) return []
  const oa = ov.map((x) => Number(x)) as number[]

  const out: Array<{ volunteerId: string; similarity: number }> = []
  for (const vid of input.volunteerIds) {
    const vv = await loadVolunteerEmbeddingVector(vid)
    if (!vv) continue
    out.push({ volunteerId: vid, similarity: cosineSimilarity(oa, vv) })
  }
  out.sort((a, b) => b.similarity - a.similarity)
  return out
}
