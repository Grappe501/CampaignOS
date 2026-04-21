/**
 * Operational relationship graph between cockpit modules (Phase 3).
 * Ground truth for entities stays in domain services — this layer describes *inter-module* coupling.
 */

import type { CockpitModuleId } from './cockpitWorkspaceSchemas'

export type CockpitRelationKind =
  | 'depends_on'
  | 'blocks'
  | 'influences'
  | 'requires_approval_from'
  | 'staffed_by'
  | 'affects_calendar'
  | 'affects_candidate'
  | 'affects_comms'
  | 'affects_finance'
  | 'affects_field'
  | 'affects_volunteer_load'
  | 'affects_war_room_priority'
  | 'informs_leadership'

export type CockpitModuleEdge = {
  from: CockpitModuleId
  to: CockpitModuleId
  kind: CockpitRelationKind
  /** 1 = informational, 3 = strong coupling */
  weight: 1 | 2 | 3
  note: string
}

/** Curated interoperability edges — extend as domain models gain shared IDs. */
export const COCKPIT_MODULE_GRAPH: readonly CockpitModuleEdge[] = [
  { from: 'event_operations', to: 'approvals_leadership', kind: 'requires_approval_from', weight: 3, note: 'Program changes flow through governance.' },
  { from: 'approvals_leadership', to: 'event_operations', kind: 'blocks', weight: 2, note: 'Pending decisions hold staffing and promotion work.' },
  { from: 'war_room', to: 'event_operations', kind: 'influences', weight: 3, note: 'War-room priority reshapes event command focus.' },
  { from: 'war_room', to: 'volunteer_command', kind: 'affects_volunteer_load', weight: 2, note: 'Critical programs pull volunteer and leadership capacity.' },
  { from: 'calendar', to: 'candidate_schedule', kind: 'affects_candidate', weight: 2, note: 'Schedule density impacts principal availability.' },
  { from: 'calendar', to: 'event_operations', kind: 'depends_on', weight: 2, note: 'Calendar truth is fed by program events.' },
  { from: 'field_operations', to: 'volunteer_command', kind: 'staffed_by', weight: 2, note: 'Field execution leans on volunteer depth.' },
  { from: 'communications_press', to: 'event_operations', kind: 'depends_on', weight: 2, note: 'Comms cadence follows event certainty.' },
  { from: 'communications_press', to: 'candidate_schedule', kind: 'affects_comms', weight: 2, note: 'Principal movement drives press windows.' },
  { from: 'finance_fundraising', to: 'event_operations', kind: 'affects_finance', weight: 2, note: 'Resource constraints affect event support.' },
  { from: 'volunteer_command', to: 'event_operations', kind: 'influences', weight: 2, note: 'Volunteer capacity gates staffing reliability.' },
  { from: 'leadership_briefing', to: 'war_room', kind: 'informs_leadership', weight: 2, note: 'Executive digest synthesizes war-room signals.' },
  { from: 'analytics', to: 'war_room', kind: 'influences', weight: 1, note: 'Analytics informs priority hypotheses.' },
]

const byFrom = new Map<CockpitModuleId, CockpitModuleEdge[]>()
const byTo = new Map<CockpitModuleId, CockpitModuleEdge[]>()

for (const e of COCKPIT_MODULE_GRAPH) {
  if (!byFrom.has(e.from)) byFrom.set(e.from, [])
  byFrom.get(e.from)!.push(e)
  if (!byTo.has(e.to)) byTo.set(e.to, [])
  byTo.get(e.to)!.push(e)
}

export function getEdgesFrom(moduleId: CockpitModuleId): CockpitModuleEdge[] {
  return byFrom.get(moduleId) ?? []
}

export function getEdgesTo(moduleId: CockpitModuleId): CockpitModuleEdge[] {
  return byTo.get(moduleId) ?? []
}

export function getRelatedModuleIds(moduleId: CockpitModuleId): CockpitModuleId[] {
  const s = new Set<CockpitModuleId>()
  for (const e of getEdgesFrom(moduleId)) s.add(e.to)
  for (const e of getEdgesTo(moduleId)) s.add(e.from)
  return [...s]
}

/**
 * BFS from seeds through the undirected module graph — caps breadth to keep UX + payloads tight.
 */
export function expandRelatedModules(seeds: CockpitModuleId[], maxTotal: number): CockpitModuleId[] {
  const out: CockpitModuleId[] = []
  const seen = new Set<CockpitModuleId>()
  const push = (m: CockpitModuleId) => {
    if (out.length >= maxTotal || seen.has(m)) return
    seen.add(m)
    out.push(m)
  }
  for (const s of seeds) push(s)
  if (out.length >= maxTotal) return out
  for (const s of [...seeds]) {
    for (const n of getRelatedModuleIds(s)) {
      push(n)
      if (out.length >= maxTotal) return out
    }
  }
  return out
}
