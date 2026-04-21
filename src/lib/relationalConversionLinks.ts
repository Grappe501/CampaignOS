/**
 * Relational leverage helpers — align with Power5 nodes (linked_voter_id, strength, kind).
 */

import type { Power5RelationshipNodeRow } from './power5Model'

export type RelationalConnectorRank = {
  node_id: string
  owner_profile_id: string
  display_label: string
  linked_voter_id: string | null
  connection_strength: number
  relationship_kind: string
  score: number
}

export function scorePower5NodeForConversion(n: Power5RelationshipNodeRow): number {
  let s = Number(n.connection_strength) || 0
  if (n.linked_voter_id) s += 2
  const st = String(n.progress_state_key ?? '').toLowerCase()
  if (st === 'committed' || st === 'activated' || st === 'signed_up') s += 1
  return s
}

export function rankPower5Connectors(nodes: readonly Power5RelationshipNodeRow[]): RelationalConnectorRank[] {
  return [...nodes]
    .map((n) => ({
      node_id: n.id,
      owner_profile_id: n.owner_profile_id,
      display_label: n.display_label,
      linked_voter_id: n.linked_voter_id,
      connection_strength: n.connection_strength,
      relationship_kind: n.relationship_kind,
      score: scorePower5NodeForConversion(n),
    }))
    .sort((a, b) => b.score - a.score)
}

export function nodesMissingRosterLink(nodes: readonly Power5RelationshipNodeRow[]): Power5RelationshipNodeRow[] {
  return [...nodes].filter((n) => !n.linked_voter_id || String(n.linked_voter_id).trim() === '')
}
