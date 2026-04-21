/**
 * Saved compare layouts — pair modules in the center with shared operational intent.
 */

import type { CockpitPersistedLayout } from './cockpitWorkspaceSchemas'

export type CockpitCompareTemplateId =
  | 'event_comms_prep'
  | 'event_staffing_rescue'
  | 'calendar_candidate_conflicts'
  | 'warroom_approvals'
  | 'volunteer_event_load'
  | 'finance_event_pressure'
  | 'leadership_war_room'

export type CockpitCompareTemplate = {
  id: CockpitCompareTemplateId
  title: string
  primary: CockpitPersistedLayout['centerPrimary']
  secondary: CockpitPersistedLayout['centerSecondary']
  /** Center layout mode — splits only */
  mode: 'split_h' | 'split_v'
  description: string
}

export const COCKPIT_COMPARE_TEMPLATES: readonly CockpitCompareTemplate[] = [
  {
    id: 'event_comms_prep',
    title: 'Event + Comms prep',
    primary: 'event_operations',
    secondary: 'communications_press',
    mode: 'split_h',
    description: 'Align program truth with promotion and media queues.',
  },
  {
    id: 'event_staffing_rescue',
    title: 'Event + Staffing rescue',
    primary: 'war_room',
    secondary: 'volunteer_command',
    mode: 'split_h',
    description: 'Prioritize interventions against volunteer capacity.',
  },
  {
    id: 'calendar_candidate_conflicts',
    title: 'Calendar + Candidate conflicts',
    primary: 'calendar',
    secondary: 'candidate_schedule',
    mode: 'split_h',
    description: 'Expose scheduling collisions early.',
  },
  {
    id: 'warroom_approvals',
    title: 'War Room + Approvals',
    primary: 'war_room',
    secondary: 'approvals_leadership',
    mode: 'split_h',
    description: 'Connect operational heat with governance throughput.',
  },
  {
    id: 'volunteer_event_load',
    title: 'Volunteer capacity + Event load',
    primary: 'volunteer_command',
    secondary: 'event_operations',
    mode: 'split_v',
    description: 'Workforce vs program density.',
  },
  {
    id: 'finance_event_pressure',
    title: 'Finance + Events',
    primary: 'finance_fundraising',
    secondary: 'event_operations',
    mode: 'split_h',
    description: 'Resources against program demand.',
  },
  {
    id: 'leadership_war_room',
    title: 'Executive briefing + War Room',
    primary: 'leadership_briefing',
    secondary: 'war_room',
    mode: 'split_h',
    description: 'Digest plus live multi-event board.',
  },
]

const byId = new Map(COCKPIT_COMPARE_TEMPLATES.map((t) => [t.id, t]))

export function getCompareTemplate(id: CockpitCompareTemplateId): CockpitCompareTemplate | undefined {
  return byId.get(id)
}
