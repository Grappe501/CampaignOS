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
  | 'volunteer_recruitment_event'
  | 'community_listening_session'
  | 'early_vote_rally'
  | 'gotv_staging_event'
  | 'faith_values_gathering'
  | 'canvass_launch_event'
  | 'coalition_partner_event'
  | 'campus_youth_activation'
  | 'digital_hybrid_event'
  | 'surrogate_appearance_event'

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
  {
    key: 'volunteer_recruitment_event',
    label: 'Volunteer recruitment event',
    purpose: 'Recruit and onboard volunteers; fill shifts and teams.',
    requiredPath: [
      'recruitment goal set',
      'promotion plan active',
      'onboarding owner assigned',
      'signup capture tested',
    ],
    requiredTasks: [
      'define recruitment targets',
      'confirm promotion channels',
      'prepare role descriptions',
      'set up signup and onboarding flow',
      'assign day-of volunteer lead',
      'capture signups and follow up within 24 hours',
    ],
    commonRisks: [
      'no onboarding owner',
      'signup tech failure',
      'unclear role asks',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Strong Mobilize candidate when recruiting publicly.',
  },
  {
    key: 'community_listening_session',
    label: 'Community listening session',
    purpose: 'Surface constituent issues; build trust; feed policy and field intelligence.',
    requiredPath: [
      'facilitator and format set',
      'note-taking and consent',
      'issue routing owner assigned',
    ],
    requiredTasks: [
      'design agenda and ground rules',
      'confirm accessibility and translation',
      'assign facilitator and note-taker',
      'route notes to policy/comms/field',
      'schedule synthesis and follow-up tasks',
    ],
    commonRisks: [
      'poor note capture',
      'no escalation path for urgent issues',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote: 'Sometimes public; often neighborhood-scoped and invite-based.',
  },
  {
    key: 'early_vote_rally',
    label: 'Early vote rally / vote trip',
    purpose: 'Drive early vote participation; energy and logistics to the polls.',
    requiredPath: [
      'early vote site details confirmed',
      'rides or staging plan',
      'captains briefed',
    ],
    requiredTasks: [
      'confirm site hours and rules',
      'plan transportation or staging',
      'brief volunteer captains',
      'day-of program and safety messaging',
      'track vote plan commitments',
    ],
    commonRisks: [
      'wrong site information',
      'insufficient ride capacity',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Usually yes for public turnout events.',
  },
  {
    key: 'gotv_staging_event',
    label: 'GOTV staging event',
    purpose: 'Launch canvassers and volunteers for GOTV; distribute turf and materials.',
    requiredPath: [
      'staging location confirmed',
      'turf packets ready',
      'check-in flow tested',
    ],
    requiredTasks: [
      'confirm staging site and supplies',
      'assign canvass captains',
      'prepare turf and return process',
      'safety and incident reporting brief',
      'debrief and turf completion tracking',
    ],
    commonRisks: [
      'packet shortages',
      'check-in bottleneck',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote: 'Often operational; public visibility optional.',
  },
  {
    key: 'faith_values_gathering',
    label: 'Faith / values community gathering',
    purpose:
      'Build trust in faith communities; listening, shared values, coalition relationships.',
    requiredPath: [
      'host or partner org identified',
      'cultural / denominational norms reviewed',
      'agenda and speaker plan',
      'RSVP or registration path',
      'follow-up owner assigned',
    ],
    requiredTasks: [
      'partner intake and expectations',
      'confirm venue and accessibility',
      'brief speakers on campaign tone',
      'issue listening and note capture plan',
      'thank-you and relationship follow-up',
    ],
    commonRisks: [
      'tone mismatch with community norms',
      'unclear ask or next step',
      'no designated note-taker',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote: 'Often co-branded; confirm partner before public listing.',
  },
  {
    key: 'canvass_launch_event',
    label: 'Canvass launch event',
    purpose:
      'Kick off turf; recruit walkers; distribute materials; set culture for voter contact.',
    requiredPath: [
      'staging location confirmed',
      'turf packets and captains ready',
      'safety brief scheduled',
      'RSVP or signup path',
    ],
    requiredTasks: [
      'confirm launch site and timing',
      'assign canvass captains',
      'materials and check-in',
      'training or kickoff remarks',
      'debrief and return process',
    ],
    commonRisks: [
      'low RSVP vs turf need',
      'materials shortage',
      'unclear turf ownership',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Strong Mobilize candidate when recruiting public walkers.',
  },
  {
    key: 'coalition_partner_event',
    label: 'Coalition partner event',
    purpose:
      'Joint programming with allied orgs; shared lists, persuasion, and relationship depth.',
    requiredPath: [
      'partner MOU or expectations',
      'roles and branding agreed',
      'audience definition',
      'data sharing rules',
    ],
    requiredTasks: [
      'partner lead and campaign lead assigned',
      'joint run of show',
      'compliance and sign-in',
      'issue capture aligned to coalition',
      'joint follow-up plan',
    ],
    commonRisks: [
      'unclear data ownership',
      'conflicting messaging',
      'weak follow-up split',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote: 'May be invite-only or partner-list-driven.',
  },
  {
    key: 'campus_youth_activation',
    label: 'Campus / youth activation',
    purpose:
      'Recruit young volunteers; visibility on campus or youth hubs; relational organizing.',
    requiredPath: [
      'campus or venue rules confirmed',
      'student or youth liaisons',
      'content and safety plan',
      'signup capture',
    ],
    requiredTasks: [
      'confirm tabling or event space',
      'train volunteers on campus norms',
      'materials and digital signup',
      'follow-up within 24–48h',
    ],
    commonRisks: [
      'permit or school policy gaps',
      'low follow-through after signup',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Often public; align with institution policies.',
  },
  {
    key: 'digital_hybrid_event',
    label: 'Digital / hybrid event',
    purpose:
      'Reach remote audiences; combine in-room and online participation; expand geography.',
    requiredPath: [
      'platform and moderator assigned',
      'run of show and tech check',
      'accessibility and caption plan',
      'registration path',
    ],
    requiredTasks: [
      'tech rehearsal',
      'moderator and backup line',
      'Q&A and engagement plan',
      'recording / compliance decision',
      'post-event digital follow-up',
    ],
    commonRisks: [
      'stream or platform failure',
      'low engagement online',
      'unclear CTA',
    ],
    mobilizeGuidance: 'maybe',
    mobilizeNote: 'Often public RSVP; test links early.',
  },
  {
    key: 'surrogate_appearance_event',
    label: 'Surrogate appearance event',
    purpose:
      'Amplify message via trusted validators; press and persuasion without principal time.',
    requiredPath: [
      'surrogate confirmed',
      'briefing and key messages',
      'venue and logistics',
      'press or photo plan if applicable',
    ],
    requiredTasks: [
      'surrogate briefing book',
      'travel and green room',
      'crowd energy and volunteer ask',
      'capture quotes and content',
      'rapid follow-up to press and attendees',
    ],
    commonRisks: [
      'message drift',
      'weak volunteer ask',
      'no content capture',
    ],
    mobilizeGuidance: 'usually_yes',
    mobilizeNote: 'Often listable like rallies when open to supporters.',
  },
] as const

/** Roadmap labels not yet first-class event type keys (add when product prioritizes). */
export const CAMPAIGN_EVENT_TYPES_UPCOMING: readonly string[] = [
  'phone bank',
  'volunteer training',
  'fundraiser reception',
  'endorsement event',
  'press conference',
  'town hall / forum',
  'debate watch party',
  'poll observer / election protection shift',
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
