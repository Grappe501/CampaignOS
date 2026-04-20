import type { CampaignProfile } from '../hooks/useProfile'
import { getAgentJonesGuidanceBundle } from './agentJonesGuidance'
import type { AgentJonesResponse } from './api/agentJones'
import type { DashboardProgressSlice } from './dashboardState'

function trunc(s: unknown, max: number): string {
  const t = String(s ?? '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) : t
}

export function buildAgentJonesFallbackV2(input: {
  slice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
}): AgentJonesResponse {
  const bundle = getAgentJonesGuidanceBundle({
    slice: input.slice,
    profile: input.profile,
    voterLoading: input.voterLoading,
  })

  const suggestedPrompts = bundle.prompts
    .map((p) => trunc(p.label, 120))
    .filter(Boolean)
    .slice(0, 4)

  const firstScroll = bundle.prompts.find((p) => p.scrollToId)?.scrollToId
  const recommendedActions = firstScroll
    ? [{ type: 'scroll' as const, targetId: firstScroll }]
    : undefined

  return {
    response: `${bundle.greeting}\n\n${bundle.stateExplanation}`.trim(),
    ...(suggestedPrompts.length ? { suggestedPrompts } : {}),
    ...(recommendedActions ? { recommendedActions } : {}),
    insight: {
      type: 'strategy',
      message:
        'Offline fallback is active — guidance is deterministic and roster-safe.',
    },
  }
}

