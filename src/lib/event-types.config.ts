/**
 * Normalized per–event-type configuration (Step 1).
 * Seeds default objectives, checklists, staffing expectations, KPIs, and risk flags — no UI.
 */

import type {
  DomainEventTaskTemplate,
  EventChecklist,
  EventChecklistItem,
  EventTemplate,
  EventWorkflowPhase,
} from './campaignEventDomain'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'

let _checklistSeq = 0
function cid(): string {
  _checklistSeq += 1
  return `chk_${_checklistSeq}`
}

function items(
  category: EventChecklistItem['category'],
  required: boolean,
  labels: string[],
): EventChecklistItem[] {
  return labels.map((label) => ({
    id: cid(),
    label,
    category,
    required,
  }))
}

function checklist(prep: string[], materials: string[]): { prep: EventChecklist; materials: EventChecklist } {
  return {
    prep: { items: items('prep', true, prep) },
    materials: { items: items('materials', true, materials) },
  }
}

function phases(
  rows: { phase: EventWorkflowPhase; offsetDaysFromEvent: number; label: string }[],
): EventTemplate['preparationTimeline'] {
  return rows
}

function taskList(rows: DomainEventTaskTemplate[]): DomainEventTaskTemplate[] {
  return rows
}

const T_PUBLIC_FAIR = checklist(
  [
    'Confirm booth / table / permit',
    'Assign lead and backup on-site owner',
    'Weather and load-in plan',
  ],
  ['Literature, signage, signup QR or paper', 'PPE / tent / tables as needed'],
)

const EVENT_TYPE_TEMPLATE_REGISTRY: Record<CampaignEventTypeKey, EventTemplate> = {
  public_fair_festival: {
    eventTypeKey: 'public_fair_festival',
    label: 'Public fair / festival',
    defaultObjective: 'visibility',
    defaultGeoScope: 'county',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'strat_visibility',
        title: 'Define visibility and signup goals for this fair',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -21,
      },
      {
        slug: 'confirm_presence',
        title: 'Confirm organizer acceptance and presence details',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -14,
        dependsOnSlugs: ['strat_visibility'],
      },
    ]),
    prepChecklist: T_PUBLIC_FAIR.prep,
    materialsChecklist: T_PUBLIC_FAIR.materials,
    staffingRoleSlugs: ['event_lead', 'volunteer_captain', 'checkin', 'setup'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -21, label: 'Goals and fair fit' },
      { phase: 'logistics', offsetDaysFromEvent: -14, label: 'Booth / permit / load-in' },
      { phase: 'staffing', offsetDaysFromEvent: -7, label: 'Shift coverage' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Field execution' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Lead upload and follow-up' },
    ]),
    requiredFormsOrDataFields: ['signup_attribution', 'volunteer_interest_opt_in'],
    recommendedFollowUpFlows: ['thank_you_sms', 'volunteer_recruit_nurture', 'county_intel_review'],
    riskWarnings: [
      'Booth not confirmed',
      'Insufficient volunteers per shift',
      'No signup capture plan',
    ],
    recommendedKpis: ['signups', 'volunteer_leads', 'literature_exhaustion_rate'],
    scriptPrompts: [
      '30-second volunteer pitch',
      'Issue listening prompt',
      'Next event or canvass CTA',
    ],
  },

  house_party_intro_candidate: {
    eventTypeKey: 'house_party_intro_candidate',
    label: 'House party — introduce the candidate',
    defaultObjective: 'persuasion',
    defaultGeoScope: 'neighborhood',
    defaultHostType: 'supporter_host',
    defaultTasks: taskList([
      {
        slug: 'host_intake',
        title: 'Complete host intake and approval',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'county_lead',
        dueOffsetDaysFromEvent: -21,
      },
      {
        slug: 'rsvp_plan',
        title: 'Build RSVP list and reminder sequence',
        phase: 'outreach',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -10,
        dependsOnSlugs: ['host_intake'],
      },
    ]),
    prepChecklist: checklist(
      ['Host and address confirmed', 'Parking and accessibility notes', 'Attendance target set'],
      ['Nametags', 'Lite literature', 'Contribution compliance if ask'],
    ).prep,
    materialsChecklist: checklist(
      ['Host and address confirmed', 'Parking and accessibility notes', 'Attendance target set'],
      ['Nametags', 'Lite literature', 'Contribution compliance if ask'],
    ).materials,
    staffingRoleSlugs: ['host', 'event_lead', 'greeter'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -21, label: 'Host and audience definition' },
      { phase: 'outreach', offsetDaysFromEvent: -14, label: 'Invites and reminders' },
      { phase: 'confirmation', offsetDaysFromEvent: -3, label: 'Final headcount' },
      { phase: 'intelligence_review', offsetDaysFromEvent: 2, label: 'Debrief and follow-up queue' },
    ]),
    requiredFormsOrDataFields: ['attendance_capture', 'issue_notes'],
    recommendedFollowUpFlows: ['supporter_thank_you', 'volunteer_ask_sequence', 'precinct_captain_handoff'],
    riskWarnings: ['No clear host owner', 'No RSVP target', 'No follow-up owner'],
    recommendedKpis: ['rsvp_to_show_rate', 'new_volunteers', 'persuasion_moves'],
    scriptPrompts: ['Host welcome', 'Candidate remarks outline', 'Volunteer ask', 'Donor ask if applicable'],
  },

  house_party_fundraising: {
    eventTypeKey: 'house_party_fundraising',
    label: 'House party — raise money',
    defaultObjective: 'fundraising',
    defaultGeoScope: 'neighborhood',
    defaultHostType: 'supporter_host',
    defaultTasks: taskList([
      {
        slug: 'finance_gate',
        title: 'Finance and compliance sign-off',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'finance_lead',
        dueOffsetDaysFromEvent: -21,
      },
      {
        slug: 'donor_universe',
        title: 'Lock donor invite universe and RSVP tracking',
        phase: 'outreach',
        required: true,
        ownerRoleHint: 'finance_lead',
        dueOffsetDaysFromEvent: -14,
        dependsOnSlugs: ['finance_gate'],
      },
    ]),
    prepChecklist: checklist(
      ['Finance approval recorded', 'Contribution method tested', 'Host briefing on compliance'],
      ['Pledge cards or digital flow', 'Receipt handling'],
    ).prep,
    materialsChecklist: checklist(
      ['Finance approval recorded', 'Contribution method tested', 'Host briefing on compliance'],
      ['Pledge cards or digital flow', 'Receipt handling'],
    ).materials,
    staffingRoleSlugs: ['host', 'finance_support', 'event_lead'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -21, label: 'Compliance and universe' },
      { phase: 'confirmation', offsetDaysFromEvent: -5, label: 'RSVP lock' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Pledge fulfillment' },
    ]),
    requiredFormsOrDataFields: ['donation_capture', 'employer_occupation_if_required'],
    recommendedFollowUpFlows: ['finance_reconciliation', 'major_donor_staffing'],
    riskWarnings: ['Compliance gaps', 'Weak invite list', 'No follow-up owner'],
    recommendedKpis: ['amount_raised', 'pledge_conversion', 'new_donor_acquisition'],
    scriptPrompts: ['Finance disclaimers', 'Candidate or surrogate remarks', 'Clear ask ladder'],
  },

  lunch_meeting: {
    eventTypeKey: 'lunch_meeting',
    label: 'Lunch meeting',
    defaultObjective: 'coalition',
    defaultGeoScope: 'county',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'objective',
        title: 'Document meeting objective and success criteria',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'campaign_manager',
        dueOffsetDaysFromEvent: -14,
      },
      {
        slug: 'attendee_list',
        title: 'Finalize attendee list and roles',
        phase: 'outreach',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -7,
      },
    ]),
    prepChecklist: checklist(
      ['Stakeholder map and ask', 'Briefing doc for principal'],
      ['One-pager or policy leave-behind'],
    ).prep,
    materialsChecklist: checklist(
      ['Stakeholder map and ask', 'Briefing doc for principal'],
      ['One-pager or policy leave-behind'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'candidate_support'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -14, label: 'Objective' },
      { phase: 'confirmation', offsetDaysFromEvent: -2, label: 'Reservation and run of show' },
      { phase: 'intelligence_review', offsetDaysFromEvent: 1, label: 'Notes to CRM / follow-ups' },
    ]),
    requiredFormsOrDataFields: ['notes_and_commitments'],
    recommendedFollowUpFlows: ['stakeholder_follow_up_tasks'],
    riskWarnings: ['Unclear purpose', 'No notes captured'],
    recommendedKpis: ['endorsement_progress', 'action_items_closed'],
    scriptPrompts: ['Principal talking points', 'Coalition framing'],
  },

  coffee_meeting: {
    eventTypeKey: 'coffee_meeting',
    label: 'Coffee meeting',
    defaultObjective: 'listening',
    defaultGeoScope: 'neighborhood',
    defaultHostType: 'precinct_captain',
    defaultTasks: taskList([
      {
        slug: 'purpose',
        title: 'Set purpose and attendee shortlist',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'county_lead',
        dueOffsetDaysFromEvent: -10,
      },
      {
        slug: 'notes_owner',
        title: 'Assign notes and follow-up owner',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -2,
      },
    ]),
    prepChecklist: checklist(['Location and time', 'Accessibility'], ['Business cards or QR']).prep,
    materialsChecklist: checklist(['Location and time', 'Accessibility'], ['Business cards or QR']).materials,
    staffingRoleSlugs: ['event_lead'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -10, label: 'Purpose' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Next steps' },
    ]),
    requiredFormsOrDataFields: ['lightweight_notes'],
    recommendedFollowUpFlows: ['relationship_nurture'],
    riskWarnings: ['No follow-up'],
    recommendedKpis: ['relationship_depth', 'conversion_to_next_action'],
    scriptPrompts: ['Listening-first opener', 'Volunteer pathway'],
  },

  county_party_meeting: {
    eventTypeKey: 'county_party_meeting',
    label: 'County party meeting',
    defaultObjective: 'coalition',
    defaultGeoScope: 'county',
    defaultHostType: 'county_lead',
    defaultTasks: taskList([
      {
        slug: 'coordination',
        title: 'County lead coordination and speaking slot',
        phase: 'outreach',
        required: true,
        ownerRoleHint: 'county_lead',
        dueOffsetDaysFromEvent: -14,
      },
      {
        slug: 'materials_plan',
        title: 'Materials plan and supporter turnout push',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -7,
      },
    ]),
    prepChecklist: checklist(
      ['Party chair / secretary looped in', 'Agenda alignment'],
      ['Literature stack', 'Signup sheet or QR'],
    ).prep,
    materialsChecklist: checklist(
      ['Party chair / secretary looped in', 'Agenda alignment'],
      ['Literature stack', 'Signup sheet or QR'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'volunteer_captain', 'materials_runner'],
    preparationTimeline: phases([
      { phase: 'outreach', offsetDaysFromEvent: -14, label: 'Party coordination' },
      { phase: 'staffing', offsetDaysFromEvent: -7, label: 'Turnout' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 2, label: 'Relationship follow-up' },
    ]),
    requiredFormsOrDataFields: ['attendance_if_possible'],
    recommendedFollowUpFlows: ['county_relationship_nurture'],
    riskWarnings: ['Weak supporter turnout', 'Missed party leader follow-up'],
    recommendedKpis: ['coalition_health', 'volunteer_recruits'],
    scriptPrompts: ['Shared goals framing', 'Volunteer CTA'],
  },

  campaign_rally: {
    eventTypeKey: 'campaign_rally',
    label: 'Campaign rally',
    defaultObjective: 'visibility',
    defaultGeoScope: 'district',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'strategic_signoff',
        title: 'Strategic approval and program arc',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'campaign_manager',
        dueOffsetDaysFromEvent: -28,
      },
      {
        slug: 'permit_security',
        title: 'Venue, permit, and security plan',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -14,
      },
    ]),
    prepChecklist: checklist(
      ['Program and speaking order', 'Press and earned media'],
      ['Stage, A/V, signage', 'Crowd volunteer roles'],
    ).prep,
    materialsChecklist: checklist(
      ['Program and speaking order', 'Press and earned media'],
      ['Stage, A/V, signage', 'Crowd volunteer roles'],
    ).materials,
    staffingRoleSlugs: [
      'event_lead',
      'candidate_support',
      'volunteer_captain',
      'checkin',
      'press_support',
      'setup',
    ],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -28, label: 'Narrative and goals' },
      { phase: 'promotion', offsetDaysFromEvent: -14, label: 'Promotion and RSVP' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Program' },
      { phase: 'intelligence_review', offsetDaysFromEvent: 1, label: 'Media and organizing debrief' },
    ]),
    requiredFormsOrDataFields: ['crowd_checkin', 'volunteer_signup'],
    recommendedFollowUpFlows: ['rapid_volunteer_onboarding', 'press_clips_routing'],
    riskWarnings: ['Staffing gap', 'Site logistics', 'Weak turnout plan'],
    recommendedKpis: ['headcount', 'volunteer_conversion', 'earned_media_hits'],
    scriptPrompts: ['Warm-up', 'Candidate remarks', 'GOTV or volunteer close'],
  },

  volunteer_recruitment_event: {
    eventTypeKey: 'volunteer_recruitment_event',
    label: 'Volunteer recruitment event',
    defaultObjective: 'recruitment',
    defaultGeoScope: 'county',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'recruit_goal',
        title: 'Set recruitment goal and roles to fill',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'volunteer_coordinator',
        dueOffsetDaysFromEvent: -14,
      },
      {
        slug: 'pipeline_handoff',
        title: 'Confirm onboarding pipeline owner',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'volunteer_coordinator',
        dueOffsetDaysFromEvent: -3,
      },
    ]),
    prepChecklist: checklist(
      ['Role descriptions printed or linked', 'Shift signup or scheduling'],
      ['Table, chairs, signup technology'],
    ).prep,
    materialsChecklist: checklist(
      ['Role descriptions printed or linked', 'Shift signup or scheduling'],
      ['Table, chairs, signup technology'],
    ).materials,
    staffingRoleSlugs: ['volunteer_captain', 'checkin', 'data_capture'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -14, label: 'Goals' },
      { phase: 'outreach', offsetDaysFromEvent: -10, label: 'Promotion' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Onboarding calls' },
    ]),
    requiredFormsOrDataFields: ['skill_interests', 'availability'],
    recommendedFollowUpFlows: ['volunteer_onboarding_sequence'],
    riskWarnings: ['No onboarding owner', 'Signup capture failure'],
    recommendedKpis: ['signups', 'show_rate', 'shift_fills'],
    scriptPrompts: ['Why we need you', 'Next shift CTA'],
  },

  community_listening_session: {
    eventTypeKey: 'community_listening_session',
    label: 'Community listening session',
    defaultObjective: 'listening',
    defaultGeoScope: 'precinct',
    defaultHostType: 'precinct_captain',
    defaultTasks: taskList([
      {
        slug: 'agenda_listen',
        title: 'Design listening agenda and ground rules',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'county_lead',
        dueOffsetDaysFromEvent: -10,
      },
      {
        slug: 'intel_routing',
        title: 'Route notes to policy / comms / field',
        phase: 'intelligence_review',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: 2,
      },
    ]),
    prepChecklist: checklist(
      ['Facilitator and note-taker', 'Translation / accessibility'],
      ['Consent for quotes if used publicly'],
    ).prep,
    materialsChecklist: checklist(
      ['Facilitator and note-taker', 'Translation / accessibility'],
      ['Consent for quotes if used publicly'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'data_capture', 'greeter'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -10, label: 'Agenda' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Session' },
      { phase: 'intelligence_review', offsetDaysFromEvent: 1, label: 'Synthesis' },
    ]),
    requiredFormsOrDataFields: ['issue_themes', 'constituent_stories'],
    recommendedFollowUpFlows: ['policy_response_tasks', 'field_escalation'],
    riskWarnings: ['Notes not captured', 'No escalation path for hot issues'],
    recommendedKpis: ['issues_logged', 'follow_up_tasks_created'],
    scriptPrompts: ['Ground rules', 'Closing thank-you and next steps'],
  },

  early_vote_rally: {
    eventTypeKey: 'early_vote_rally',
    label: 'Early vote rally / vote trip',
    defaultObjective: 'turnout',
    defaultGeoScope: 'county',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'ev_plan',
        title: 'Confirm early vote site details and transportation plan',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -7,
      },
      {
        slug: 'captain_brief',
        title: 'Brief canvass / staging captains',
        phase: 'staffing',
        required: true,
        ownerRoleHint: 'volunteer_captain',
        dueOffsetDaysFromEvent: -2,
      },
    ]),
    prepChecklist: checklist(
      ['Site hours and rules', 'Carpool or shuttle plan'],
      ['Signage to polling place', 'PPE / water'],
    ).prep,
    materialsChecklist: checklist(
      ['Site hours and rules', 'Carpool or shuttle plan'],
      ['Signage to polling place', 'PPE / water'],
    ).materials,
    staffingRoleSlugs: ['early_vote_site_lead', 'canvass_captain', 'checkin'],
    preparationTimeline: phases([
      { phase: 'logistics', offsetDaysFromEvent: -7, label: 'Site and rides' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Rally and trip' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Vote status checks' },
    ]),
    requiredFormsOrDataFields: ['vote_plan_commitments'],
    recommendedFollowUpFlows: ['gotv_reminder_sequence'],
    riskWarnings: ['Wrong site info', 'Insufficient ride capacity'],
    recommendedKpis: ['votes_cast_attributed', 'rides_provided'],
    scriptPrompts: ['Energy and urgency', 'How to vote safely and early'],
  },

  gotv_staging_event: {
    eventTypeKey: 'gotv_staging_event',
    label: 'GOTV staging event',
    defaultObjective: 'turnout',
    defaultGeoScope: 'precinct',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'staging_matrix',
        title: 'Confirm staging location, supplies, and turf packets',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -5,
      },
      {
        slug: 'captains_ready',
        title: 'Confirm canvass captains and check-in flow',
        phase: 'staffing',
        required: true,
        ownerRoleHint: 'canvass_captain',
        dueOffsetDaysFromEvent: -1,
      },
    ]),
    prepChecklist: checklist(
      ['Turf assignments', 'Emergency contacts'],
      ['Clipboards, lit, door hangers', 'Battery packs'],
    ).prep,
    materialsChecklist: checklist(
      ['Turf assignments', 'Emergency contacts'],
      ['Clipboards, lit, door hangers', 'Battery packs'],
    ).materials,
    staffingRoleSlugs: ['election_day_staging_lead', 'canvass_captain', 'materials_runner', 'checkin'],
    preparationTimeline: phases([
      { phase: 'logistics', offsetDaysFromEvent: -5, label: 'Staging readiness' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Launch shifts' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 0, label: 'Return and debrief' },
    ]),
    requiredFormsOrDataFields: ['canvass_returns', 'incident_reporting_path'],
    recommendedFollowUpFlows: ['turf_completion_tracking'],
    riskWarnings: ['Packet shortages', 'Check-in bottleneck'],
    recommendedKpis: ['doors_knocked', 'return_rate', 'recruit_per_shift'],
    scriptPrompts: ['Safety first', 'GOTV ask', 'Reporting path'],
  },

  faith_values_gathering: {
    eventTypeKey: 'faith_values_gathering',
    label: 'Faith / values community gathering',
    defaultObjective: 'coalition',
    defaultGeoScope: 'neighborhood',
    defaultHostType: 'coalition_partner',
    defaultTasks: taskList([
      {
        slug: 'partner_intake',
        title: 'Partner intake and cultural expectations',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'county_lead',
        dueOffsetDaysFromEvent: -21,
      },
      {
        slug: 'listening_plan',
        title: 'Issue listening and respectful note capture',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -3,
        dependsOnSlugs: ['partner_intake'],
      },
    ]),
    prepChecklist: checklist(
      ['Partner org contact and norms', 'Accessibility and parking'],
      ['Sign-in, lit (if any), donation rules'],
    ).prep,
    materialsChecklist: checklist(
      ['Partner org contact and norms', 'Accessibility and parking'],
      ['Sign-in, lit (if any), donation rules'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'greeter', 'data_capture'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -21, label: 'Partner alignment' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Gathering' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Relationship follow-up' },
    ]),
    requiredFormsOrDataFields: ['issue_notes', 'partner_attribution'],
    recommendedFollowUpFlows: ['coalition_nurture', 'county_intel_review'],
    riskWarnings: ['Tone mismatch', 'No note-taker', 'Unclear next step'],
    recommendedKpis: ['relationship_depth', 'issue_themes_captured'],
    scriptPrompts: ['Values bridge', 'Listening prompts', 'Volunteer ask'],
  },

  canvass_launch_event: {
    eventTypeKey: 'canvass_launch_event',
    label: 'Canvass launch event',
    defaultObjective: 'turnout',
    defaultGeoScope: 'precinct',
    defaultHostType: 'precinct_captain',
    defaultTasks: taskList([
      {
        slug: 'launch_site',
        title: 'Confirm launch site, time, and turf packets',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'canvass_captain',
        dueOffsetDaysFromEvent: -7,
      },
      {
        slug: 'walker_signup',
        title: 'RSVP / walker signup and materials',
        phase: 'staffing',
        required: true,
        ownerRoleHint: 'volunteer_captain',
        dueOffsetDaysFromEvent: -2,
        dependsOnSlugs: ['launch_site'],
      },
    ]),
    prepChecklist: checklist(
      ['Safety brief', 'Turf ownership'],
      ['Lit, clipboards, water'],
    ).prep,
    materialsChecklist: checklist(
      ['Safety brief', 'Turf ownership'],
      ['Lit, clipboards, water'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'canvass_captain', 'checkin', 'materials_runner'],
    preparationTimeline: phases([
      { phase: 'logistics', offsetDaysFromEvent: -7, label: 'Site and turf' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Launch' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 0, label: 'First doors shift' },
    ]),
    requiredFormsOrDataFields: ['walker_sign_in', 'materials_acknowledgment'],
    recommendedFollowUpFlows: ['shift_reminders', 'turf_completion'],
    riskWarnings: ['Low RSVP', 'Materials shortage'],
    recommendedKpis: ['walkers_signed_in', 'doors_first_shift'],
    scriptPrompts: ['Kickoff energy', 'Safety', 'GOTV culture'],
  },

  coalition_partner_event: {
    eventTypeKey: 'coalition_partner_event',
    label: 'Coalition partner event',
    defaultObjective: 'coalition',
    defaultGeoScope: 'county',
    defaultHostType: 'coalition_partner',
    defaultTasks: taskList([
      {
        slug: 'joint_roles',
        title: 'Confirm joint leads and branding',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'campaign_manager',
        dueOffsetDaysFromEvent: -21,
      },
      {
        slug: 'data_rules',
        title: 'Agree data sharing and sign-in rules',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -5,
        dependsOnSlugs: ['joint_roles'],
      },
    ]),
    prepChecklist: checklist(
      ['Partner MOU or handshake', 'Joint messaging review'],
      ['Sign-in, lit split', 'Press plan if any'],
    ).prep,
    materialsChecklist: checklist(
      ['Partner MOU or handshake', 'Joint messaging review'],
      ['Sign-in, lit split', 'Press plan if any'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'greeter', 'data_capture'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -21, label: 'Partner alignment' },
      { phase: 'outreach', offsetDaysFromEvent: -10, label: 'Joint promotion' },
      { phase: 'intelligence_review', offsetDaysFromEvent: 2, label: 'Shared debrief' },
    ]),
    requiredFormsOrDataFields: ['coalition_attribution', 'issue_notes'],
    recommendedFollowUpFlows: ['partner_thank_you', 'shared_follow_up'],
    riskWarnings: ['Data ownership unclear', 'Message conflict'],
    recommendedKpis: ['coalition_leads', 'joint_actions'],
    scriptPrompts: ['Shared values', 'Unified ask', 'Next coalition step'],
  },

  campus_youth_activation: {
    eventTypeKey: 'campus_youth_activation',
    label: 'Campus / youth activation',
    defaultObjective: 'recruitment',
    defaultGeoScope: 'precinct',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'space_rules',
        title: 'Confirm campus or venue rules and time window',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -14,
      },
      {
        slug: 'youth_team',
        title: 'Recruit student liaisons and train table team',
        phase: 'staffing',
        required: true,
        ownerRoleHint: 'volunteer_captain',
        dueOffsetDaysFromEvent: -5,
        dependsOnSlugs: ['space_rules'],
      },
    ]),
    prepChecklist: checklist(
      ['Permit or school approval', 'Digital signup QR'],
      ['Stickers, palm cards, water'],
    ).prep,
    materialsChecklist: checklist(
      ['Permit or school approval', 'Digital signup QR'],
      ['Stickers, palm cards, water'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'volunteer_captain', 'checkin', 'general_volunteer'],
    preparationTimeline: phases([
      { phase: 'logistics', offsetDaysFromEvent: -14, label: 'Rules and space' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Activation' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Fast follow-up' },
    ]),
    requiredFormsOrDataFields: ['signup_capture', 'school_policy_acknowledgment'],
    recommendedFollowUpFlows: ['youth_nurture_24h', 'volunteer_ask_sequence'],
    riskWarnings: ['Policy gap', 'Slow follow-up after signup'],
    recommendedKpis: ['signups', 'shift_commitments'],
    scriptPrompts: ['Why we organize', 'Campus-appropriate ask', 'Next event'],
  },

  digital_hybrid_event: {
    eventTypeKey: 'digital_hybrid_event',
    label: 'Digital / hybrid event',
    defaultObjective: 'visibility',
    defaultGeoScope: 'district',
    defaultHostType: 'campaign',
    defaultTasks: taskList([
      {
        slug: 'platform_rehearsal',
        title: 'Platform choice, moderator, and tech rehearsal',
        phase: 'logistics',
        required: true,
        ownerRoleHint: 'communications_lead',
        dueOffsetDaysFromEvent: -7,
      },
      {
        slug: 'hybrid_run',
        title: 'Run of show for in-room and remote participants',
        phase: 'confirmation',
        required: true,
        ownerRoleHint: 'event_coordinator',
        dueOffsetDaysFromEvent: -2,
        dependsOnSlugs: ['platform_rehearsal'],
      },
    ]),
    prepChecklist: checklist(
      ['Captioning / accessibility', 'Backup dial-in'],
      ['Slides, lower-thirds, recording policy'],
    ).prep,
    materialsChecklist: checklist(
      ['Captioning / accessibility', 'Backup dial-in'],
      ['Slides, lower-thirds, recording policy'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'speaker_support', 'data_capture'],
    preparationTimeline: phases([
      { phase: 'logistics', offsetDaysFromEvent: -7, label: 'Tech readiness' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Live run' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Replay and follow-up' },
    ]),
    requiredFormsOrDataFields: ['registration_attribution', 'chat_q_export'],
    recommendedFollowUpFlows: ['email_replay', 'volunteer_recruit_nurture'],
    riskWarnings: ['Stream failure', 'Weak remote CTA'],
    recommendedKpis: ['registrations', 'attendance_rate', 'replay_views'],
    scriptPrompts: ['Opening hook', 'Chat moderation', 'Unified CTA'],
  },

  surrogate_appearance_event: {
    eventTypeKey: 'surrogate_appearance_event',
    label: 'Surrogate appearance event',
    defaultObjective: 'surrogate_amplification',
    defaultGeoScope: 'county',
    defaultHostType: 'surrogate',
    defaultTasks: taskList([
      {
        slug: 'surrogate_brief',
        title: 'Surrogate briefing book and key messages',
        phase: 'strategy',
        required: true,
        ownerRoleHint: 'communications_lead',
        dueOffsetDaysFromEvent: -10,
      },
      {
        slug: 'content_capture',
        title: 'Photo, quote, and volunteer ask capture',
        phase: 'day_of_execution',
        required: true,
        ownerRoleHint: 'press_support',
        dueOffsetDaysFromEvent: 0,
        dependsOnSlugs: ['surrogate_brief'],
      },
    ]),
    prepChecklist: checklist(
      ['Travel and green room', 'Local validator intro'],
      ['Press check, signage'],
    ).prep,
    materialsChecklist: checklist(
      ['Travel and green room', 'Local validator intro'],
      ['Press check, signage'],
    ).materials,
    staffingRoleSlugs: ['event_lead', 'speaker_support', 'press_support', 'checkin'],
    preparationTimeline: phases([
      { phase: 'strategy', offsetDaysFromEvent: -10, label: 'Message discipline' },
      { phase: 'day_of_execution', offsetDaysFromEvent: 0, label: 'Appearance' },
      { phase: 'post_event_followup', offsetDaysFromEvent: 1, label: 'Content and follow-up' },
    ]),
    requiredFormsOrDataFields: ['quote_approval_path', 'attendance_capture'],
    recommendedFollowUpFlows: ['press_rapid_response', 'supporter_thank_you'],
    riskWarnings: ['Message drift', 'No content capture'],
    recommendedKpis: ['earned_media_hits', 'volunteer_signups'],
    scriptPrompts: ['Validator frame', 'Volunteer ask', 'Local story'],
  },
}

export function getEventTypeTemplate(key: CampaignEventTypeKey): EventTemplate {
  return EVENT_TYPE_TEMPLATE_REGISTRY[key]
}

export function listEventTypeTemplateKeys(): CampaignEventTypeKey[] {
  return Object.keys(EVENT_TYPE_TEMPLATE_REGISTRY) as CampaignEventTypeKey[]
}

export { EVENT_TYPE_TEMPLATE_REGISTRY }
