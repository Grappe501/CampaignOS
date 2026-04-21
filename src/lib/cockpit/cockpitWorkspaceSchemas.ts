/**
 * Campaign Manager Cockpit — layout and module identifiers (windowing shell).
 */

export const COCKPIT_LAYOUT_VERSION = 1 as const

/** Registered module keys (extend over time). */
export type CockpitModuleId =
  | 'war_room'
  | 'calendar'
  | 'leadership_briefing'
  | 'volunteer_command'
  | 'event_operations'
  | 'field_operations'
  | 'communications_press'
  | 'finance_fundraising'
  | 'candidate_schedule'
  | 'approvals_leadership'
  | 'event_coordinator_desk'
  | 'analytics'

const COCKPIT_MODULE_ID_SET = new Set<string>([
  'war_room',
  'calendar',
  'leadership_briefing',
  'volunteer_command',
  'event_operations',
  'field_operations',
  'communications_press',
  'finance_fundraising',
  'candidate_schedule',
  'approvals_leadership',
  'event_coordinator_desk',
  'analytics',
])

/** Runtime guard for strings coming from server / storage — fails closed. */
export function isCockpitModuleId(x: string): x is CockpitModuleId {
  return COCKPIT_MODULE_ID_SET.has(x)
}

export type CenterLayoutMode = 'single' | 'split_h' | 'split_v' | 'quad'

export type CockpitQuadrantSlots = [
  CockpitModuleId,
  CockpitModuleId,
  CockpitModuleId,
  CockpitModuleId,
]

export type CockpitPersistedLayout = {
  v: typeof COCKPIT_LAYOUT_VERSION
  leftRail: CockpitModuleId[]
  rightRail: CockpitModuleId[]
  centerPrimary: CockpitModuleId
  centerSecondary: CockpitModuleId | null
  centerMode: CenterLayoutMode
  /** When centerMode is `quad`, which modules occupy TL, TR, BL, BR. */
  quadrantSlots: CockpitQuadrantSlots | null
  layoutLocked: boolean
  lastPreset: string | null
}

export type CockpitLayoutPresetName =
  | 'Morning Briefing'
  | 'Event Operations Day'
  | 'Fundraising Command'
  | 'Candidate Support'
  | 'Crisis Mode'
  | 'Weekend Field Push'
  | 'Communications Day'
  | 'GOTV Mode'

export const COCKPIT_PRESET_ORDER: CockpitLayoutPresetName[] = [
  'Morning Briefing',
  'Event Operations Day',
  'Fundraising Command',
  'Candidate Support',
  'Crisis Mode',
  'Weekend Field Push',
  'Communications Day',
  'GOTV Mode',
]
