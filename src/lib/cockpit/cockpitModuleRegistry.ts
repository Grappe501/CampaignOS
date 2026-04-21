import type { CockpitModuleId } from './cockpitWorkspaceSchemas'

export type CockpitModuleZone = 'left_rail' | 'right_rail' | 'center' | 'deck'

export type CockpitModuleRegistryEntry = {
  id: CockpitModuleId
  title: string
  shortTitle: string
  /** Lucide-style single char / emoji for deck buttons */
  icon: string
  defaultZone: CockpitModuleZone
  /** Route for “open full page” when embed is heavy or unavailable */
  fullPageHref: string | null
  description: string
}

export const COCKPIT_MODULE_REGISTRY = [
  {
    id: 'war_room',
    title: 'War Room',
    shortTitle: 'War room',
    icon: '⚡',
    defaultZone: 'center',
    fullPageHref: '/events/war-room',
    description: 'Multi-event priority and interventions',
  },
  {
    id: 'calendar',
    title: 'Campaign calendar',
    shortTitle: 'Calendar',
    icon: '▦',
    defaultZone: 'right_rail',
    fullPageHref: '/events/calendar',
    description: 'Program calendar — agenda & month views; center takeover capable',
  },
  {
    id: 'leadership_briefing',
    title: 'Executive briefing',
    shortTitle: 'Briefing',
    icon: '◆',
    defaultZone: 'center',
    fullPageHref: '/events/leadership',
    description: 'Leadership reporting / digest',
  },
  {
    id: 'volunteer_command',
    title: 'Volunteer command',
    shortTitle: 'Volunteers',
    icon: '◎',
    defaultZone: 'left_rail',
    fullPageHref: '/volunteers/command',
    description: 'Coordinator volunteer operations',
  },
  {
    id: 'event_operations',
    title: 'Event operations',
    shortTitle: 'Events',
    icon: '▣',
    defaultZone: 'left_rail',
    fullPageHref: '/events',
    description: 'Coordinator desk — program list',
  },
  {
    id: 'field_operations',
    title: 'Field operations',
    shortTitle: 'Field',
    icon: '▲',
    defaultZone: 'left_rail',
    fullPageHref: '/events/county-ops',
    description: 'County / neighborhood field surfaces',
  },
  {
    id: 'communications_press',
    title: 'Communications / press',
    shortTitle: 'Comms',
    icon: '✦',
    defaultZone: 'left_rail',
    fullPageHref: '/events/promotion',
    description: 'Promotion & media pipeline',
  },
  {
    id: 'finance_fundraising',
    title: 'Finance / fundraising',
    shortTitle: 'Finance',
    icon: '$',
    defaultZone: 'right_rail',
    fullPageHref: '/dashboard',
    description: 'Financial summary — route stub to dashboard KPIs until dedicated module',
  },
  {
    id: 'candidate_schedule',
    title: 'Candidate & schedule',
    shortTitle: 'Candidate',
    icon: '★',
    defaultZone: 'right_rail',
    fullPageHref: '/candidate',
    description: 'Candidate desk / schedule focus',
  },
  {
    id: 'approvals_leadership',
    title: 'Approvals & leadership',
    shortTitle: 'Approvals',
    icon: '✓',
    defaultZone: 'right_rail',
    fullPageHref: '/events/review-requests',
    description: 'Governance queue and decisions',
  },
  {
    id: 'event_coordinator_desk',
    title: 'Coordinator desk (full)',
    shortTitle: 'Desk',
    icon: '▤',
    defaultZone: 'center',
    fullPageHref: '/events',
    description: 'Full event coordinator workspace',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    shortTitle: 'Data',
    icon: '◫',
    defaultZone: 'right_rail',
    fullPageHref: '/events/analytics',
    description: 'Event analytics command',
  },
] as const satisfies readonly CockpitModuleRegistryEntry[]

const byId = new Map<CockpitModuleId, CockpitModuleRegistryEntry>(
  COCKPIT_MODULE_REGISTRY.map((m) => [m.id, m]),
)

export function getCockpitModuleMeta(id: CockpitModuleId): CockpitModuleRegistryEntry | undefined {
  return byId.get(id)
}
