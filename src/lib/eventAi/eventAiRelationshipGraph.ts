/**
 * Cross-system relationship graph — bridges cockpit module graph with event-scoped edges.
 * Queries are deterministic, capped, and prefer edges **incident to seed modules** to reduce noise.
 */

import type { CockpitModuleId } from '../cockpit/cockpitWorkspaceSchemas'
import {
  COCKPIT_MODULE_GRAPH,
  expandRelatedModules,
  getEdgesFrom,
  getEdgesTo,
  type CockpitModuleEdge,
} from '../cockpit/cockpitRelationshipGraph'

export type EventAiRelationKind =
  | CockpitModuleEdge['kind']
  | 'owned_by'
  | 'informs_after_action'
  | 'informs_template_refinement'
  | 'affects_leadership_visibility'

export type EventAiGraphEdge = {
  from: CockpitModuleId | 'event_anchor'
  to: CockpitModuleId | 'event_anchor'
  kind: EventAiRelationKind
  weight: 1 | 2 | 3
  note: string
}

/** Default anchor edges: event operations hub connects outward (conceptual, not a new datastore). */
const EVENT_ANCHOR_EDGES: readonly EventAiGraphEdge[] = [
  {
    from: 'event_anchor',
    to: 'event_operations',
    kind: 'depends_on',
    weight: 3,
    note: 'Program event row drives event operations module view.',
  },
  {
    from: 'event_operations',
    to: 'calendar',
    kind: 'affects_calendar',
    weight: 2,
    note: 'Timing and holds interact with calendar truth.',
  },
  {
    from: 'event_operations',
    to: 'communications_press',
    kind: 'depends_on',
    weight: 2,
    note: 'Promotion cadence follows event certainty.',
  },
  {
    from: 'event_operations',
    to: 'volunteer_command',
    kind: 'staffed_by',
    weight: 2,
    note: 'Volunteer assignments gate reliability.',
  },
  {
    from: 'event_operations',
    to: 'approvals_leadership',
    kind: 'requires_approval_from',
    weight: 3,
    note: 'Governance can block activation.',
  },
  {
    from: 'event_operations',
    to: 'candidate_schedule',
    kind: 'affects_candidate',
    weight: 2,
    note: 'Principal movement interacts with schedule.',
  },
  {
    from: 'event_operations',
    to: 'finance_fundraising',
    kind: 'affects_finance',
    weight: 1,
    note: 'Resource asks may follow program scale.',
  },
  {
    from: 'event_operations',
    to: 'field_operations',
    kind: 'affects_field',
    weight: 2,
    note: 'Field execution aligns with program footprint.',
  },
  {
    from: 'event_operations',
    to: 'war_room',
    kind: 'influences',
    weight: 2,
    note: 'Health and priority surface in war room.',
  },
  {
    from: 'event_operations',
    to: 'leadership_briefing',
    kind: 'informs_leadership',
    weight: 2,
    note: 'Executive digest pulls program signals.',
  },
]

function humanizeKind(k: string): string {
  return k.replace(/_/g, ' ')
}

export function getCockpitEdgesForModule(moduleId: CockpitModuleId): CockpitModuleEdge[] {
  return [...getEdgesFrom(moduleId), ...getEdgesTo(moduleId)]
}

export function moduleIdsConnectedToEventAnchor(maxModules: number): CockpitModuleId[] {
  const fromAnchor = EVENT_ANCHOR_EDGES.filter((e) => e.to !== 'event_anchor').map((e) => e.to)
  const seeds = fromAnchor.filter((m): m is CockpitModuleId => m !== 'event_anchor')
  return expandRelatedModules(seeds, maxModules)
}

/**
 * Summarize edges that touch **seed** modules first — avoids unrelated cross-links reading as peer relationships.
 */
export function summarizeGraphForPacket(seedModules: CockpitModuleId[], maxLines: number): string[] {
  const seeds = new Set(seedModules)
  const lines: string[] = []
  const seen = new Set<string>()

  for (const e of COCKPIT_MODULE_GRAPH) {
    if (!seeds.has(e.from) && !seeds.has(e.to)) continue
    const key = `${e.from}|${e.to}|${e.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`${e.from} ${humanizeKind(e.kind)} ${e.to} — ${e.note}`)
    if (lines.length >= maxLines) return lines
  }

  for (const m of seedModules) {
    for (const e of getCockpitEdgesForModule(m)) {
      const key = `${e.from}|${e.to}|${e.kind}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push(`${e.from} ${humanizeKind(e.kind)} ${e.to} — ${e.note}`)
      if (lines.length >= maxLines) return lines
    }
  }

  return lines
}

export function whatImprovesIfBlockerCleared(blockerHint: string, seeds: CockpitModuleId[]): string[] {
  const base = summarizeGraphForPacket(seeds, 6)
  return [
    `If blocker clears (${blockerHint.slice(0, 120)}), downstream coupling suggests relief on:`,
    ...base.slice(0, 4),
  ]
}
