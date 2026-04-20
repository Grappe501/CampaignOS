import { supabase } from './supabaseClient'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'
import type { DashboardProgressSlice } from './dashboardState'

export type CampaignKnowledgeSnippet = {
  text: string
  tags: string[]
}

function trunc(s: unknown, max: number): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

function normalizeTag(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export async function getCampaignSlogan(input: { campaignSlug: string }) {
  const { data } = await supabase
    .from('campaign_messages')
    .select('message_text')
    .eq('campaign_slug', input.campaignSlug)
    .eq('message_kind', 'slogan')
    .order('sort_order', { ascending: true })
    .limit(1)
  const row = (data?.[0] ?? null) as { message_text?: string } | null
  const t = trunc(row?.message_text, 140)
  return t ?? CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan
}

export async function getCampaignIssuePillars(input: { campaignSlug: string }) {
  const { data } = await supabase
    .from('campaign_issue_positions')
    .select('pillar_title,summary_text')
    .eq('campaign_slug', input.campaignSlug)
    .order('pillar_title', { ascending: true })
    .limit(6)
  const rows = (data ?? []) as { pillar_title: string; summary_text: string | null }[]
  const mapped = rows
    .map((r) => ({
      title: trunc(r.pillar_title, 80),
      summary: trunc(r.summary_text, 240),
    }))
    .filter((p): p is { title: string; summary: string } => Boolean(p.title && p.summary))
  return mapped.length
    ? mapped.slice(0, 4)
    : CHRIS_JONES_FOR_CONGRESS_PUBLIC.issuePillars.map((p) => ({
        title: p.title,
        summary: p.summary,
      }))
}

export async function getCampaignCtas(input: { campaignSlug: string }) {
  const { data } = await supabase
    .from('campaign_ctas')
    .select('label,url,sort_order')
    .eq('campaign_slug', input.campaignSlug)
    .order('sort_order', { ascending: true })
    .limit(6)
  const rows = (data ?? []) as { label: string; url: string; sort_order: number | null }[]
  const mapped = rows
    .map((r) => ({ label: trunc(r.label, 80), url: trunc(r.url, 240) }))
    .filter((c): c is { label: string; url: string } => Boolean(c.label && c.url))
  const unique = uniq(mapped.map((c) => `${c.label}|${c.url}`))
    .map((k) => {
      const [label, url] = k.split('|')
      return { label, url }
    })
    .slice(0, 4)
  return unique.length
    ? unique
    : CHRIS_JONES_FOR_CONGRESS_PUBLIC.ctas.map((c) => ({ label: c.label, url: c.url }))
}

export async function getCampaignKnowledgeSnippets(input: {
  campaignSlug: string
  topicHints?: string[]
  progressSlice?: DashboardProgressSlice
  onboardingBranch?: string | null
  limit?: number
}): Promise<CampaignKnowledgeSnippet[]> {
  const limit = Math.max(1, Math.min(6, input.limit ?? 4))
  const hints = (input.topicHints ?? []).map(normalizeTag).filter(Boolean)
  const slice = input.progressSlice
  const branch = trunc(input.onboardingBranch, 120)

  const tags = uniq([
    ...hints,
    ...(slice === 'unmatched' ? ['volunteer', 'verification'] : []),
    ...(slice === 'matched_no_branch' ? ['onboarding'] : []),
    ...(slice === 'exception_pending' ? ['exception'] : []),
    ...(slice === 'matched_ready' ? ['tasks', 'training'] : []),
    ...(branch ? [normalizeTag(branch)] : []),
  ]).filter(Boolean)

  let q = supabase
    .from('campaign_knowledge_chunks')
    .select('content_text,tags')
    .eq('campaign_slug', input.campaignSlug)
    .order('chunk_index', { ascending: true })
    .limit(limit)

  if (tags.length) {
    // tags is text[]; use overlaps to select any related chunk.
    q = q.overlaps('tags', tags)
  }

  const { data } = await q
  const rows = (data ?? []) as { content_text: string; tags: string[] | null }[]
  const out = rows
    .map((r) => ({
      text: trunc(r.content_text, 360),
      tags: (Array.isArray(r.tags) ? r.tags : []).slice(0, 10).map(normalizeTag),
    }))
    .filter((r): r is CampaignKnowledgeSnippet => Boolean(r.text))
    .slice(0, limit)

  return out
}

