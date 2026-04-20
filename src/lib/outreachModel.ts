/** Relational comms Phase 1 — types aligned with Supabase tables. */

export const OUTREACH_PLATFORMS = ['gmail', 'facebook', 'instagram', 'sms', 'other'] as const
export type OutreachPlatform = (typeof OUTREACH_PLATFORMS)[number]

export const CONNECTION_STATUSES = [
  'not_connected',
  'pending',
  'connected',
  'revoked',
] as const
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number]

export type UserConnectedAccountRow = {
  id: string
  owner_profile_id: string
  platform: OutreachPlatform
  handle: string | null
  connection_status: ConnectionStatus
  permissions: Record<string, unknown>
  created_at: string
  last_synced_at: string | null
}

export type OutreachContactRow = {
  id: string
  owner_profile_id: string
  node_id: string
  last_contacted_at: string | null
  preferred_channel: string | null
  next_action: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const OUTREACH_ACTION_KINDS = [
  'talk_in_person',
  'call',
  'message',
  'invite',
] as const
export type OutreachActionKind = (typeof OUTREACH_ACTION_KINDS)[number]

export type OutreachActionRow = {
  id: string
  owner_profile_id: string
  node_id: string
  action_kind: OutreachActionKind
  status: 'draft' | 'opened' | 'completed' | 'dismissed'
  suggested_copy: string | null
  opened_platform: string | null
  created_at: string
  updated_at: string
}

export const OUTREACH_EVENT_TYPES = [
  'invitation_sent',
  'message_sent',
  'response_logged',
  'in_person',
  'call_made',
  'channel_opened',
  'note_added',
] as const
export type OutreachEventType = (typeof OUTREACH_EVENT_TYPES)[number]

export const OUTREACH_PLATFORM_LABELS: Record<OutreachPlatform, string> = {
  gmail: 'Gmail',
  facebook: 'Facebook',
  instagram: 'Instagram',
  sms: 'SMS / Text',
  other: 'Other',
}
