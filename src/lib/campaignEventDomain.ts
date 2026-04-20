/**
 * Event operational domain model (Step 1 — domain expansion).
 * Types map to `campaign_events` + intelligence/outcome facets; UI stays out of this module.
 */

import type { CalendarMobilizeStatus } from './campaignCalendarArchitecture'
import type { EventStaffRoleSlug } from './eventStaffingMatrix'

/** Primary campaign outcome intent for an event. */
export const EVENT_OBJECTIVES = [
  'recruitment',
  'persuasion',
  'fundraising',
  'visibility',
  'coalition',
  'turnout',
  'listening',
  'volunteer_onboarding',
  'surrogate_amplification',
] as const

export type EventObjective = (typeof EVENT_OBJECTIVES)[number]

/** Pipeline lifecycle — column `operational_status` in DB. */
export const EVENT_OPERATIONAL_STATUSES = [
  'draft',
  'planning',
  'approval_needed',
  'scheduled',
  'in_prep',
  'ready',
  'live',
  'completed',
  'canceled',
  'archived',
] as const

export type EventOperationalStatus = (typeof EVENT_OPERATIONAL_STATUSES)[number]

/** Geographic ownership / targeting layer. */
export const EVENT_GEO_SCOPES = ['statewide', 'district', 'county', 'precinct', 'neighborhood'] as const

export type EventGeoScope = (typeof EVENT_GEO_SCOPES)[number]

export const EVENT_HOST_TYPES = [
  'campaign',
  'county_lead',
  'precinct_captain',
  'supporter_host',
  'coalition_partner',
  'surrogate',
] as const

export type EventHostType = (typeof EVENT_HOST_TYPES)[number]

/** Mirrors Mobilize / external sync on the row (`mobilize_publish_state`). */
export type EventMobilizeSyncStatus = CalendarMobilizeStatus

export type IssueCaptureItem = {
  code?: string
  label: string
  severity?: 'low' | 'medium' | 'high'
}

export type EndorsementOrInfluencerItem = {
  name: string
  role?: string
  organization?: string
  notes?: string
}

/**
 * Full operational event shape for app logic (Supabase row + domain fields).
 * Legacy `status` remains for compatibility; prefer `operational_status` for pipeline UX.
 */
export type CampaignEvent = {
  id: string
  campaign_id: string
  title: string
  event_type: string
  event_subtype: string | null
  /** Legacy lifecycle (DB `status`). */
  status: string
  operational_status: EventOperationalStatus
  event_objective: EventObjective | null
  event_scope: EventGeoScope | null
  host_type: EventHostType | null
  county_id: string | null
  precinct_id: string | null
  neighborhood_id: string | null
  district_id: string | null
  parent_event_id: string | null
  mobilizeSyncStatus: EventMobilizeSyncStatus | null
  readiness_score: number | null
  required_roles: readonly EventStaffRoleSlug[] | readonly string[]
  expected_audience_size: number | null
  actual_audience_size: number | null
  volunteer_goal: number | null
  volunteer_outcome: number | null
  voter_contact_goal: number | null
  voter_contact_outcome: number | null
  fundraising_goal: number | null
  fundraising_outcome: number | null
  issues_captured: readonly IssueCaptureItem[] | readonly unknown[]
  endorsements_or_influencers_identified: readonly EndorsementOrInfluencerItem[] | readonly unknown[]
  followup_completion_score: number | null
  intelligence_summary: string | null
  start_at: string
  end_at: string | null
  owner_user_id: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

/** Checklist line item (normalized template layer). */
export type EventChecklistItem = {
  id: string
  label: string
  category: 'prep' | 'materials' | 'logistics' | 'data_capture' | 'compliance' | 'followup'
  required: boolean
}

export type EventChecklist = {
  items: EventChecklistItem[]
}

/**
 * Default task blueprint for templates (distinct from persisted `EventTaskTemplate` in task config).
 * Used by template seed and `generateEventDefaultTasks`.
 */
export type DomainEventTaskTemplate = {
  slug: string
  title: string
  phase: EventWorkflowPhase
  required: boolean
  ownerRoleHint: string
  dueOffsetDaysFromEvent: number | null
  dependsOnSlugs?: string[]
}

export const EVENT_WORKFLOW_PHASES = [
  'strategy',
  'setup',
  'outreach',
  'logistics',
  'staffing',
  'materials',
  'confirmation',
  'day_of_execution',
  'post_event_followup',
  'intelligence_review',
] as const

export type EventWorkflowPhase = (typeof EVENT_WORKFLOW_PHASES)[number]

/** Per–event-type configuration: defaults and playbooks (no UI). */
export type EventTemplate = {
  eventTypeKey: string
  label: string
  defaultObjective: EventObjective
  defaultGeoScope: EventGeoScope
  defaultHostType: EventHostType
  defaultTasks: readonly DomainEventTaskTemplate[]
  prepChecklist: EventChecklist
  materialsChecklist: EventChecklist
  staffingRoleSlugs: readonly EventStaffRoleSlug[]
  preparationTimeline: readonly { phase: EventWorkflowPhase; offsetDaysFromEvent: number; label: string }[]
  requiredFormsOrDataFields: readonly string[]
  recommendedFollowUpFlows: readonly string[]
  riskWarnings: readonly string[]
  recommendedKpis: readonly string[]
  scriptPrompts: readonly string[]
}

export type EventReadinessFactorKey =
  | 'critical_tasks'
  | 'staffing'
  | 'rsvp'
  | 'venue'
  | 'materials'
  | 'data_capture'
  | 'followup_owner'

export type EventReadinessFactor = {
  key: EventReadinessFactorKey
  weight: number
  score: number
  detail?: string
}

/** Result of `calculateEventReadiness`. */
export type EventReadinessModel = {
  readinessScore: number
  factors: EventReadinessFactor[]
  blockers: string[]
}

export type EventOutcomeMetrics = {
  expectedAudienceSize: number | null
  actualAudienceSize: number | null
  volunteerGoal: number | null
  volunteerOutcome: number | null
  voterContactGoal: number | null
  voterContactOutcome: number | null
  fundraisingGoal: number | null
  fundraisingOutcome: number | null
  followupCompletionScore: number | null
}

export type EventFieldOperationalSignals = {
  attendanceCount: number
  followupsPending: number
  followups: readonly { followupType: string; status: string; dueAt: string | null }[]
  issueFlagsRaised: number
  volunteerInterestFlags: number
}

/** Structured payload for Agent Jones and dashboards (Step 8 will extend usage). */
export type EventIntelligencePacket = {
  eventId: string
  title: string
  eventType: string
  operationalStatus: EventOperationalStatus
  objective: EventObjective | null
  geography: {
    scope: EventGeoScope | null
    countyId: string | null
    precinctId: string | null
    neighborhoodId: string | null
  }
  goalsSummary: string
  outcomes: EventOutcomeMetrics
  issuesCaptured: readonly IssueCaptureItem[]
  influencers: readonly EndorsementOrInfluencerItem[]
  intelligenceSummary: string | null
  readiness: Pick<EventReadinessModel, 'readinessScore' | 'blockers'>
  fieldOperationalSignals?: EventFieldOperationalSignals
  recentAreaEvents?: readonly string[]
}

export function parseRequiredRolesJson(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x))
  return []
}

export function parseIssuesCapturedJson(raw: unknown): IssueCaptureItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => {
    if (x && typeof x === 'object' && 'label' in x) {
      const o = x as Record<string, unknown>
      return {
        code: o.code != null ? String(o.code) : undefined,
        label: String(o.label ?? ''),
        severity:
          o.severity === 'low' || o.severity === 'medium' || o.severity === 'high'
            ? o.severity
            : undefined,
      }
    }
    return { label: String(x) }
  })
}

export function parseEndorsementsJson(raw: unknown): EndorsementOrInfluencerItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => {
    if (x && typeof x === 'object' && 'name' in x) {
      const o = x as Record<string, unknown>
      return {
        name: String(o.name ?? ''),
        role: o.role != null ? String(o.role) : undefined,
        organization: o.organization != null ? String(o.organization) : undefined,
        notes: o.notes != null ? String(o.notes) : undefined,
      }
    }
    return { name: String(x) }
  })
}

/** Map a DB row (snake_case) into `CampaignEvent` when domain columns are present. */
export function campaignEventFromRow(row: Record<string, unknown>): CampaignEvent {
  const mobilize = row.mobilize_publish_state
  return {
    id: String(row.id ?? ''),
    campaign_id: String(row.campaign_id ?? 'default'),
    title: String(row.title ?? ''),
    event_type: String(row.event_type ?? ''),
    event_subtype: row.event_subtype != null ? String(row.event_subtype) : null,
    status: String(row.status ?? 'draft'),
    operational_status: (row.operational_status as EventOperationalStatus) ?? 'draft',
    event_objective: (row.event_objective as EventObjective) ?? null,
    event_scope: (row.event_scope as EventGeoScope) ?? null,
    host_type: (row.host_type as EventHostType) ?? null,
    county_id: row.county_id != null ? String(row.county_id) : null,
    precinct_id: row.precinct_id != null ? String(row.precinct_id) : null,
    neighborhood_id: row.neighborhood_id != null ? String(row.neighborhood_id) : null,
    district_id: row.district_id != null ? String(row.district_id) : null,
    parent_event_id: row.parent_event_id != null ? String(row.parent_event_id) : null,
    mobilizeSyncStatus: (mobilize as EventMobilizeSyncStatus) ?? null,
    readiness_score:
      row.readiness_score != null && row.readiness_score !== ''
        ? Number(row.readiness_score)
        : null,
    required_roles: parseRequiredRolesJson(row.required_roles),
    expected_audience_size:
      row.expected_audience_size != null ? Number(row.expected_audience_size) : null,
    actual_audience_size:
      row.actual_audience_size != null ? Number(row.actual_audience_size) : null,
    volunteer_goal: row.volunteer_goal != null ? Number(row.volunteer_goal) : null,
    volunteer_outcome: row.volunteer_outcome != null ? Number(row.volunteer_outcome) : null,
    voter_contact_goal: row.voter_contact_goal != null ? Number(row.voter_contact_goal) : null,
    voter_contact_outcome:
      row.voter_contact_outcome != null ? Number(row.voter_contact_outcome) : null,
    fundraising_goal: row.fundraising_goal != null ? Number(row.fundraising_goal) : null,
    fundraising_outcome: row.fundraising_outcome != null ? Number(row.fundraising_outcome) : null,
    issues_captured: parseIssuesCapturedJson(row.issues_captured),
    endorsements_or_influencers_identified: parseEndorsementsJson(
      row.endorsements_or_influencers_identified,
    ),
    followup_completion_score:
      row.followup_completion_score != null
        ? Number(row.followup_completion_score)
        : null,
    intelligence_summary:
      row.intelligence_summary != null ? String(row.intelligence_summary) : null,
    start_at: String(row.start_at ?? new Date().toISOString()),
    end_at: row.end_at != null ? String(row.end_at) : null,
    owner_user_id: row.owner_user_id != null ? String(row.owner_user_id) : null,
    timezone: row.timezone != null ? String(row.timezone) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  }
}
