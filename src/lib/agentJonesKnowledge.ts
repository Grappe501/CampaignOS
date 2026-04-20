import type { AgentJonesContextV2 } from './agentJonesContextV2'
import {
  getCampaignCtas,
  getCampaignIssuePillars,
  getCampaignKnowledgeSnippets,
  getCampaignSlogan,
} from './campaignKnowledge'

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

  const [slogan, issuePillars, ctas, bioSnippets] = await Promise.all([
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
  ])

  if (slogan) out.slogan = slogan
  if (issuePillars?.length) out.issuePillars = issuePillars
  if (ctas?.length) out.ctas = ctas

  const bioLine = bioSnippets.find((s) => s.tags.includes('bio'))?.text ?? bioSnippets[0]?.text
  if (bioLine) out.shortBio = bioLine

  return out
}

