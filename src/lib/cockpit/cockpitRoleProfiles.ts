/**
 * Role inheritance for future cockpits — Campaign Manager = master density.
 */

import type { CockpitModuleId } from './cockpitWorkspaceSchemas'
import type { CockpitCompareTemplateId } from './cockpitCompareTemplates'

export type CockpitRoleId =
  | 'campaign_manager'
  | 'candidate'
  | 'events_coordinator'
  | 'field_manager'
  | 'volunteer_coordinator'
  | 'finance_director'
  | 'communications_director'
  | 'volunteer'
  | 'intern'

export type CockpitDensity = 'command' | 'tactical' | 'lite'

export type CockpitRoleProfile = {
  role: CockpitRoleId
  label: string
  defaultCenter: CockpitModuleId
  /** Ordered priority for rail auto-fill */
  railPriority: CockpitModuleId[]
  density: CockpitDensity
  compareAllowlist: CockpitCompareTemplateId[] | 'all'
  emphasizeAiModes: string[]
}

export const COCKPIT_ROLE_PROFILES: Record<CockpitRoleId, CockpitRoleProfile> = {
  campaign_manager: {
    role: 'campaign_manager',
    label: 'Campaign Manager',
    defaultCenter: 'war_room',
    railPriority: [
      'field_operations',
      'volunteer_command',
      'event_operations',
      'communications_press',
      'calendar',
      'finance_fundraising',
      'candidate_schedule',
      'approvals_leadership',
      'analytics',
    ],
    density: 'command',
    compareAllowlist: 'all',
    emphasizeAiModes: ['cockpit_mission_brief', 'cross_system_risk_review', 'compare_mode_advisor'],
  },
  candidate: {
    role: 'candidate',
    label: 'Candidate',
    defaultCenter: 'candidate_schedule',
    railPriority: ['calendar', 'event_operations', 'communications_press', 'leadership_briefing'],
    density: 'tactical',
    compareAllowlist: ['calendar_candidate_conflicts', 'event_comms_prep'],
    emphasizeAiModes: ['leadership_attention_summary', 'candidate_heavy'],
  },
  events_coordinator: {
    role: 'events_coordinator',
    label: 'Events Coordinator',
    defaultCenter: 'event_operations',
    railPriority: ['calendar', 'war_room', 'volunteer_command', 'communications_press'],
    density: 'tactical',
    compareAllowlist: ['event_comms_prep', 'event_staffing_rescue', 'volunteer_event_load'],
    emphasizeAiModes: ['bottleneck_analysis', 'cockpit_mission_brief'],
  },
  field_manager: {
    role: 'field_manager',
    label: 'Field Manager',
    defaultCenter: 'field_operations',
    railPriority: ['war_room', 'volunteer_command', 'event_operations'],
    density: 'tactical',
    compareAllowlist: ['volunteer_event_load', 'event_staffing_rescue'],
    emphasizeAiModes: ['cascading_impact_summary'],
  },
  volunteer_coordinator: {
    role: 'volunteer_coordinator',
    label: 'Volunteer Coordinator',
    defaultCenter: 'volunteer_command',
    railPriority: ['event_operations', 'war_room', 'calendar'],
    density: 'tactical',
    compareAllowlist: ['volunteer_event_load', 'event_staffing_rescue'],
    emphasizeAiModes: ['department_alignment_summary'],
  },
  finance_director: {
    role: 'finance_director',
    label: 'Finance Director',
    defaultCenter: 'finance_fundraising',
    railPriority: ['event_operations', 'calendar', 'leadership_briefing'],
    density: 'tactical',
    compareAllowlist: ['finance_event_pressure'],
    emphasizeAiModes: ['opportunity_growth_summary'],
  },
  communications_director: {
    role: 'communications_director',
    label: 'Communications Director',
    defaultCenter: 'communications_press',
    railPriority: ['event_operations', 'candidate_schedule', 'calendar'],
    density: 'tactical',
    compareAllowlist: ['event_comms_prep', 'leadership_war_room'],
    emphasizeAiModes: ['what_changed_everywhere'],
  },
  volunteer: {
    role: 'volunteer',
    label: 'Volunteer',
    defaultCenter: 'event_operations',
    railPriority: ['volunteer_command', 'calendar'],
    density: 'lite',
    compareAllowlist: [],
    emphasizeAiModes: [],
  },
  intern: {
    role: 'intern',
    label: 'Intern',
    defaultCenter: 'event_operations',
    railPriority: ['event_operations', 'volunteer_command'],
    density: 'lite',
    compareAllowlist: [],
    emphasizeAiModes: [],
  },
}

const COCKPIT_ROLE_ID_SET = new Set<CockpitRoleId>(
  Object.keys(COCKPIT_ROLE_PROFILES) as CockpitRoleId[],
)

export function isCockpitRoleId(x: string): x is CockpitRoleId {
  return COCKPIT_ROLE_ID_SET.has(x as CockpitRoleId)
}

export function getCockpitRoleProfile(role: string): CockpitRoleProfile | null {
  return isCockpitRoleId(role) ? COCKPIT_ROLE_PROFILES[role] : null
}
