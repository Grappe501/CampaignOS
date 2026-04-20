/**
 * Event type paths and task matrix (blueprint: 02-event-type-paths-and-task-matrix).
 * Operational metadata only — no DB; drives UI and future task templates.
 */

export const CAMPAIGN_EVENT_STAGES = [
  'request_idea',
  'qualification',
  'approval',
  'planning',
  'staffing',
  'promotion',
  'execution',
  'follow_up',
  'reporting_archive',
] as const

export type CampaignEventStage = (typeof CAMPAIGN_EVENT_STAGES)[number]

export const EVENT_COORDINATOR_OWNER_ROLES = [
  'event_coordinator',
  'campaign_manager',
  'candidate_scheduler',
  'finance_lead',
  'communications_lead',
  'county_lead',
  'precinct_captain',
  'volunteer_coordinator',
  'host',
  'intern',
] as const

export type EventCoordinatorOwnerRole = (typeof EVENT_COORDINATOR_OWNER_ROLES)[number]

export type EventMobilizeGuidance = 'usually_yes' | 'maybe' | 'usually_no' | 'sometimes'

export type CampaignEventTypeKey =
  | 'public_fair_festival'
  | 'house_party_intro_candidate'
  | 'house_party_fundraising'
  | 'lunch_meeting'
  | 'coffee_meeting'
  | 'county_party_meeting'
  | 'campaign_rally'

export type CampaignEventTypeDefinition = {
  key: CampaignEventTypeKey
  label: string
  purpose: string
  requiredPath: string[]
  requiredTasks: string[]
  commonRisks: string[]
  mobilizeGuidance: EventMobilizeGuidance
  mobilizeNote: string
}

/** Shared fields for future per-event task templates (all types). */
export type EventTaskTemplateFields = {
  task_title: string
  event_stage: CampaignEventStage | string
  required: boolean
  owner_role: EventCoordinatorOwnerRole | string
  /** e.g. "-7d" or "0" (day of event) */
  due_offset_from_event: string | null
  depends_on_task_key: string | null
  completion_rule: string | null
  escalation_rule: string | null
}

export const CAMPAIGN_EVENT_TYPE_MATRIX: readonly CampaignEventTypeDefinition[] = [
  {
    key: 'public_fair_festival',
    label: 'Public fair / festival',
    purpose:
      'Visibility, volunteer recruitment, voter contact, signups, literature distribution.',
    requiredPath: [
      'request submitted',
      'booth / presence confirmed',
      'materials plan confirmed',
      'staffing shifts assigned',
      'public listing decision made',
      'field follow-up assigned',
    ],
    requiredTasks: [
      'confirm organizer / lead',
      'confirm event date/time/location',
      'secure booth/table/permit if needed',
      'assign shift schedule',
      'assign literature / swag / signup tools',
      'create volunteer sign-in workflow',
      'build post-event lead capture follow-up',
      'upload results and notes',
    ],
    commonRisks: [
      'no booth confirmation',
      'not enough volunteers per shift',
      'no printed materials',
      'signup capture not planned',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote:
      'Usually yes if recruiting volunteers or inviting public participation.',
  },
  {
    key: 'house_party_intro_candidate',
    label: 'House party — introduce the candidate',
    purpose: 'Relationship building, persuasion, volunteer recruitment, community trust.',
    requiredPath: [
      'host identified',
      'audience target defined',
      'candidate availability confirmed if needed',
      'RSVP plan created',
      'follow-up owner assigned',
    ],
    requiredTasks: [
      'host intake / approval',
      'venue/home confirmation',
      'attendee target list',
      'invitation plan',
      'script / remarks prep',
      'volunteer or organizer support assignment',
      'reminder sequence',
      'attendance capture',
      'supporter follow-up and recruitment next step',
    ],
    commonRisks: [
      'no clear host owner',
      'no RSVP target',
      'no attendee follow-up',
      'candidate timing uncertainty',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote:
      'Maybe — strong for public or semi-public recruiting; private invitation-only may stay internal.',
  },
  {
    key: 'house_party_fundraising',
    label: 'House party — raise money',
    purpose: 'Fundraising, donor cultivation, relationship deepening.',
    requiredPath: [
      'finance approval',
      'host approval',
      'fundraising ask plan',
      'donor target universe defined',
      'finance follow-up workflow ready',
    ],
    requiredTasks: [
      'host intake',
      'finance review',
      'contribution compliance check',
      'donor invite list',
      'RSVP / pledge tracking',
      'candidate / surrogate remarks prep',
      'payment / donation flow ready',
      'post-event donor follow-up',
      'contribution reconciliation',
    ],
    commonRisks: [
      'compliance gaps',
      'no donation capture plan',
      'weak invite list',
      'no donor follow-up owner',
    ],
    mobilizeGuidance: 'usually_no',
    mobilizeNote:
      'Usually no for private finance events unless the campaign wants public fundraising recruitment.',
  },
  {
    key: 'lunch_meeting',
    label: 'Lunch meeting',
    purpose: 'Stakeholder cultivation, endorsement work, local leader relationship building.',
    requiredPath: [
      'objective defined',
      'attendee list approved',
      'location confirmed',
      'owner assigned',
      'next-step follow-up defined',
    ],
    requiredTasks: [
      'meeting objective entered',
      'attendee list built',
      'reservation/venue confirmed',
      'briefing notes prepared',
      'materials prepared',
      'notes and commitments captured',
      'follow-up tasks assigned',
    ],
    commonRisks: [
      'unclear purpose',
      'wrong attendee mix',
      'no notes captured',
      'no post-meeting action',
    ],
    mobilizeGuidance: 'usually_no',
    mobilizeNote: 'Usually no — often internal or invited-only.',
  },
  {
    key: 'coffee_meeting',
    label: 'Coffee meeting',
    purpose:
      'Low-lift relationship building, recruitment, persuasion, volunteer or donor cultivation.',
    requiredPath: ['purpose selected', 'attendees chosen', 'owner assigned', 'notes/follow-up required'],
    requiredTasks: [
      'attendee invite',
      'location/time confirm',
      'brief talking points',
      'notes capture',
      'next-step assignment',
    ],
    commonRisks: [
      'unclear goal',
      'no follow-up',
      'repeated low-value meetings without conversion',
    ],
    mobilizeGuidance: 'usually_no',
    mobilizeNote: 'Usually no unless the campaign runs public “meet and greet” coffee events.',
  },
  {
    key: 'county_party_meeting',
    label: 'County party meeting',
    purpose:
      'Party relationship management, coalition building, volunteer recruitment, local visibility.',
    requiredPath: [
      'county lead aware',
      'candidate/surrogate attendance confirmed',
      'materials plan set',
      'follow-up owner assigned',
    ],
    requiredTasks: [
      'county lead coordination',
      'speaking slot / attendance confirmation',
      'local supporter turnout push',
      'materials / handouts',
      'attendee capture if possible',
      'follow-up by county lead/coordinator',
    ],
    commonRisks: [
      'no local coordination',
      'weak turnout from campaign supporters',
      'missed follow-up with party leaders',
    ],
    mobilizeGuidance: 'sometimes',
    mobilizeNote: 'Sometimes — depends on whether public volunteer turnout is desired.',
  },
  {
    key: 'campaign_rally',
    label: 'Campaign rally',
    purpose: 'Public momentum, earned media, volunteer energy, GOTV activation.',
    requiredPath: [
      'strategic approval',
      'candidate/surrogate confirmed',
      'site/security/logistics confirmed',
      'staffing and crowd plan built',
      'public promotion active',
      'rapid follow-up ready',
    ],
    requiredTasks: [
      'event approval',
      'venue/security permits',
      'stage/audio/signage plan',
      'volunteer staffing matrix',
      'press/comms coordination',
      'digital promotion',
      'Mobilize publication',
      'RSVP and reminder flow',
      'attendance and lead capture',
      'post-event media and organizing follow-up',
    ],
    commonRisks: [
      'staffing gap',
      'poor site/logistics',
      'weak turnout plan',
      'no press coordination',
      'no post-event conversion plan',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Usually yes.',
  },
] as const

/** Roadmap types from blueprint — not yet in the operational matrix. */
export const CAMPAIGN_EVENT_TYPES_UPCOMING: readonly string[] = [
  'canvass launch',
  'phone bank',
  'volunteer training',
  'fundraiser reception',
  'endorsement event',
  'press conference',
  'faith/community roundtable',
  'campus event',
  'town hall / forum',
  'debate watch party',
  'poll observer / election protection shift',
  'early vote rally',
  'Election Day staging location shift',
]

export function campaignEventTypeByKey(
  key: CampaignEventTypeKey,
): CampaignEventTypeDefinition | undefined {
  return CAMPAIGN_EVENT_TYPE_MATRIX.find((t) => t.key === key)
}

export function mobilizeGuidanceLabel(g: EventMobilizeGuidance): string {
  const map: Record<EventMobilizeGuidance, string> = {
    usually_yes: 'Mobilize: usually yes',
    maybe: 'Mobilize: maybe',
    usually_no: 'Mobilize: usually no',
    sometimes: 'Mobilize: sometimes',
  }
  return map[g]
}
