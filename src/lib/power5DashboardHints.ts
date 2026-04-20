import { recommendContactPath } from './power5ContactStrategy'
import { POWER5_CONTACT_LABELS } from './power5Model'
import type { Power5RelationshipNodeRow } from './power5Model'

const EARLY = new Set(['identified', 'planning', 'stalled', 'first_contact'])

export function pickSuggestedPower5Node(
  nodes: Power5RelationshipNodeRow[],
): Power5RelationshipNodeRow | null {
  const ranked = [...nodes].sort(
    (a, b) => b.connection_strength - a.connection_strength || a.sort_order - b.sort_order,
  )
  return ranked.find((n) => EARLY.has(n.progress_state_key)) ?? ranked[0] ?? null
}

export function getPower5SuggestedNextLine(nodes: Power5RelationshipNodeRow[]): string | null {
  const next = pickSuggestedPower5Node(nodes)
  if (!next) return null
  const ch = recommendContactPath(next)
  return `Talk to ${next.display_label} via ${POWER5_CONTACT_LABELS[ch]}`
}

export function countEarlyStagePower5Nodes(nodes: Power5RelationshipNodeRow[]): number {
  return nodes.filter((n) => EARLY.has(n.progress_state_key)).length
}
