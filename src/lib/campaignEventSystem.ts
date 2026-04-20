/**
 * Event system — Pass 1 core model & routes (blueprints 05–06).
 *
 * Route family: `/events`, `/events/calendar`, `/events/:eventId` (see `App.tsx`).
 * Navigation: `AppHeader` surfaces Events when `canAccessEventCoordinatorDesk` is true
 * (`eventCoordinatorDeskAccess.ts`). Eligible roles use header IA; others may bookmark URLs.
 *
 * Canonical persisted row: `CampaignCalendarEventRecord` — lifecycle, staffing, visibility,
 * Mobilize/publish fields, geography (`county_id`, `precinct_id`, `district_id`), and
 * `finance_flag` / `candidate_flag` / `county_party_flag`.
 *
 * Coordinator pipeline board: `CAMPAIGN_EVENT_PIPELINE_STATUSES` (operational superset vs calendar
 * lifecycle — map in a later pass when statuses sync).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export {
  CALENDAR_FUNCTION_SEGMENTS,
  CALENDAR_GEO_SCOPE_SEGMENTS,
  CALENDAR_LIFECYCLE_STATUSES,
  CALENDAR_MOBILIZE_STATUSES,
  CALENDAR_STAFFING_STATUSES,
  CALENDAR_VISIBILITY_SEGMENTS,
} from './campaignCalendarArchitecture'

export type {
  CalendarFunctionSegment,
  CalendarGeoScopeSegment,
  CalendarLifecycleStatus,
  CalendarMobilizeStatus,
  CalendarStaffingStatus,
  CalendarVisibilitySegment,
} from './campaignCalendarArchitecture'

/** Alias — same as calendar row; use one shape for DB + desks. */
export type CampaignEventCoreRecord = CampaignCalendarEventRecord

export const CAMPAIGN_EVENT_ROUTE_PATHS = ['/events', '/events/calendar'] as const

/** Create-flow placeholder in URL until intake saves a row. */
export const CAMPAIGN_EVENT_NEW_RECORD_SLUG = 'new'

export const CAMPAIGN_EVENT_PIPELINE_STATUSES = [
  'draft',
  'intake_review',
  'awaiting_approval',
  'approved',
  'scheduled',
  'published_internal',
  'published_public',
  'promoted_to_mobilize',
  'staffed_ready',
  'at_risk',
  'completed',
  'followup_due',
  'archived',
] as const

export type CampaignEventPipelineStatus = (typeof CAMPAIGN_EVENT_PIPELINE_STATUSES)[number]

export type MobilizeOrgConfigScaffold = {
  integration_enabled: boolean
  mobilize_organization_id: string | null
  /**
   * Where API tokens live — never ship bearer tokens to the client.
   * Wiring is server-side / Supabase secrets only.
   */
  credential_storage: 'supabase_vault' | 'netlify_env' | 'none'
}

/** Placeholder until org settings persist in Supabase. */
export const DEFAULT_MOBILIZE_ORG_CONFIG_SCAFFOLD: MobilizeOrgConfigScaffold = {
  integration_enabled: false,
  mobilize_organization_id: null,
  credential_storage: 'none',
}

/** Subset for Admin / CM / Candidate surfaces (no rework when rows exist). */
export type CampaignEventSummaryForDesks = Pick<
  CampaignCalendarEventRecord,
  | 'event_id'
  | 'title'
  | 'event_type'
  | 'start_at'
  | 'stage_status'
  | 'visibility_scope'
  | 'staffing_state'
  | 'mobilize_publish_state'
>

export function campaignEventRecordPath(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}`
}

export function isUuidParam(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
}

export function isAllowedEventRecordRouteParam(id: string): boolean {
  return id === CAMPAIGN_EVENT_NEW_RECORD_SLUG || isUuidParam(id)
}

export function toCampaignEventSummary(
  row: CampaignCalendarEventRecord,
): CampaignEventSummaryForDesks {
  return {
    event_id: row.event_id,
    title: row.title,
    event_type: row.event_type,
    start_at: row.start_at,
    stage_status: row.stage_status,
    visibility_scope: row.visibility_scope,
    staffing_state: row.staffing_state,
    mobilize_publish_state: row.mobilize_publish_state,
  }
}

export type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export {
  EVENT_APPROVAL_ROLE_SLUGS,
  EVENT_HARD_GATES,
  EVENT_HARD_GATE_KEYS,
  EVENT_PERMISSION_KEYS,
  EVENT_ROLE_PERMISSION_MATRIX,
  EVENT_STAGE_TRANSITION_RULES,
  EVENT_TYPE_APPROVAL_PROFILES,
  evaluateStageTransition,
  getEventPermissionCell,
  getEventTypeApprovalProfile,
  isEventPermissionAllowedForUi,
  listStageTransitionRules,
  normalizeEventSystemRole,
} from './eventPermissionsMatrix'
export type {
  EventApprovalRoleSlug,
  EventHardGateKey,
  EventPermissionKey,
  EventPermissionMatrixCell,
  EventStageTransitionRule,
  EventTypeApprovalProfile,
  StageTransitionDecision,
} from './eventPermissionsMatrix'

export {
  adminUpcomingStrategicPool,
  buildCandidateEventSummary,
  buildEventCalendarSummary,
  buildUpcomingCampaignItems,
  buildUpcomingStripForPersona,
  filterEvents,
  filterEventsForCalendarPersona,
  mapEventsToUpcomingItems,
  mapProfileRoleToCalendarWidgetPersona,
  scoreEventUrgency,
  summarizeCountyCoverage,
  summarizeEventPressure,
  summarizeMobilizeQueue,
  summarizePostEventFollowup,
} from './eventSummaryEngine'
export type {
  CalendarWidgetPersona,
  CandidateEventSummary,
  CountyEventCoverageSummary,
  EventCalendarSummary,
  EventCalendarSummaryDay,
  EventPressureSummaryCounts,
  EventSummaryFilter,
  MobilizeQueueSummary,
  PostEventFollowupSummary,
  UpcomingCampaignItem,
} from './eventSummaryEngine'
