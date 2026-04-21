import type { CockpitModuleId, CockpitPersistedLayout } from './cockpitWorkspaceSchemas'
import { COCKPIT_LAYOUT_VERSION } from './cockpitWorkspaceSchemas'

const STORAGE_KEY = 'cm_cockpit_layout_v1'

const DEFAULT_LEFT: CockpitModuleId[] = [
  'field_operations',
  'volunteer_command',
  'event_operations',
  'communications_press',
]

const DEFAULT_RIGHT: CockpitModuleId[] = [
  'calendar',
  'finance_fundraising',
  'candidate_schedule',
  'approvals_leadership',
]

export function defaultCockpitLayout(): CockpitPersistedLayout {
  return {
    v: COCKPIT_LAYOUT_VERSION,
    leftRail: [...DEFAULT_LEFT],
    rightRail: [...DEFAULT_RIGHT],
    centerPrimary: 'war_room',
    centerSecondary: null,
    centerMode: 'single',
    quadrantSlots: null,
    layoutLocked: false,
    lastPreset: null,
  }
}

function isModuleId(x: unknown): x is CockpitModuleId {
  return typeof x === 'string'
}

function parseQuadrantSlots(raw: unknown): CockpitPersistedLayout['quadrantSlots'] {
  if (!Array.isArray(raw) || raw.length !== 4) return null
  if (!raw.every(isModuleId)) return null
  return [raw[0], raw[1], raw[2], raw[3]] as CockpitPersistedLayout['quadrantSlots']
}

function parseLayout(raw: unknown): CockpitPersistedLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<CockpitPersistedLayout>
  if (o.v !== COCKPIT_LAYOUT_VERSION) return null
  if (!Array.isArray(o.leftRail) || !Array.isArray(o.rightRail)) return null
  if (!o.leftRail.every(isModuleId) || !o.rightRail.every(isModuleId)) return null
  if (!isModuleId(o.centerPrimary)) return null
  const mode = o.centerMode
  if (mode !== 'single' && mode !== 'split_h' && mode !== 'split_v' && mode !== 'quad') return null
  const quadrantSlots =
    o.quadrantSlots === undefined || o.quadrantSlots === null
      ? null
      : parseQuadrantSlots(o.quadrantSlots)
  return {
    v: COCKPIT_LAYOUT_VERSION,
    leftRail: [...o.leftRail] as CockpitModuleId[],
    rightRail: [...o.rightRail] as CockpitModuleId[],
    centerPrimary: o.centerPrimary,
    centerSecondary: o.centerSecondary != null && isModuleId(o.centerSecondary) ? o.centerSecondary : null,
    centerMode: mode,
    quadrantSlots,
    layoutLocked: Boolean(o.layoutLocked),
    lastPreset: typeof o.lastPreset === 'string' ? o.lastPreset : null,
  }
}

export function loadCockpitLayout(): CockpitPersistedLayout {
  if (typeof window === 'undefined') return defaultCockpitLayout()
  try {
    const t = window.localStorage.getItem(STORAGE_KEY)
    if (!t) return defaultCockpitLayout()
    const parsed = parseLayout(JSON.parse(t) as unknown)
    return parsed ?? defaultCockpitLayout()
  } catch {
    return defaultCockpitLayout()
  }
}

export function saveCockpitLayout(layout: CockpitPersistedLayout): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* quota */
  }
}

/** Named presets swap center + sometimes rails — v1 heuristic. */
export function applyCockpitPreset(
  name: string,
  base: CockpitPersistedLayout,
): CockpitPersistedLayout {
  const next: CockpitPersistedLayout = { ...base, lastPreset: name, quadrantSlots: null }
  switch (name) {
    case 'Morning Briefing':
      return {
        ...next,
        centerPrimary: 'leadership_briefing',
        centerSecondary: null,
        centerMode: 'single',
      }
    case 'Event Operations Day':
      return {
        ...next,
        centerPrimary: 'war_room',
        centerSecondary: 'event_operations',
        centerMode: 'split_h',
      }
    case 'Fundraising Command':
      return {
        ...next,
        centerPrimary: 'finance_fundraising',
        centerMode: 'single',
      }
    case 'Candidate Support':
      return {
        ...next,
        centerPrimary: 'candidate_schedule',
        centerMode: 'single',
      }
    case 'Crisis Mode':
      return {
        ...next,
        centerPrimary: 'war_room',
        centerSecondary: 'calendar',
        centerMode: 'split_h',
      }
    case 'Weekend Field Push':
      return {
        ...next,
        centerPrimary: 'field_operations',
        centerMode: 'single',
      }
    case 'Communications Day':
      return {
        ...next,
        centerPrimary: 'communications_press',
        centerMode: 'single',
      }
    case 'GOTV Mode':
      return {
        ...next,
        centerPrimary: 'war_room',
        centerSecondary: 'volunteer_command',
        centerMode: 'split_h',
      }
    default:
      return base
  }
}
