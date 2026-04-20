/**
 * Campaign calendar and segmentation architecture (blueprint 03).
 * One event source + visibility/segment fields → many filtered views (not parallel calendars).
 */

/** Audience / visibility segments */
export const CALENDAR_VISIBILITY_SEGMENTS = [
  'internal_staff',
  'leadership_only',
  'field_team',
  'volunteer_visible',
  'public_visible',
  'finance_private',
  'county_specific',
  'precinct_specific',
] as const

export type CalendarVisibilitySegment = (typeof CALENDAR_VISIBILITY_SEGMENTS)[number]

/** Functional segments */
export const CALENDAR_FUNCTION_SEGMENTS = [
  'public_event',
  'fundraising',
  'field',
  'training',
  'relationship',
  'earned_media',
  'candidate_travel',
  'admin_deadline',
  'gotv_shift',
] as const

export type CalendarFunctionSegment = (typeof CALENDAR_FUNCTION_SEGMENTS)[number]

/** Geographic scope */
export const CALENDAR_GEO_SCOPE_SEGMENTS = [
  'campaign_wide',
  'congressional_district',
  'county',
  'precinct',
  'city_town',
  'venue_specific',
] as const

export type CalendarGeoScopeSegment = (typeof CALENDAR_GEO_SCOPE_SEGMENTS)[number]

/** Lifecycle status (canonical for calendar engine) */
export const CALENDAR_LIFECYCLE_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'scheduled',
  'published_internal',
  'published_public',
  'completed',
  'canceled',
  'archived',
] as const

export type CalendarLifecycleStatus = (typeof CALENDAR_LIFECYCLE_STATUSES)[number]

export const CALENDAR_STAFFING_STATUSES = [
  'unstaffed',
  'partially_staffed',
  'staffed',
  'at_risk',
] as const

export type CalendarStaffingStatus = (typeof CALENDAR_STAFFING_STATUSES)[number]

/** Row storage may use legacy aliases; normalize with `normalizeMobilizeSyncState` in mobilizeFieldMapping. */
export const CALENDAR_MOBILIZE_STATUSES = [
  'not_applicable',
  'eligible',
  'draft_ready',
  'queued',
  'queued_for_publish',
  'published',
  'update_required',
  'sync_error',
  'archived',
  'archived_remote',
] as const

export type CalendarMobilizeStatus = (typeof CALENDAR_MOBILIZE_STATUSES)[number]

/** Event row shape required for segmentation (future Supabase / API). */
export type CampaignCalendarEventRecord = {
  event_id: string
  title: string
  event_type: string
  event_subtype: string | null
  stage_status: string
  start_at: string
  end_at: string
  timezone: string
  venue_name: string | null
  address_or_virtual: string | null
  /** When present (Supabase row), used for Mobilize in-person postal_code gate. */
  postal_code?: string | null
  virtual_url?: string | null
  owner_user_id: string | null
  owner_role: string | null
  host_user_ids: string[]
  county_id: string | null
  precinct_id: string | null
  district_id: string | null
  visibility_scope: CalendarVisibilitySegment | string
  public_publish_state: string | null
  mobilize_publish_state: CalendarMobilizeStatus | string | null
  /** Pass 3 — Mobilize API / mirror columns (null until wired). */
  mobilize_event_id: string | null
  mobilize_last_synced_at: string | null
  mobilize_last_error: string | null
  mobilize_public_url: string | null
  mobilize_tags_synced: boolean | null
  mobilize_sync_hash: string | null
  /** True when approved fields changed after last successful publish. */
  mobilize_update_needed: boolean | null
  /** Profile id that last successfully published (server-held; null until wired). */
  mobilize_published_by_user_id?: string | null
  /** ISO timestamp from Mobilize `modified_date` after last successful refresh_remote (Pass 3); optional until refreshed. */
  mobilize_remote_modified_at?: string | null
  /** Public promotion copy — separate from internal title/notes (blueprint 12). */
  public_title?: string | null
  public_description?: string | null
  public_instructions?: string | null
  public_location_notes?: string | null
  public_contact_name?: string | null
  public_contact_email?: string | null
  staffing_state: CalendarStaffingStatus | string | null
  followup_state: string | null
  finance_flag: boolean
  candidate_flag: boolean
  county_party_flag: boolean
  notes: string | null
  created_at: string
  updated_at: string
  /** Present when loaded from `campaign_events` operational domain. */
  campaign_id?: string
  operational_status?: string | null
  /** When set on the row, overrides template default for dashboards and filters. */
  event_objective?: string | null
  /** Captured outcomes (operational domain); null until field teams enter them. */
  volunteer_outcome?: number | null
  voter_contact_outcome?: number | null
  readiness_score?: number | null
  /** `campaign_profiles.id` for volunteer/neighborhood submissions awaiting approval. */
  requester_user_id?: string | null
  approval_required?: boolean | null
  submitted_for_review_at?: string | null
  approved_by_user_id?: string | null
  approved_at?: string | null
  rejected_by_user_id?: string | null
  rejected_at?: string | null
  approval_notes?: string | null
  /** Governance UX — Step 3.1B */
  approval_review_state?: string | null
  approval_risk_level?: 'low' | 'medium' | 'high' | string | null
  approval_residual_conditions?: string | null
  approval_followup_required?: boolean | null
  request_origin_surface?: string | null
  last_operational_touch_at?: string | null
}

export type CalendarViewPresetId =
  | 'event_coordinator'
  | 'admin_cm'
  | 'candidate'
  | 'volunteer'

export type CalendarViewPreset = {
  id: CalendarViewPresetId
  label: string
  description: string
  /** Filter hints for the shared engine (not RLS). */
  filterSummary: string
}

export const CALENDAR_VIEW_PRESETS: readonly CalendarViewPreset[] = [
  {
    id: 'event_coordinator',
    label: 'Event Coordinator',
    description: 'Operational home for the campaign event program.',
    filterSummary:
      'All events; approval states; staffing overlays; Mobilize sync state.',
  },
  {
    id: 'admin_cm',
    label: 'Admin / Campaign Manager',
    description: 'Strategic and risk-focused command view.',
    filterSummary:
      'Strategic events; critical staffing gaps; milestones/deadlines; candidate-involved; county/precinct coverage overlays.',
  },
  {
    id: 'candidate',
    label: 'Candidate',
    description: 'Principal schedule and outward-facing priorities.',
    filterSummary:
      'Candidate schedule; public-visible; high-priority relationship, fundraising, and public events; briefing-needed items.',
  },
  {
    id: 'volunteer',
    label: 'Volunteer',
    description: 'Approved opportunities scoped to the volunteer.',
    filterSummary:
      'Approved visible opportunities; training and public events; county/precinct-relevant items.',
  },
]

/** Widgets to build on top of the same engine (roadmap). */
export const CALENDAR_WIDGETS_ROADMAP = [
  'Monthly / weekly calendar grid',
  'Agenda list',
  '“What’s coming up” strip (dashboards: 3–7 items, permission-scoped)',
  'County / precinct filtered side rail',
  'Staffing heat overlay',
  'High-priority event rail',
] as const
