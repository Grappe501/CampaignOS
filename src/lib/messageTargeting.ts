/**
 * Message targeting — geography, segment, event, channel (deterministic selection).
 */

import type { CampaignNarrativeFramework, ShortScriptDef, TalkingPointDef } from './messageFramework'

export type VoterMessageSegment = 'base' | 'persuadable' | 'turnout' | 'volunteer' | 'surrogate'

export type OutreachChannelKind = 'canvass' | 'phone' | 'event' | 'text' | 'social' | 'relational'

export type EventTypeHint =
  | 'house_party'
  | 'canvass_launch'
  | 'town_hall'
  | 'early_vote'
  | 'phone_bank'
  | 'training'
  | 'other'

export type MessageTargetContext = {
  /** County name or id — soft match for future turf rules. */
  county?: string | null
  segment?: VoterMessageSegment
  event_type?: EventTypeHint
  channel?: OutreachChannelKind
}

/** Rural-leaning counties in AR — heuristic for pillar tilt (deterministic, auditable). */
const RURAL_COUNTY_HINTS = new Set([
  'newton',
  'searcy',
  'baxter',
  'boone',
  'marion',
  'benton',
  'carroll',
  'madison',
  'franklin',
  'johnson',
])

function countyIsRuralHint(county: string | null | undefined): boolean {
  const k = String(county ?? '')
    .toLowerCase()
    .trim()
  if (!k) return false
  return RURAL_COUNTY_HINTS.has(k) || /county/.test(k)
}

function channelToScriptChannel(
  ch: OutreachChannelKind | undefined,
): ShortScriptDef['channel'] | null {
  if (!ch) return null
  if (ch === 'canvass') return 'canvass'
  if (ch === 'phone') return 'phone'
  if (ch === 'event' || ch === 'relational') return 'event_floor'
  if (ch === 'text') return 'text'
  return null
}

/** Rank talking points for context (higher = better fit). */
export function rankTalkingPointsForContext(
  framework: CampaignNarrativeFramework,
  ctx: MessageTargetContext,
): { point: TalkingPointDef; score: number }[] {
  const rural = countyIsRuralHint(ctx.county)
  const scored = framework.talking_points.map((point) => {
    let score = 50
    if (ctx.segment === 'turnout' && point.pillar_key === 'democracy_for_people') score += 25
    if (ctx.segment === 'volunteer' && point.pillar_key === 'schools_innovation') score += 15
    if (rural && point.pillar_key === 'jobs_local_economy') score += 20
    if (ctx.segment === 'persuadable' && point.pillar_key === 'families_health') score += 15
    if (ctx.event_type === 'early_vote' && point.pillar_key === 'democracy_for_people') score += 30
    return { point, score }
  })
  return scored.sort((a, b) => b.score - a.score)
}

export function selectTalkingPointsForContext(
  framework: CampaignNarrativeFramework,
  ctx: MessageTargetContext,
  limit = 5,
): TalkingPointDef[] {
  return rankTalkingPointsForContext(framework, ctx)
    .slice(0, limit)
    .map((x) => x.point)
}

export function selectScriptsForContext(
  framework: CampaignNarrativeFramework,
  ctx: MessageTargetContext,
): ShortScriptDef[] {
  const sc = channelToScriptChannel(ctx.channel)
  if (sc) {
    const direct = framework.short_scripts.filter((s) => s.channel === sc)
    if (direct.length) return direct
  }
  if (ctx.event_type === 'phone_bank') {
    return framework.short_scripts.filter((s) => s.channel === 'phone')
  }
  if (ctx.event_type === 'canvass_launch' || ctx.channel === 'canvass') {
    return framework.short_scripts.filter((s) => s.channel === 'canvass')
  }
  return [...framework.short_scripts]
}

export function selectRebuttalsForContext(
  framework: CampaignNarrativeFramework,
  ctx: MessageTargetContext,
  limit = 6,
): typeof framework.rebuttals {
  const ranked = [...framework.rebuttals]
  if (ctx.segment === 'persuadable') {
    ranked.sort((a, b) => {
      const pri = (x: typeof a) => (x.id === 'rb_party' || x.id === 'rb_too_political' ? 0 : 1)
      return pri(a) - pri(b)
    })
  }
  return ranked.slice(0, limit)
}

/** Compact bundle for AI draft endpoint (size-bounded). */
export function buildFrameworkExcerptForDraft(
  framework: CampaignNarrativeFramework,
  ctx: MessageTargetContext,
  maxChars = 7500,
): Record<string, unknown> {
  const points = selectTalkingPointsForContext(framework, ctx, 6)
  const scripts = selectScriptsForContext(framework, ctx)
  const rebuttals = selectRebuttalsForContext(framework, ctx, 5)
  const bundle = {
    version: framework.version,
    campaign_slug: framework.campaign_slug,
    narrative: framework.narrative,
    pillars: framework.pillars.map((p) => ({
      key: p.key,
      title: p.title,
      summary: p.summary,
    })),
    targeted_talking_points: points,
    targeted_scripts: scripts,
    targeted_rebuttals: rebuttals,
    context: {
      county: ctx.county ?? null,
      segment: ctx.segment ?? 'base',
      event_type: ctx.event_type ?? 'other',
      channel: ctx.channel ?? 'relational',
    },
  }
  let json = JSON.stringify(bundle)
  if (json.length <= maxChars) return bundle as Record<string, unknown>
  const trim = {
    ...bundle,
    targeted_talking_points: points.slice(0, 3),
    targeted_scripts: scripts.slice(0, 1),
    targeted_rebuttals: rebuttals.slice(0, 3),
  }
  json = JSON.stringify(trim)
  if (json.length <= maxChars) return trim as Record<string, unknown>
  return {
    version: framework.version,
    campaign_slug: framework.campaign_slug,
    narrative: { slogan: framework.narrative.slogan, north_star: framework.narrative.north_star },
    pillars: framework.pillars.map((p) => ({ key: p.key, title: p.title })),
    targeted_talking_points: points.slice(0, 2),
    context: bundle.context,
  } as Record<string, unknown>
}
