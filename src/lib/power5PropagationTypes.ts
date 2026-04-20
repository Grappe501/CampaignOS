/** Client shapes for manual propagation / relay (matches additive migrations). */

export type Power5MessageCampaignRow = {
  id: string
  owner_profile_id: string
  team_id: string | null
  title: string
  body_summary: string | null
  status: string
  relay_guardrails: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Power5MessageAssignmentRow = {
  id: string
  campaign_id: string
  assignee_profile_id: string
  node_id: string | null
  message_template_id: string | null
  status: string
  personalization_note: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplateRow = {
  id: string
  owner_profile_id: string | null
  slug: string
  template_type: string
  title: string
  tags: string[]
  created_at: string
  updated_at: string
}
