/**
 * Client for Netlify `volunteer-intelligence` (OpenAI embeddings + recommendation reasoning; server-side only).
 */

import { getNetlifyFunctionsOrigin } from './agentJones'

export function getVolunteerIntelligenceEndpointUrl(): string {
  const origin = getNetlifyFunctionsOrigin()
  const path = '/.netlify/functions/volunteer-intelligence'
  return origin ? `${origin}${path}` : path
}

export type VolunteerIntelligenceEmbedResponse = {
  embedding: number[]
  model: string
  dimensions: number
}

export type AiRecommendationRow = {
  opportunity_id: string
  ai_fit_score: number
  recommendation_strength: 'strong' | 'good' | 'moderate' | 'weak'
  top_reasons: string[]
  blockers: string[]
  suggested_next_step: string
  confidence: number
  explanation_summary: string
}

export type VolunteerIntelligenceRecommendResponse = {
  ranked: AiRecommendationRow[]
  model: string
  usedResponsesApi: boolean
}

async function postJson<T>(body: unknown): Promise<T> {
  const url = getVolunteerIntelligenceEndpointUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Invalid JSON from volunteer-intelligence')
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error ?? res.statusText
    throw new Error(typeof err === 'string' ? err : 'volunteer-intelligence request failed')
  }
  return data as T
}

export async function requestVolunteerIntelligenceEmbed(text: string): Promise<VolunteerIntelligenceEmbedResponse> {
  return postJson<VolunteerIntelligenceEmbedResponse>({ action: 'embed', text })
}

export async function requestVolunteerIntelligenceRecommend(input: {
  volunteerSummary: Record<string, unknown>
  candidates: Array<Record<string, unknown>>
}): Promise<VolunteerIntelligenceRecommendResponse> {
  return postJson<VolunteerIntelligenceRecommendResponse>({
    action: 'recommend',
    volunteerSummary: input.volunteerSummary,
    candidates: input.candidates,
  })
}
