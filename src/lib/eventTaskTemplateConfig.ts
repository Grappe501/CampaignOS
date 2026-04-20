/**
 * Event task-template config schema (blueprint 10).
 * Config-driven templates; stage/role-aware; safe for UI now and persistence later.
 *
 * Event type slugs match `CampaignEventTypeKey` (blueprint’s `candidate_intro_house_party` =
 * `house_party_intro_candidate`, `fundraising_house_party` = `house_party_fundraising`).
 */

import type { CalendarVisibilitySegment } from './campaignCalendarArchitecture'
import {
  CAMPAIGN_EVENT_TYPE_MATRIX,
  type CampaignEventStage,
  type CampaignEventTypeDefinition,
  type CampaignEventTypeKey,
  type EventCoordinatorOwnerRole,
} from './campaignEventTypeMatrix'
import { buildStructuredTaskTemplatesForType } from './campaignEventTaskEngine'

/** Blueprint stage slugs (differs from `CampaignEventStage` for `request` / `followup` / `archive`). */
export const EVENT_STAGE_SLUGS = [
  'request',
  'qualification',
  'approval',
  'planning',
  'staffing',
  'promotion',
  'execution',
  'followup',
  'archive',
] as const

export type EventStageSlug = (typeof EVENT_STAGE_SLUGS)[number]

export type EventTypeSlug = CampaignEventTypeKey

export type EventOwnerRole = EventCoordinatorOwnerRole

export type EventTaskCompletionRule =
  | 'manual'
  | 'auto_when_field_present'
  | 'auto_when_status_reached'

export type EventTaskTemplate = {
  slug: string
  title: string
  description?: string
  stage: EventStageSlug
  required: boolean
  ownerRole: EventOwnerRole
  dueOffsetDays?: number | null
  dueOffsetHours?: number | null
  dependencySlugs?: string[]
  completionRule?: EventTaskCompletionRule
  completionFieldKey?: string | null
  escalationAfterHours?: number | null
  tags?: string[]
}

export type EventTypeOperationalFlags = {
  mobilizeEligibleDefault: boolean
  requiresApproval: boolean
  requiresFinanceReview: boolean
  requiresCandidateConfirmation: boolean
  requiresHost: boolean
  requiresVenueConfirmation: boolean
  requiresStaffingPlan: boolean
  requiresPromotionPlan: boolean
  requiresFollowupPlan: boolean
}

export type EventTypeConfig = EventTypeOperationalFlags & {
  slug: CampaignEventTypeKey
  label: string
  description?: string
  publicEligibleDefault: boolean
  financeRelated: boolean
  candidateInvolvedDefault: boolean
  defaultVisibilityScope: CalendarVisibilitySegment
  requiredStages: EventStageSlug[]
  tasks: EventTaskTemplate[]
}

export function campaignStageToEventStageSlug(s: CampaignEventStage): EventStageSlug {
  switch (s) {
    case 'request_idea':
      return 'request'
    case 'follow_up':
      return 'followup'
    case 'reporting_archive':
      return 'archive'
    default:
      return s as EventStageSlug
  }
}

function parseDueOffsetDays(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const m = raw.match(/^([+-]?\d+)d$/i)
  if (m) return parseInt(m[1], 10)
  if (raw === '0') return 0
  return null
}

function shortSlugFromTaskKey(key: string): string {
  const parts = key.split('__')
  if (parts.length >= 3) return parts.slice(2).join('_')
  if (parts.length === 2) return parts[1]
  return key
}

function templatesFromStructured(typeKey: CampaignEventTypeKey): EventTaskTemplate[] {
  return buildStructuredTaskTemplatesForType(typeKey).map((t) => ({
    slug: shortSlugFromTaskKey(t.task_key),
    title: t.task_title,
    stage: campaignStageToEventStageSlug(t.event_stage),
    required: t.required,
    ownerRole: t.owner_role,
    dueOffsetDays: parseDueOffsetDays(t.due_offset_from_event),
    dueOffsetHours: null,
    dependencySlugs: t.depends_on_task_key
      ? [shortSlugFromTaskKey(t.depends_on_task_key)]
      : undefined,
    completionRule: 'manual' as const,
    completionFieldKey: null,
    escalationAfterHours: null,
    tags: [],
  }))
}

function uniqueStagesInOrder(tasks: EventTaskTemplate[]): EventStageSlug[] {
  const seen = new Set<EventStageSlug>()
  const out: EventStageSlug[] = []
  for (const s of EVENT_STAGE_SLUGS) {
    if (tasks.some((t) => t.stage === s) && !seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

function defaultVisibilityForType(key: CampaignEventTypeKey): CalendarVisibilitySegment {
  if (key === 'house_party_fundraising') return 'finance_private'
  if (key === 'lunch_meeting' || key === 'coffee_meeting') return 'internal_staff'
  if (
    key === 'public_fair_festival' ||
    key === 'campaign_rally' ||
    key === 'volunteer_recruitment_event' ||
    key === 'early_vote_rally' ||
    key === 'canvass_launch_event' ||
    key === 'campus_youth_activation' ||
    key === 'digital_hybrid_event' ||
    key === 'surrogate_appearance_event'
  ) {
    return 'public_visible'
  }
  if (key === 'house_party_intro_candidate') return 'volunteer_visible'
  if (
    key === 'county_party_meeting' ||
    key === 'community_listening_session' ||
    key === 'faith_values_gathering' ||
    key === 'coalition_partner_event'
  ) {
    return 'field_team'
  }
  if (key === 'gotv_staging_event') return 'field_team'
  return 'internal_staff'
}

function operationalFlagsFromMatrix(def: CampaignEventTypeDefinition): EventTypeOperationalFlags {
  const fin = def.key === 'house_party_fundraising'
  const host = def.key.includes('house_party')
  const promo =
    def.mobilizeGuidance === 'usually_yes' ||
    def.mobilizeGuidance === 'maybe' ||
    def.mobilizeGuidance === 'sometimes'
  return {
    mobilizeEligibleDefault: def.mobilizeGuidance === 'usually_yes',
    requiresApproval: true,
    requiresFinanceReview: fin || def.key === 'lunch_meeting',
    requiresCandidateConfirmation:
      def.key === 'campaign_rally' ||
      def.key === 'house_party_intro_candidate' ||
      def.key === 'county_party_meeting' ||
      def.key === 'early_vote_rally' ||
      def.key === 'surrogate_appearance_event',
    requiresHost: host,
    requiresVenueConfirmation: true,
    requiresStaffingPlan:
      def.key === 'public_fair_festival' ||
      def.key === 'campaign_rally' ||
      def.key === 'early_vote_rally' ||
      def.key === 'gotv_staging_event' ||
      def.key === 'canvass_launch_event' ||
      def.key === 'surrogate_appearance_event' ||
      def.key === 'faith_values_gathering',
    requiresPromotionPlan: promo,
    requiresFollowupPlan: true,
  }
}

const PUBLIC_FAIR_FESTIVAL_TASKS: EventTaskTemplate[] = [
  {
    slug: 'confirm_presence',
    title: 'Confirm campaign participation',
    stage: 'qualification',
    required: true,
    ownerRole: 'event_coordinator',
    dueOffsetDays: -21,
    escalationAfterHours: 24,
    tags: ['approval', 'presence'],
    completionRule: 'manual',
  },
  {
    slug: 'secure_booth',
    title: 'Secure booth/table or organizer confirmation',
    stage: 'planning',
    required: true,
    ownerRole: 'event_coordinator',
    dueOffsetDays: -14,
    dependencySlugs: ['confirm_presence'],
    escalationAfterHours: 24,
    tags: ['venue', 'booth'],
    completionRule: 'manual',
  },
  {
    slug: 'assign_shift_staffing',
    title: 'Assign staffing shifts',
    stage: 'staffing',
    required: true,
    ownerRole: 'volunteer_coordinator',
    dueOffsetDays: -7,
    dependencySlugs: ['secure_booth'],
    escalationAfterHours: 24,
    tags: ['staffing'],
    completionRule: 'manual',
  },
  {
    slug: 'prepare_materials',
    title: 'Prepare literature, signage, and signup tools',
    stage: 'planning',
    required: true,
    ownerRole: 'intern',
    dueOffsetDays: -5,
    tags: ['materials'],
    completionRule: 'manual',
  },
  {
    slug: 'capture_post_event_leads',
    title: 'Process signups and leads after event',
    stage: 'followup',
    required: true,
    ownerRole: 'volunteer_coordinator',
    dueOffsetDays: 1,
    tags: ['followup', 'leads'],
    completionRule: 'manual',
  },
]

const FUNDRAISING_HOUSE_PARTY_TASKS: EventTaskTemplate[] = [
  {
    slug: 'host_approval',
    title: 'Approve host and event concept',
    stage: 'approval',
    required: true,
    ownerRole: 'campaign_manager',
    dueOffsetDays: -21,
    tags: ['host', 'approval'],
    completionRule: 'manual',
  },
  {
    slug: 'finance_review',
    title: 'Complete finance/compliance review',
    stage: 'approval',
    required: true,
    ownerRole: 'finance_lead',
    dueOffsetDays: -18,
    dependencySlugs: ['host_approval'],
    tags: ['finance', 'compliance'],
    completionRule: 'manual',
  },
  {
    slug: 'build_donor_list',
    title: 'Build donor invite list',
    stage: 'planning',
    required: true,
    ownerRole: 'finance_lead',
    dueOffsetDays: -14,
    dependencySlugs: ['finance_review'],
    tags: ['fundraising', 'invite'],
    completionRule: 'manual',
  },
  {
    slug: 'prepare_donation_flow',
    title: 'Prepare contribution capture flow',
    stage: 'planning',
    required: true,
    ownerRole: 'finance_lead',
    dueOffsetDays: -7,
    tags: ['donation', 'finance'],
    completionRule: 'manual',
  },
  {
    slug: 'donor_followup',
    title: 'Complete donor follow-up',
    stage: 'followup',
    required: true,
    ownerRole: 'finance_lead',
    dueOffsetDays: 1,
    tags: ['followup', 'donor'],
    completionRule: 'manual',
  },
]

const MANUAL_TASKS: Partial<Record<CampaignEventTypeKey, EventTaskTemplate[]>> = {
  public_fair_festival: PUBLIC_FAIR_FESTIVAL_TASKS,
  house_party_fundraising: FUNDRAISING_HOUSE_PARTY_TASKS,
}

function buildConfigForDefinition(def: CampaignEventTypeDefinition): EventTypeConfig {
  const tasks =
    MANUAL_TASKS[def.key] ?? templatesFromStructured(def.key)
  const flags = operationalFlagsFromMatrix(def)
  return {
    slug: def.key,
    label: def.label,
    description: def.purpose,
    publicEligibleDefault: flags.mobilizeEligibleDefault,
    financeRelated: def.key === 'house_party_fundraising',
    candidateInvolvedDefault:
      def.key === 'campaign_rally' ||
      def.key === 'house_party_intro_candidate' ||
      def.key === 'county_party_meeting' ||
      def.key === 'early_vote_rally' ||
      def.key === 'surrogate_appearance_event' ||
      def.key === 'campus_youth_activation',
    defaultVisibilityScope: defaultVisibilityForType(def.key),
    requiredStages:
      uniqueStagesInOrder(tasks).length > 0
        ? uniqueStagesInOrder(tasks)
        : [...EVENT_STAGE_SLUGS],
    tasks,
    ...flags,
  }
}

const EVENT_TYPE_CONFIGS: Record<CampaignEventTypeKey, EventTypeConfig> =
  Object.fromEntries(
    CAMPAIGN_EVENT_TYPE_MATRIX.map((def) => [def.key, buildConfigForDefinition(def)]),
  ) as Record<CampaignEventTypeKey, EventTypeConfig>

const FALLBACK_TYPE: CampaignEventTypeKey = 'coffee_meeting'

export function getEventTypeConfig(slug: CampaignEventTypeKey): EventTypeConfig {
  return EVENT_TYPE_CONFIGS[slug] ?? EVENT_TYPE_CONFIGS[FALLBACK_TYPE]
}

export function getTasksForEventType(slug: CampaignEventTypeKey): EventTaskTemplate[] {
  return getEventTypeConfig(slug).tasks
}

export function getRequiredStageSlugsForEventType(slug: CampaignEventTypeKey): EventStageSlug[] {
  return getEventTypeConfig(slug).requiredStages
}

export type EventTaskInstanceBuildInput = {
  event_id: string
  start_at: string
  event_type: CampaignEventTypeKey
}

export type EventTaskInstance = {
  eventId: string
  templateSlug: string
  title: string
  stage: EventStageSlug
  dueAtIso: string | null
  ownerRole: EventOwnerRole
  required: boolean
  dependencySlugs: string[]
  tags?: string[]
  completionRule: EventTaskCompletionRule
  escalationAfterHours: number | null
}

function computeDueIso(
  eventStartIso: string,
  days?: number | null,
  hours?: number | null,
): string | null {
  if (days == null && hours == null) return null
  const d = new Date(eventStartIso)
  if (Number.isNaN(d.getTime())) return null
  if (days != null) d.setUTCDate(d.getUTCDate() + days)
  if (hours != null) d.setUTCHours(d.getUTCHours() + hours)
  return d.toISOString()
}

export function buildEventTaskInstances(
  input: EventTaskInstanceBuildInput,
): EventTaskInstance[] {
  const cfg = getEventTypeConfig(input.event_type)
  return cfg.tasks.map((t) => ({
    eventId: input.event_id,
    templateSlug: t.slug,
    title: t.title,
    stage: t.stage,
    dueAtIso: computeDueIso(input.start_at, t.dueOffsetDays ?? null, t.dueOffsetHours ?? null),
    ownerRole: t.ownerRole,
    required: t.required,
    dependencySlugs: [...(t.dependencySlugs ?? [])],
    tags: t.tags,
    completionRule: t.completionRule ?? 'manual',
    escalationAfterHours: t.escalationAfterHours ?? null,
  }))
}

export function getBlockingTaskTemplates(
  slug: CampaignEventTypeKey,
  completedSlugs: ReadonlySet<string>,
): EventTaskTemplate[] {
  const { tasks } = getEventTypeConfig(slug)
  return tasks.filter((t) =>
    (t.dependencySlugs ?? []).some((dep) => !completedSlugs.has(dep)),
  )
}

/** Base Mobilize eligibility from type config before row-level checks. */
export function isMobilizeEligibleByType(slug: CampaignEventTypeKey): boolean {
  return getEventTypeConfig(slug).mobilizeEligibleDefault
}

export function groupConfigTasksByStage(
  tasks: EventTaskTemplate[],
): { stage: EventStageSlug; tasks: EventTaskTemplate[] }[] {
  return EVENT_STAGE_SLUGS.map((stage) => ({
    stage,
    tasks: tasks.filter((t) => t.stage === stage),
  })).filter((b) => b.tasks.length > 0)
}

export function getEventTypeConfigRegistry(): Readonly<Record<CampaignEventTypeKey, EventTypeConfig>> {
  return EVENT_TYPE_CONFIGS
}
