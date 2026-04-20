/**
 * Mobilize integration plan (blueprint 04).
 * CampaignOS = planning/operations source of truth; Mobilize = public promotion & signup surface.
 *
 * API reference: https://api.mobilize.us/v1 (bearer auth; paged JSON).
 * Do not store bearer tokens in client bundles — config belongs server-side / Supabase secrets.
 */

import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'

export const MOBILIZE_API_BASE_URL = 'https://api.mobilize.us/v1'

/** Product rules — not enforced in UI until Phase 1 backend exists. */
export const MOBILIZE_PRODUCT_POSTURE = {
  campaignos: 'Planning, workflow, staffing, logistics, follow-up (source of truth).',
  mobilize: 'Public listing, RSVP/signup flow for eligible events only.',
  never: 'Internal/private events do not publish to Mobilize.',
} as const

/** Publish eligibility — all must pass before push (implementation later). */
export const MOBILIZE_PUBLISH_ELIGIBILITY_RULES = [
  'Event status is approved (or equivalent in your lifecycle).',
  'Required public fields are complete.',
  'Public visibility is allowed (segment + flags).',
  'Venue and time are present.',
  'Event type is allowed for public publication.',
  'Staffing and logistics minimums met where the campaign requires them.',
] as const

/** Matrix keys that are usually good Mobilize candidates. */
export const MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS: readonly CampaignEventTypeKey[] = [
  'public_fair_festival',
  'house_party_intro_candidate',
  'campaign_rally',
  'county_party_meeting',
]

/** Matrix keys that are usually internal / private-first. */
export const MOBILIZE_TYPICALLY_PRIVATE_EVENT_TYPE_KEYS: readonly CampaignEventTypeKey[] = [
  'house_party_fundraising',
  'lunch_meeting',
  'coffee_meeting',
]

/** Roadmap / additional types often publishable (not yet in type matrix rows). */
export const MOBILIZE_PUBLISHABLE_EXTRA_LABELS = [
  'Volunteer training (public)',
  'Canvass launch',
  'Phone bank',
  'Public coffee / meet-and-greet',
] as const

export const MOBILIZE_TYPICALLY_PRIVATE_EXTRA_LABELS = [
  'Private donor lunch',
  'Invite-only stakeholder meetings',
  'Internal scheduling holds',
] as const

/** Suggested row fields for Mobilize sync (extends calendar event record later). */
export const MOBILIZE_SYNC_FIELD_KEYS = [
  'mobilize_event_id',
  'mobilize_publish_state',
  'mobilize_last_synced_at',
  'mobilize_last_error',
  'mobilize_public_url',
  'mobilize_tags_synced',
  'mobilize_sync_hash',
  'mobilize_update_needed',
  'mobilize_published_by_user_id',
] as const

/** Optional public-facing columns on the same row (blueprint 12). */
export const MOBILIZE_PUBLIC_COPY_FIELD_KEYS = [
  'public_title',
  'public_description',
  'public_instructions',
  'public_location_notes',
  'public_contact_name',
  'public_contact_email',
] as const

export type MobilizePublicCopyFieldKey = (typeof MOBILIZE_PUBLIC_COPY_FIELD_KEYS)[number]

export type MobilizeSyncFieldKey = (typeof MOBILIZE_SYNC_FIELD_KEYS)[number]

/**
 * Mobilize-facing columns on the shared event row (pass 3).
 * Bearer tokens and org config stay server-side only.
 */
export type MobilizeEventSyncFacet = {
  mobilize_event_id: string | null
  mobilize_publish_state: string | null
  mobilize_last_synced_at: string | null
  mobilize_last_error: string | null
  mobilize_public_url: string | null
  mobilize_tags_synced: boolean | null
  mobilize_sync_hash: string | null
  mobilize_update_needed: boolean | null
  mobilize_published_by_user_id: string | null
}

/**
 * Workflow states for the integration (finer than calendar `CalendarMobilizeStatus` until aligned).
 */
export const MOBILIZE_WORKFLOW_STATUSES = [
  'not_applicable',
  'eligible',
  'draft_ready',
  'queued_for_publish',
  'published',
  'update_required',
  'sync_error',
  'archived_remote',
] as const

export type MobilizeWorkflowStatus = (typeof MOBILIZE_WORKFLOW_STATUSES)[number]

export type MobilizeIntegrationPhase = {
  phase: 1 | 2 | 3
  title: string
  items: readonly string[]
}

export const MOBILIZE_INTEGRATION_PHASES: readonly MobilizeIntegrationPhase[] = [
  {
    phase: 1,
    title: 'Phase 1 — MVP',
    items: [
      'Store Mobilize settings/config (org id, credentials) server-side.',
      'Encode publish eligibility rules in code or policy table.',
      'Publish queue UI on Event Coordinator desk.',
      'Manual API push/pull for a subset of event types.',
    ],
  },
  {
    phase: 2,
    title: 'Phase 2',
    items: [
      'Update published events from CampaignOS.',
      'Sync Mobilize event URLs and status back.',
      'Display RSVP / signup summary when API allows.',
      'Automate republish when approved fields change.',
    ],
  },
  {
    phase: 3,
    title: 'Phase 3',
    items: [
      'Tag/category mapping to Mobilize feeds.',
      'County/precinct feed strategy.',
      'Optional Zapier fallback if direct API gaps remain.',
      'Deeper RSVP → follow-up sync design.',
    ],
  },
]

export function mobilizePublishableLabelForTypeKey(key: CampaignEventTypeKey): string {
  const labels: Record<CampaignEventTypeKey, string> = {
    public_fair_festival: 'Public fair / festival',
    house_party_intro_candidate: 'House party — introduce the candidate',
    house_party_fundraising: 'House party — raise money',
    lunch_meeting: 'Lunch meeting',
    coffee_meeting: 'Coffee meeting',
    county_party_meeting: 'County party meeting (when public recruitment is appropriate)',
    campaign_rally: 'Campaign rally',
  }
  return labels[key]
}
