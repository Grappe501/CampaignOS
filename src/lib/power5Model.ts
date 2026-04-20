/** Power of 5 relational organizing — client-safe labels (aligned with DB checks). */

export const POWER5_RELATIONSHIP_KINDS = [
  'family',
  'neighbor',
  'coworker',
  'church',
  'friend',
  'teammate',
  'community',
] as const
export type Power5RelationshipKind = (typeof POWER5_RELATIONSHIP_KINDS)[number]

export const POWER5_RELATIONSHIP_LABELS: Record<Power5RelationshipKind, string> = {
  family: 'Family',
  neighbor: 'Neighbor',
  coworker: 'Coworker',
  church: 'Church',
  friend: 'Friend',
  teammate: 'Teammate',
  community: 'Community',
}

export const POWER5_CONTACT_PATHS = [
  'face_to_face',
  'phone_call',
  'zoom',
  'social_media',
  'text',
] as const
export type Power5ContactPath = (typeof POWER5_CONTACT_PATHS)[number]

export const POWER5_CONTACT_LABELS: Record<Power5ContactPath, string> = {
  face_to_face: 'In person',
  phone_call: 'Phone',
  zoom: 'Zoom',
  social_media: 'Social',
  text: 'Text',
}

/** Onboarding / Agent Jones scaffold keys (structured JSON on profile). */
export const POWER5_ONBOARDING_HINT_KEYS = [
  'first_five_names',
  'how_you_know_them',
  'face_to_face_first',
] as const

export type Power5RelationshipNodeRow = {
  id: string
  owner_profile_id: string
  team_id: string | null
  display_label: string
  relationship_kind: string
  connection_strength: number
  preferred_contact: string
  progress_state_key: string
  next_step: string | null
  linked_voter_id: string | null
  recruit_profile_id: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  /** Optional proximity hint (migration: power5_propagation_engine). */
  proximity_type?: string | null
  target_role?: string | null
}
