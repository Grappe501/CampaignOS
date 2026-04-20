/**
 * Event permissions & approval matrix (blueprint 13).
 * UI source of truth today; align server/RPC enforcement later without redesign.
 */

import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'

/** Canonical slugs used in the matrix (normalize profile.primary_role into these). */
export const EVENT_APPROVAL_ROLE_SLUGS = [
  'admin',
  'campaign_manager',
  'assistant_campaign_manager',
  'event_coordinator',
  'candidate',
  'finance_lead',
  'communications_lead',
  'county_lead',
  'precinct_captain',
  'volunteer_coordinator',
  'host',
  'intern',
  'volunteer',
] as const

export type EventApprovalRoleSlug = (typeof EVENT_APPROVAL_ROLE_SLUGS)[number]

/** Columns from the role × capability matrix in blueprint 13. */
export const EVENT_PERMISSION_KEYS = [
  'create_draft',
  'submit_request',
  'approve',
  'assign_staffing',
  'set_visibility',
  'publish_mobilize',
  'edit_outcomes',
  'close_event',
] as const

export type EventPermissionKey = (typeof EVENT_PERMISSION_KEYS)[number]

export type EventPermissionMatrixCell = 'yes' | 'no' | 'limited' | 'conditional'

/** Role × permission — `conditional` means context-dependent (e.g. finance-only events). */
export const EVENT_ROLE_PERMISSION_MATRIX: Record<
  EventApprovalRoleSlug,
  Record<EventPermissionKey, EventPermissionMatrixCell>
> = {
  admin: {
    create_draft: 'yes',
    submit_request: 'yes',
    approve: 'yes',
    assign_staffing: 'yes',
    set_visibility: 'yes',
    publish_mobilize: 'yes',
    edit_outcomes: 'yes',
    close_event: 'yes',
  },
  campaign_manager: {
    create_draft: 'yes',
    submit_request: 'yes',
    approve: 'yes',
    assign_staffing: 'yes',
    set_visibility: 'yes',
    publish_mobilize: 'yes',
    edit_outcomes: 'yes',
    close_event: 'yes',
  },
  assistant_campaign_manager: {
    create_draft: 'yes',
    submit_request: 'yes',
    approve: 'limited',
    assign_staffing: 'yes',
    set_visibility: 'limited',
    publish_mobilize: 'limited',
    edit_outcomes: 'yes',
    close_event: 'limited',
  },
  event_coordinator: {
    create_draft: 'yes',
    submit_request: 'yes',
    approve: 'limited',
    assign_staffing: 'yes',
    set_visibility: 'yes',
    publish_mobilize: 'yes',
    edit_outcomes: 'yes',
    close_event: 'yes',
  },
  candidate: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'limited',
    assign_staffing: 'no',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'limited',
    close_event: 'no',
  },
  finance_lead: {
    create_draft: 'conditional',
    submit_request: 'conditional',
    approve: 'conditional',
    assign_staffing: 'no',
    set_visibility: 'conditional',
    publish_mobilize: 'conditional',
    edit_outcomes: 'conditional',
    close_event: 'conditional',
  },
  communications_lead: {
    create_draft: 'yes',
    submit_request: 'yes',
    approve: 'limited',
    assign_staffing: 'no',
    set_visibility: 'yes',
    publish_mobilize: 'limited',
    edit_outcomes: 'yes',
    close_event: 'no',
  },
  county_lead: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'no',
    assign_staffing: 'limited',
    set_visibility: 'limited',
    publish_mobilize: 'no',
    edit_outcomes: 'limited',
    close_event: 'limited',
  },
  precinct_captain: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'no',
    assign_staffing: 'limited',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'limited',
    close_event: 'no',
  },
  volunteer_coordinator: {
    create_draft: 'limited',
    submit_request: 'yes',
    approve: 'no',
    assign_staffing: 'yes',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'limited',
    close_event: 'no',
  },
  host: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'no',
    assign_staffing: 'no',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'no',
    close_event: 'no',
  },
  intern: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'no',
    assign_staffing: 'no',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'limited',
    close_event: 'no',
  },
  volunteer: {
    create_draft: 'limited',
    submit_request: 'limited',
    approve: 'no',
    assign_staffing: 'no',
    set_visibility: 'no',
    publish_mobilize: 'no',
    edit_outcomes: 'no',
    close_event: 'no',
  },
}

export type EventStageTransitionRule = {
  from: string
  to: string
  allowedRoles: readonly EventApprovalRoleSlug[]
  requiresAllFlags?: readonly string[]
  notes?: string
}

/**
 * Stage edges to gate in UI (calendar lifecycle + pipeline names).
 * `requiresAllFlags` are satisfied client hints until RPC owns them.
 */
export const EVENT_STAGE_TRANSITION_RULES: readonly EventStageTransitionRule[] = [
  {
    from: 'submitted',
    to: 'approved',
    allowedRoles: [
      'admin',
      'campaign_manager',
      'event_coordinator',
      'finance_lead',
      'assistant_campaign_manager',
    ],
    notes: 'Finance/private rows may require finance_lead in the approver set.',
  },
  {
    from: 'draft',
    to: 'submitted',
    allowedRoles: [
      'admin',
      'campaign_manager',
      'assistant_campaign_manager',
      'event_coordinator',
      'county_lead',
      'volunteer_coordinator',
      'host',
      'precinct_captain',
      'intern',
      'volunteer',
    ],
  },
  {
    from: 'approved',
    to: 'published_public',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator', 'communications_lead'],
    requiresAllFlags: ['publicReady', 'venueConfirmed'],
  },
  {
    from: 'scheduled',
    to: 'published_public',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator', 'communications_lead'],
    requiresAllFlags: ['publicReady', 'venueConfirmed'],
  },
  {
    from: 'published_public',
    to: 'promoted_to_mobilize',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator'],
    requiresAllFlags: ['mobilizeEligible'],
  },
  {
    from: 'published_internal',
    to: 'published_public',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator', 'communications_lead'],
    requiresAllFlags: ['publicReady'],
  },
  {
    from: 'scheduled',
    to: 'completed',
    allowedRoles: [
      'admin',
      'campaign_manager',
      'event_coordinator',
      'county_lead',
      'volunteer_coordinator',
    ],
    requiresAllFlags: ['followupOwnerAssigned'],
    notes: 'Execution-complete handoff; align with pipeline `completed` when wired.',
  },
  {
    from: 'completed',
    to: 'archived',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator', 'finance_lead'],
  },
  {
    from: 'approved',
    to: 'canceled',
    allowedRoles: ['admin', 'campaign_manager', 'event_coordinator'],
  },
]

export type EventTypeApprovalProfile = {
  eventType: CampaignEventTypeKey
  /** Roles that may originate this event type (draft / request). */
  requestedBy: readonly string[]
  /** Primary approvers before public promotion. */
  requiresApprovalBy: readonly string[]
  publicPublicationApprovalBy?: readonly string[]
  candidateInvolvementApprovalBy?: readonly string[]
  followUpOwnership?: readonly string[]
  notes: readonly string[]
}

export const EVENT_TYPE_APPROVAL_PROFILES: readonly EventTypeApprovalProfile[] = [
  {
    eventType: 'public_fair_festival',
    requestedBy: [
      'event_coordinator',
      'county_lead',
      'volunteer_coordinator',
      'assistant_campaign_manager',
    ],
    requiresApprovalBy: ['event_coordinator', 'campaign_manager'],
    publicPublicationApprovalBy: ['event_coordinator', 'campaign_manager'],
    candidateInvolvementApprovalBy: ['campaign_manager', 'candidate_scheduler'],
    followUpOwnership: ['county_lead', 'event_coordinator'],
    notes: [
      'Staffing assignment: event_coordinator / volunteer_coordinator.',
      'Candidate involvement: campaign_manager or candidate scheduler flow.',
    ],
  },
  {
    eventType: 'house_party_intro_candidate',
    requestedBy: ['county_lead', 'host', 'event_coordinator', 'assistant_campaign_manager'],
    requiresApprovalBy: ['campaign_manager'],
    candidateInvolvementApprovalBy: ['campaign_manager', 'candidate_scheduler'],
    followUpOwnership: ['county_lead', 'organizer'],
    notes: [
      'Public publication only if intended public.',
      'Confirmation by campaign_manager / candidate scheduler.',
    ],
  },
  {
    eventType: 'house_party_fundraising',
    requestedBy: ['finance_lead', 'campaign_manager', 'host'],
    requiresApprovalBy: ['finance_lead'],
    candidateInvolvementApprovalBy: ['campaign_manager'],
    followUpOwnership: ['finance_lead'],
    notes: [
      'Public publication generally blocked.',
      'Donor follow-up owned by finance_lead.',
    ],
  },
  {
    eventType: 'lunch_meeting',
    requestedBy: ['campaign_manager', 'assistant_campaign_manager', 'candidate_scheduler'],
    requiresApprovalBy: ['campaign_manager', 'assistant_campaign_manager'],
    notes: [
      'Lightweight approval; owner assignment required.',
      'Public publication generally blocked.',
    ],
  },
  {
    eventType: 'coffee_meeting',
    requestedBy: ['campaign_manager', 'assistant_campaign_manager', 'county_lead'],
    requiresApprovalBy: ['campaign_manager', 'assistant_campaign_manager', 'county_lead'],
    notes: [
      'Public publication only for explicitly public variants; otherwise invite-only.',
    ],
  },
  {
    eventType: 'county_party_meeting',
    requestedBy: ['county_lead', 'event_coordinator', 'campaign_manager'],
    requiresApprovalBy: ['campaign_manager', 'event_coordinator'],
    followUpOwnership: ['county_lead'],
    notes: ['County-local attendance coordination by county_lead.', 'Public publication optional.'],
  },
  {
    eventType: 'campaign_rally',
    requestedBy: ['event_coordinator', 'campaign_manager', 'candidate_scheduler'],
    requiresApprovalBy: ['campaign_manager'],
    publicPublicationApprovalBy: ['campaign_manager', 'communications_lead', 'event_coordinator'],
    notes: [
      'Candidate/public approval required.',
      'Comms, logistics, staffing sign-offs expected.',
      'Mobilize publication commonly expected once eligible.',
    ],
  },
  {
    eventType: 'volunteer_recruitment_event',
    requestedBy: ['volunteer_coordinator', 'county_lead', 'event_coordinator'],
    requiresApprovalBy: ['volunteer_coordinator', 'campaign_manager'],
    publicPublicationApprovalBy: ['volunteer_coordinator', 'event_coordinator'],
    followUpOwnership: ['volunteer_coordinator'],
    notes: ['Onboarding pipeline must be staffed before large public recruitment pushes.'],
  },
  {
    eventType: 'community_listening_session',
    requestedBy: ['county_lead', 'precinct_captain', 'event_coordinator'],
    requiresApprovalBy: ['county_lead', 'campaign_manager'],
    followUpOwnership: ['county_lead', 'event_coordinator'],
    notes: ['Notes routing to policy/comms/field should be agreed in advance.'],
  },
  {
    eventType: 'early_vote_rally',
    requestedBy: ['event_coordinator', 'county_lead', 'volunteer_coordinator'],
    requiresApprovalBy: ['campaign_manager', 'event_coordinator'],
    publicPublicationApprovalBy: ['communications_lead', 'event_coordinator'],
    followUpOwnership: ['county_lead', 'volunteer_coordinator'],
    notes: ['Confirm early vote site rules; transportation and safety messaging required.'],
  },
  {
    eventType: 'gotv_staging_event',
    requestedBy: ['event_coordinator', 'county_lead', 'volunteer_coordinator'],
    requiresApprovalBy: ['campaign_manager', 'event_coordinator'],
    followUpOwnership: ['volunteer_coordinator', 'county_lead'],
    notes: ['Operational security and turf returns process must be explicit.'],
  },
  {
    eventType: 'faith_values_gathering',
    requestedBy: ['county_lead', 'event_coordinator', 'host'],
    requiresApprovalBy: ['campaign_manager', 'county_lead'],
    followUpOwnership: ['county_lead', 'event_coordinator'],
    notes: ['Partner norms and tone; confirm co-branding before public listing.'],
  },
  {
    eventType: 'canvass_launch_event',
    requestedBy: ['precinct_captain', 'county_lead', 'volunteer_coordinator', 'event_coordinator'],
    requiresApprovalBy: ['county_lead', 'campaign_manager'],
    publicPublicationApprovalBy: ['volunteer_coordinator', 'event_coordinator'],
    followUpOwnership: ['volunteer_coordinator', 'county_lead'],
    notes: ['Strong candidate for Mobilize when recruiting walk volume.'],
  },
  {
    eventType: 'coalition_partner_event',
    requestedBy: ['campaign_manager', 'event_coordinator', 'county_lead'],
    requiresApprovalBy: ['campaign_manager'],
    followUpOwnership: ['campaign_manager', 'event_coordinator'],
    notes: ['Data-sharing rules and joint messaging must be explicit.'],
  },
  {
    eventType: 'campus_youth_activation',
    requestedBy: ['volunteer_coordinator', 'county_lead', 'event_coordinator'],
    requiresApprovalBy: ['campaign_manager', 'volunteer_coordinator'],
    publicPublicationApprovalBy: ['communications_lead', 'volunteer_coordinator'],
    followUpOwnership: ['volunteer_coordinator'],
    notes: ['Institution policies and fast follow-up cadence matter.'],
  },
  {
    eventType: 'digital_hybrid_event',
    requestedBy: ['communications_lead', 'event_coordinator', 'campaign_manager'],
    requiresApprovalBy: ['communications_lead', 'campaign_manager'],
    publicPublicationApprovalBy: ['communications_lead'],
    followUpOwnership: ['communications_lead', 'event_coordinator'],
    notes: ['Tech rehearsal and accessibility plan before go-live.'],
  },
  {
    eventType: 'surrogate_appearance_event',
    requestedBy: ['communications_lead', 'event_coordinator', 'campaign_manager'],
    requiresApprovalBy: ['communications_lead', 'campaign_manager'],
    publicPublicationApprovalBy: ['communications_lead', 'campaign_manager'],
    candidateInvolvementApprovalBy: ['campaign_manager', 'communications_lead'],
    followUpOwnership: ['communications_lead', 'county_lead'],
    notes: ['Message discipline and surrogate briefing book required.'],
  },
]

export const EVENT_HARD_GATE_KEYS = [
  'finance_private',
  'candidate_involved',
  'public',
  'high_risk_logistics',
] as const

export type EventHardGateKey = (typeof EVENT_HARD_GATE_KEYS)[number]

export const EVENT_HARD_GATES: Record<
  EventHardGateKey,
  { title: string; requirements: readonly string[] }
> = {
  finance_private: {
    title: 'Finance / private events',
    requirements: [
      'Finance review complete',
      'Finance lead approval',
      'Finance-private visibility by default',
    ],
  },
  candidate_involved: {
    title: 'Candidate-involved events',
    requirements: [
      'Candidate or scheduler confirmation',
      'Final time/location set',
      'Briefing owner assigned',
    ],
  },
  public: {
    title: 'Public events',
    requirements: [
      'Public-facing copy complete',
      'Public visibility allowed',
      'Minimum logistics ready',
      'Mobilize eligibility check if public promotion requested',
    ],
  },
  high_risk_logistics: {
    title: 'High-risk logistics (rallies / festivals)',
    requirements: [
      'Staffing minimum met',
      'Site/logistics confirmed',
      'Materials plan confirmed',
      'Escalation owner assigned if still at risk',
    ],
  },
}

export function normalizeEventSystemRole(
  primaryRole: string | null | undefined,
): EventApprovalRoleSlug | null {
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return null
  if (k === 'admin') return 'admin'
  if (k === 'staff' || k === 'campaign_manager') return 'campaign_manager'
  if (k === 'candidate') return 'candidate'
  if (k === 'finance_lead' || k === 'finance') return 'finance_lead'
  if (k === 'communications_lead' || k === 'comms_lead') return 'communications_lead'
  if (k === 'county_lead') return 'county_lead'
  if (k === 'precinct_captain' || (k.includes('precinct') && k.includes('captain'))) {
    return 'precinct_captain'
  }
  if (k === 'volunteer_coordinator') return 'volunteer_coordinator'
  if (k === 'coordinator') return 'volunteer_coordinator'
  if (k === 'event_coordinator') return 'event_coordinator'
  if (k === 'host') return 'host'
  if (k === 'intern') return 'intern'
  if (k === 'volunteer') return 'volunteer'
  if (
    (k.includes('assistant') || k.includes('deputy')) &&
    (k.includes('manager') || k.includes('campaign') || k.includes('cm'))
  ) {
    return 'assistant_campaign_manager'
  }
  if (k === 'candidate_scheduler') return 'assistant_campaign_manager'
  return null
}

export function getEventPermissionCell(
  role: EventApprovalRoleSlug | null,
  permission: EventPermissionKey,
): EventPermissionMatrixCell | null {
  if (!role) return null
  return EVENT_ROLE_PERMISSION_MATRIX[role][permission]
}

/** Whether UI should surface the control at all (no / unknown still hides primary actions). */
export function isEventPermissionAllowedForUi(
  primaryRole: string | null | undefined,
  permission: EventPermissionKey,
): boolean {
  const slug = normalizeEventSystemRole(primaryRole)
  if (!slug) return false
  const cell = getEventPermissionCell(slug, permission)
  return cell !== 'no'
}

export function listStageTransitionRules(
  from: string,
  to: string,
): EventStageTransitionRule[] {
  const a = String(from).trim().toLowerCase()
  const b = String(to).trim().toLowerCase()
  return EVENT_STAGE_TRANSITION_RULES.filter(
    (r) => r.from.toLowerCase() === a && r.to.toLowerCase() === b,
  )
}

export type StageTransitionDecision = {
  ok: boolean
  matchedRule: EventStageTransitionRule | null
  missingFlags: string[]
  roleAllowed: boolean
}

/**
 * Evaluate a single transition for the current actor and satisfied gate flags.
 * When no rule matches, returns ok: true with matchedRule null (explicit policy TBD server-side).
 */
export function evaluateStageTransition(
  from: string,
  to: string,
  actorPrimaryRole: string | null | undefined,
  satisfiedFlags?: ReadonlySet<string> | readonly string[] | null,
): StageTransitionDecision {
  const rules = listStageTransitionRules(from, to)
  if (rules.length === 0) {
    return {
      ok: true,
      matchedRule: null,
      missingFlags: [],
      roleAllowed: true,
    }
  }
  const rule = rules[0]
  const slug = normalizeEventSystemRole(actorPrimaryRole)
  const roleAllowed =
    slug != null && (rule.allowedRoles as readonly string[]).includes(slug)
  const flagSet =
    satisfiedFlags == null
      ? new Set<string>()
      : satisfiedFlags instanceof Set
        ? satisfiedFlags
        : new Set(satisfiedFlags)
  const required = rule.requiresAllFlags ?? []
  const missingFlags = required.filter((f) => !flagSet.has(f))
  const ok = roleAllowed && missingFlags.length === 0
  return { ok, matchedRule: rule, missingFlags, roleAllowed }
}

export function getEventTypeApprovalProfile(
  key: CampaignEventTypeKey,
): EventTypeApprovalProfile | undefined {
  return EVENT_TYPE_APPROVAL_PROFILES.find((p) => p.eventType === key)
}
