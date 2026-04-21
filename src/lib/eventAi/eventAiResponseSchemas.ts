/**
 * Hints for structured model outputs — mirrors future `response_format` JSON schemas on the server.
 */

export const EVENT_AI_STANDARD_NOT_PRODUCTION_TRUTH =
  'Projections and AI summaries are advisory; verify in CampaignOS before acting.'

export type EventAiStructuredReplyV1 = {
  v: 1
  summary: string
  top_risks: string[]
  top_opportunities: string[]
  affected_systems: string[]
  recommended_next_actions: string[]
  decision_urgency: 'low' | 'medium' | 'high'
  delegation_hints: string[]
  coordination_hints: string[]
}
