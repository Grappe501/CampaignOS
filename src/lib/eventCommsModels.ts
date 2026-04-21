/**
 * Canonical domain types for event communications, media, press, and post-event content.
 * v1 persists via localStorage until Supabase tables exist.
 */

export type CommsChannel =
  | 'email'
  | 'sms'
  | 'social_facebook'
  | 'social_instagram'
  | 'social_x'
  | 'press_wire'
  | 'internal_slack'
  | 'other'

export type CommsStepKind =
  | 'announcement_email'
  | 'volunteer_invite'
  | 'participant_reminder'
  | 'internal_prep'
  | 'role_ack'
  | 'day_before'
  | 'day_of'
  | 'post_event_thanks'
  | 'post_event_followup'
  | 'recap_publish'

export type CommsStepStatus =
  | 'pending'
  | 'draft'
  | 'scheduled'
  | 'sent'
  | 'failed'
  | 'acknowledged'
  | 'skipped'
  | 'blocked_permissions'

export type EventCommunicationStep = {
  id: string
  kind: CommsStepKind
  label: string
  channel: CommsChannel
  /** Offset hint e.g. -7d, -1d, 0, +1d from event start */
  timing_hint: string
  owner_role: string
  status: CommsStepStatus
  due_at: string | null
  notes: string
  linked_task_key: string | null
}

export type EventSocialSlot = {
  id: string
  channel: CommsChannel
  purpose: 'announce' | 'reminder' | 'live' | 'recap' | 'graphic_prompt'
  headline: string
  body_prompt: string
  owner_role: string
  draft_status: 'empty' | 'draft' | 'ready' | 'scheduled' | 'published'
  publish_timing: string | null
}

export type EventPressPlan = {
  target_level: 'none' | 'local' | 'advisory' | 'release' | 'full_package'
  owner_role: string
  media_advisory_outlined: boolean
  press_release_outlined: boolean
  pitch_email_outlined: boolean
}

export type EventGraphicsRequest = {
  id: string
  asset_type:
    | 'flyer'
    | 'reminder_graphic'
    | 'quote_card'
    | 'recap_graphic'
    | 'speaker_card'
    | 'directional_sign'
    | 'social_template'
  title: string
  brief: string
  due_at: string | null
  owner_role: string
  status: 'requested' | 'in_progress' | 'delivered' | 'cancelled'
  linked_channels: CommsChannel[]
}

export type EventMediaCapturePlan = {
  photo_owner_role: string
  video_owner_role: string
  live_post_owner_role: string
  moments_to_capture: string[]
  quotes_to_gather: string[]
  backup_if_thin: string
}

export type EventPostEventContentPlan = {
  recap_status: 'not_started' | 'draft' | 'review' | 'approved' | 'published'
  thank_you_status: CommsStepStatus
  gallery_status: 'missing' | 'collecting' | 'curated'
  press_followup: boolean
  highlight_summary: string
  internal_lessons_line: string
}

export type EventMediaLibraryRecord = {
  id: string
  event_id: string
  media_type: 'photo' | 'video' | 'graphic' | 'flyer' | 'press_doc' | 'signup_scan' | 'other'
  category: string
  caption: string
  tags: string[]
  recap_suitable: boolean
  press_suitable: boolean
  social_suitable: boolean
  uploaded_at: string
  /** data URL or placeholder path — v1 local preview only */
  storage_ref: string
}

/** Alias for AI / manual draft generator modes (kept in sync with Netlify `event-comms-draft`). */
export type EventCommsDraftMode =
  | 'press_release'
  | 'media_advisory'
  | 'pitch_email'
  | 'talking_points'
  | 'reporter_summary'
  | 'announcement_email'
  | 'social_package'
  | 'live_coverage_prompts'
  | 'post_event_recap'

/** Modes implemented by `/.netlify/functions/event-comms-draft` (and deterministic fallbacks). */
export const EVENT_COMMS_AI_MODES: readonly EventCommsDraftMode[] = [
  'press_release',
  'media_advisory',
  'pitch_email',
  'talking_points',
  'reporter_summary',
  'announcement_email',
  'social_package',
  'live_coverage_prompts',
  'post_event_recap',
]

export type EventContentDraft = {
  id: string
  kind: EventCommsDraftMode
  title: string
  body: string
  created_at: string
  updated_at: string
  version: number
  ai_generated: boolean
  reviewed: boolean
}

export type EventRecapPackage = {
  recap_post: string
  thank_you: string
  quote_highlights: string[]
  internal_summary: string
}

export type PressMediaRecommendation = {
  press_level: EventPressPlan['target_level']
  priority: 'low' | 'medium' | 'high'
  owner_role: string
  recommendation_reason: string
  suggested_next_step: string
}

export type EventCommunicationPlan = {
  event_id: string
  event_type: string
  playbook_id: string
  /** From orchestration — narrative cadence */
  announcement_cadence: string
  volunteer_cadence: string
  attendee_reminder_cadence: string
  internal_cadence: string
  media_advisory_likely: boolean
  press_release_likely: boolean
  social_sequence: string[]
  graphics_notes: string[]
  post_event_expectations: string[]
  steps: EventCommunicationStep[]
  social_plan: EventSocialSlot[]
  press: EventPressPlan
  graphics_requests: EventGraphicsRequest[]
  media_capture: EventMediaCapturePlan
  post_event: EventPostEventContentPlan
  recap: EventRecapPackage
}

export type EventCommsAuditEntry = {
  at: string
  action: string
  detail: string
}

export type EventCommunicationsWorkspace = {
  v: 1
  event_id: string
  updated_at: string
  /** Last event `start_at` used to compute step `due_at` values (scheduling reconciliation). */
  scheduling_meta?: {
    last_reconciled_start_at: string | null
  }
  plan: EventCommunicationPlan
  drafts: EventContentDraft[]
  media_library: EventMediaLibraryRecord[]
  audit: EventCommsAuditEntry[]
}
