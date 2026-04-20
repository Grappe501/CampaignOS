/**
 * Event domain services — template instantiation, readiness scoring, goal summaries, task generation.
 */

import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import {
  type CampaignEvent,
  type EventIntelligencePacket,
  type EventObjective,
  type EventOperationalStatus,
  type EventOutcomeMetrics,
  type EventReadinessFactorKey,
  type EventReadinessModel,
} from './campaignEventDomain'
import { getEventTypeTemplate } from './event-types.config'
import {
  type EventTaskInstance,
  type EventTaskInstanceBuildInput,
  buildEventTaskInstances,
} from './eventTaskTemplateConfig'

export type CreateEventFromTemplateInput = {
  campaignId?: string
  startAt: string
  endAt?: string | null
  timezone?: string | null
  title?: string
  ownerUserId?: string | null
  countyId?: string | null
  precinctId?: string | null
  neighborhoodId?: string | null
  districtId?: string | null
  parentEventId?: string | null
  /** Merged onto generated insert (snake_case column names). */
  overrides?: Record<string, unknown>
}

/**
 * Build a Supabase-ready insert object for `campaign_events` from type template defaults.
 * Does not perform network I/O.
 */
export function createEventFromTemplate(
  templateKey: CampaignEventTypeKey,
  input: CreateEventFromTemplateInput,
): Record<string, unknown> {
  const t = getEventTypeTemplate(templateKey)
  const campaignId = input.campaignId ?? 'default'
  const title =
    input.title?.trim() ||
    t.label ||
    templateKey.replace(/_/g, ' ')

  const base: Record<string, unknown> = {
    campaign_id: campaignId,
    title,
    event_type: templateKey,
    status: 'draft',
    operational_status: 'planning',
    event_objective: t.defaultObjective,
    event_scope: t.defaultGeoScope,
    host_type: t.defaultHostType,
    start_at: input.startAt,
    end_at: input.endAt ?? null,
    timezone: input.timezone ?? 'America/Chicago',
    county_id: input.countyId ?? null,
    precinct_id: input.precinctId ?? null,
    neighborhood_id: input.neighborhoodId ?? null,
    district_id: input.districtId ?? null,
    parent_event_id: input.parentEventId ?? null,
    owner_user_id: input.ownerUserId ?? null,
    required_roles: [...t.staffingRoleSlugs],
    goals_summary: summarizeEventGoalsFromParts(
      t.defaultObjective,
      title,
      t.recommendedKpis,
    ),
    notes_internal: null,
  }

  return { ...base, ...input.overrides }
}

/**
 * Volunteer / neighborhood submission — not live until a coordinator approves (RLS + `approval_required`).
 */
export function buildVolunteerEventSubmissionPayload(
  templateKey: CampaignEventTypeKey,
  input: CreateEventFromTemplateInput & { requesterProfileId: string },
): Record<string, unknown> {
  const { requesterProfileId, overrides, ...rest } = input
  return createEventFromTemplate(templateKey, {
    ...rest,
    overrides: {
      ...overrides,
      status: 'submitted',
      operational_status: 'approval_needed',
      approval_required: true,
      requester_user_id: requesterProfileId,
      submitted_for_review_at: new Date().toISOString(),
      visibility_scope: 'internal_staff',
    },
  })
}

export type EventReadinessCalculationInput = {
  operationalStatus: EventOperationalStatus
  /** Share of critical / required tasks completed (0–1). */
  completedCriticalTaskRatio: number
  /** Share of required staffing roles filled (0–1). */
  staffingCoverageRatio: number
  /** Optional RSVP or invite progress (0–1). */
  rsvpProgressRatio?: number | null
  venueConfirmed: boolean
  materialsConfirmed: boolean
  dataCaptureReady: boolean
  followupOwnerAssigned: boolean
}

const READINESS_WEIGHTS: Record<EventReadinessFactorKey, number> = {
  critical_tasks: 0.22,
  staffing: 0.2,
  rsvp: 0.12,
  venue: 0.12,
  materials: 0.1,
  data_capture: 0.12,
  followup_owner: 0.12,
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function scoreForStatus(status: EventOperationalStatus): number {
  switch (status) {
    case 'completed':
      return 1
    case 'live':
    case 'ready':
      return 0.95
    case 'in_prep':
      return 0.85
    case 'scheduled':
      return 0.75
    case 'planning':
    case 'approval_needed':
      return 0.45
    case 'draft':
      return 0.25
    case 'canceled':
    case 'archived':
      return 0
    default:
      return 0.4
  }
}

/**
 * Weighted readiness score with factor breakdown. Callers supply signals from tasks, staffing, and field state.
 */
export function calculateEventReadiness(input: EventReadinessCalculationInput): EventReadinessModel {
  const factors: EventReadinessModel['factors'] = []

  const taskScore = clamp01(input.completedCriticalTaskRatio)
  factors.push({
    key: 'critical_tasks',
    weight: READINESS_WEIGHTS.critical_tasks,
    score: taskScore,
    detail: 'Required tasks complete',
  })

  const staffScore = clamp01(input.staffingCoverageRatio)
  factors.push({
    key: 'staffing',
    weight: READINESS_WEIGHTS.staffing,
    score: staffScore,
    detail: 'Required roles filled',
  })

  const rsvp = input.rsvpProgressRatio
  const rsvpScore = rsvp == null ? scoreForStatus(input.operationalStatus) : clamp01(rsvp)
  factors.push({
    key: 'rsvp',
    weight: READINESS_WEIGHTS.rsvp,
    score: rsvpScore,
    detail: rsvp == null ? 'RSVP not tracked yet' : 'Invite / RSVP progress',
  })

  factors.push({
    key: 'venue',
    weight: READINESS_WEIGHTS.venue,
    score: input.venueConfirmed ? 1 : 0,
    detail: input.venueConfirmed ? 'Venue confirmed' : 'Venue not confirmed',
  })

  factors.push({
    key: 'materials',
    weight: READINESS_WEIGHTS.materials,
    score: input.materialsConfirmed ? 1 : 0,
    detail: input.materialsConfirmed ? 'Materials ready' : 'Materials not confirmed',
  })

  factors.push({
    key: 'data_capture',
    weight: READINESS_WEIGHTS.data_capture,
    score: input.dataCaptureReady ? 1 : 0,
    detail: input.dataCaptureReady ? 'Check-in / data capture ready' : 'Data capture not configured',
  })

  factors.push({
    key: 'followup_owner',
    weight: READINESS_WEIGHTS.followup_owner,
    score: input.followupOwnerAssigned ? 1 : 0,
    detail: input.followupOwnerAssigned ? 'Follow-up owner assigned' : 'Assign follow-up owner',
  })

  let readinessScore = 0
  for (const f of factors) {
    readinessScore += f.weight * f.score
  }
  readinessScore = Math.round(readinessScore * 1000) / 1000
  const pct = Math.round(readinessScore * 100)

  const blockers: string[] = []
  if (taskScore < 1) blockers.push('Incomplete required tasks')
  if (staffScore < 1) blockers.push('Staffing gaps')
  if (!input.venueConfirmed) blockers.push('Venue not confirmed')
  if (!input.materialsConfirmed) blockers.push('Materials not confirmed')
  if (!input.dataCaptureReady) blockers.push('Data capture not ready')
  if (!input.followupOwnerAssigned) blockers.push('No follow-up owner')

  return {
    readinessScore: pct,
    factors,
    blockers,
  }
}

function summarizeEventGoalsFromParts(
  objective: EventObjective,
  title: string,
  kpis: readonly string[],
): string {
  const k = kpis.length ? ` KPI focus: ${kpis.join(', ')}.` : ''
  return `${title} — objective: ${objective.replace(/_/g, ' ')}.${k}`
}

/**
 * Human-readable goals line for headers, Agent Jones, and exports.
 */
export function summarizeEventGoals(event: Pick<CampaignEvent, 'title' | 'event_objective'>): string {
  const obj = event.event_objective
  const o = obj ? obj.replace(/_/g, ' ') : 'objective not set'
  return `${event.title}: ${o}`
}

export function generateEventDefaultTasks(payload: EventTaskInstanceBuildInput): EventTaskInstance[] {
  return buildEventTaskInstances(payload)
}

export function buildEventIntelligencePacket(
  event: CampaignEvent,
  readiness: Pick<EventReadinessModel, 'readinessScore' | 'blockers'>,
): EventIntelligencePacket {
  const outcomes: EventOutcomeMetrics = {
    expectedAudienceSize: event.expected_audience_size,
    actualAudienceSize: event.actual_audience_size,
    volunteerGoal: event.volunteer_goal,
    volunteerOutcome: event.volunteer_outcome,
    voterContactGoal: event.voter_contact_goal,
    voterContactOutcome: event.voter_contact_outcome,
    fundraisingGoal: event.fundraising_goal,
    fundraisingOutcome: event.fundraising_outcome,
    followupCompletionScore: event.followup_completion_score,
  }

  return {
    eventId: event.id,
    title: event.title,
    eventType: event.event_type,
    operationalStatus: event.operational_status,
    objective: event.event_objective,
    geography: {
      scope: event.event_scope,
      countyId: event.county_id,
      precinctId: event.precinct_id,
      neighborhoodId: event.neighborhood_id,
    },
    goalsSummary: summarizeEventGoals(event),
    outcomes,
    issuesCaptured: event.issues_captured as EventIntelligencePacket['issuesCaptured'],
    influencers: event.endorsements_or_influencers_identified as EventIntelligencePacket['influencers'],
    intelligenceSummary: event.intelligence_summary,
    readiness: {
      readinessScore: readiness.readinessScore,
      blockers: [...readiness.blockers],
    },
  }
}
