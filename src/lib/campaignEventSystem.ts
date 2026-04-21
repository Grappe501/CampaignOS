/**
 * Event system — Pass 1 core model & routes (blueprints 05–06).
 *
 * Route family: `/events`, `/events/calendar`, `/events/review-requests`, `/events/promotion`,
 * `/events/:eventId`, `/events/:eventId/<section>` (see `App.tsx`).
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

export const CAMPAIGN_EVENT_ROUTE_PATHS = [
  '/events',
  '/events/county-ops',
  '/events/neighborhood',
  '/events/analytics',
  '/events/calendar',
  '/events/review-requests',
  '/events/promotion',
] as const

/** Deep-link segments for `/events/:eventId/<section>` (must stay disjoint from management paths above). */
export const EVENT_RECORD_DETAIL_SECTION_SLUGS = [
  'command',
  'health',
  'overview',
  'stages',
  'tasks',
  'field',
  'communications',
  'staffing',
  'logistics',
  'calendar',
  'mobilize',
  'outcomes',
  'followup',
] as const

export type EventRecordDetailSectionSlug = (typeof EVENT_RECORD_DETAIL_SECTION_SLUGS)[number]

export const EVENT_RECORD_DETAIL_SECTION_DOM_IDS: Record<EventRecordDetailSectionSlug, string> = {
  command: 'event-record-command',
  health: 'event-detail-health',
  overview: 'event-overview',
  stages: 'event-stage-tracker',
  tasks: 'event-task-checklist',
  field: 'event-record-field',
  communications: 'event-record-communications',
  staffing: 'event-staffing',
  logistics: 'event-logistics',
  calendar: 'event-calendar-visibility',
  mobilize: 'event-mobilize',
  outcomes: 'event-outcomes',
  followup: 'event-followup',
}

export function isEventRecordDetailSectionSlug(s: string): s is EventRecordDetailSectionSlug {
  return (EVENT_RECORD_DETAIL_SECTION_SLUGS as readonly string[]).includes(s)
}

export function campaignEventRecordSectionPath(
  eventId: string,
  section: EventRecordDetailSectionSlug,
): string {
  const base = `/events/${encodeURIComponent(eventId)}`
  if (section === 'overview') return base
  return `${base}/${section}`
}

/**
 * Returns the section slug when `pathname` is `/events/:eventId/<slug>` with a valid slug; otherwise null.
 */
export function parseEventRecordDetailSectionFromPathname(
  pathname: string,
  eventId: string,
): EventRecordDetailSectionSlug | null {
  const prefix = `/events/${eventId}/`
  if (!pathname.startsWith(prefix)) return null
  const seg = pathname.slice(prefix.length).split('/').filter(Boolean)[0]
  if (!seg || !isEventRecordDetailSectionSlug(seg)) return null
  return seg
}

/**
 * True when URL has an extra path segment after the event id that is not a valid section (e.g. `/events/uuid/bad`).
 */
export function hasInvalidEventRecordDetailSectionSuffix(pathname: string, eventId: string): boolean {
  const prefix = `/events/${eventId}/`
  if (!pathname.startsWith(prefix)) return false
  const seg = pathname.slice(prefix.length).split('/').filter(Boolean)[0]
  return Boolean(seg && !isEventRecordDetailSectionSlug(seg))
}

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

export type {
  CampaignEvent,
  DomainEventTaskTemplate,
  EndorsementOrInfluencerItem,
  EventChecklist,
  EventGeoScope,
  EventHostType,
  EventIntelligencePacket,
  EventMobilizeSyncStatus,
  EventObjective,
  EventOperationalStatus,
  EventOutcomeMetrics,
  EventReadinessModel,
  EventTemplate,
  EventWorkflowPhase,
  IssueCaptureItem,
} from './campaignEventDomain'
export {
  campaignEventFromRow,
  EVENT_GEO_SCOPES,
  EVENT_HOST_TYPES,
  EVENT_OBJECTIVES,
  EVENT_OPERATIONAL_STATUSES,
  EVENT_WORKFLOW_PHASES,
  parseEndorsementsJson,
  parseIssuesCapturedJson,
  parseRequiredRolesJson,
} from './campaignEventDomain'

export {
  buildEventIntelligencePacket,
  calculateEventReadiness,
  createEventFromTemplate,
  generateEventDefaultTasks,
  summarizeEventGoals,
} from './campaignEventDomainServices'
export type { CreateEventFromTemplateInput, EventReadinessCalculationInput } from './campaignEventDomainServices'

export { EVENT_TYPE_TEMPLATE_REGISTRY, getEventTypeTemplate, listEventTypeTemplateKeys } from './event-types.config'

export {
  completeEventTask,
  createWorkflowForCalendarRecord,
  createWorkflowForEvent,
  getBlockingIssues,
  getWorkflowProgress,
  regenerateWorkflow,
} from './eventWorkflowEngine'
export type {
  EventMilestone,
  EventWorkflowRun,
  EventWorkflowTask,
  TaskDependency,
  WorkflowTaskState,
} from './eventWorkflowEngine'

export {
  buildCountyOperationsRows,
  filterCountyRows,
} from './eventOperationsSelectors'
export type { CountyOperationsEventRow, CountyOpsFilters } from './eventOperationsSelectors'

export {
  buildEventAnalyticsSnapshot,
  deriveCoverageGaps,
  staffingCoverageRatio,
} from './eventAnalyticsSelectors'

export {
  buildEventIntelligencePacketFromCalendarRow,
  buildPostEventDebrief,
  buildPreEventBrief,
} from './eventIntelligenceJones'

export {
  createExternalEventPayload,
  mapMobilizeToExternalPublishState,
  validateExternalPublishingReadiness,
} from './eventExternalPublishing'

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
