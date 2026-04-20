import type { AgentJonesContextV2 } from './agentJonesContextV2'
import {
  getCampaignCtas,
  getCampaignIssuePillars,
  getCampaignKnowledgeSnippets,
  getCampaignKnowledgeSnippetsForMessage,
  getCampaignSlogan,
} from './campaignKnowledge'
import { getOnboardingBriefForAgent } from './onboardingCampaignModel'

/**
 * Pull a *small* public campaign context snapshot from ingestion tables.
 * Keeps payload tight; never dumps full tables.
 */
export async function getRelevantCampaignContext(input: {
  campaignSlug: string
  context: Pick<AgentJonesContextV2, 'user' | 'operational'>
}): Promise<NonNullable<AgentJonesContextV2['campaign']>> {
  const campaignSlug = input.campaignSlug.trim()
  if (!campaignSlug) {
    return {}
  }

  const out: NonNullable<AgentJonesContextV2['campaign']> = {}

  const [slogan, issuePillars, ctas, bioSnippets, onboardingBrief] = await Promise.all([
    getCampaignSlogan({ campaignSlug }),
    getCampaignIssuePillars({ campaignSlug }),
    getCampaignCtas({ campaignSlug }),
    getCampaignKnowledgeSnippets({
      campaignSlug,
      topicHints: ['bio', 'meet-chris'],
      progressSlice: input.context.operational.progressSlice,
      onboardingBranch: input.context.user.onboarding_branch ?? null,
      limit: 2,
    }),
    getOnboardingBriefForAgent({
      campaignSlug,
      onboardingBranch: input.context.user.onboarding_branch ?? null,
    }),
  ])

  if (slogan) out.slogan = slogan
  if (issuePillars?.length) out.issuePillars = issuePillars
  if (ctas?.length) out.ctas = ctas

  const bioLine = bioSnippets.find((s) => s.tags.includes('bio'))?.text ?? bioSnippets[0]?.text
  if (bioLine) out.shortBio = bioLine

  if (onboardingBrief) out.onboardingBrief = onboardingBrief

  return out
}

/** Per-question KB snippets for Agent Jones (matches user wording against `campaign_knowledge_chunks`). */
export async function getRelevantCampaignKnowledgeForQuestion(input: {
  campaignSlug: string
  userMessage: string
}): Promise<{ text: string; tags: string[] }[]> {
  const snippets = await getCampaignKnowledgeSnippetsForMessage({
    campaignSlug: input.campaignSlug,
    userMessage: input.userMessage,
    limit: 6,
  })
  return snippets.map((s) => ({ text: s.text, tags: s.tags }))
}

