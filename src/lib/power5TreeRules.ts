/**
 * Tree attribution and overlap rules (deterministic; complements DB triggers).
 */

export const POWER5_MAX_CORE_TEAM_MEMBERSHIPS = 5

export const POWER5_RELAY_BATCH_MAX = 5

export type TreeAttributionRule = {
  id: string
  summary: string
}

export const POWER5_TREE_RULES: TreeAttributionRule[] = [
  {
    id: 'recruiter-root',
    summary:
      'Each recruit stays attributed to the tree and recruitment link that brought them in.',
  },
  {
    id: 'no-auto-reparent',
    summary:
      'Joining another volunteer’s tree does not move people you already added under your first tree.',
  },
  {
    id: 'overlap-cap',
    summary: `A volunteer can hold at most ${POWER5_MAX_CORE_TEAM_MEMBERSHIPS} core team memberships (enforced in the database).`,
  },
  {
    id: 'relay-scope',
    summary:
      'Relay prompts are scoped to your own nodes — no campaign-wide blast or auto-send.',
  },
]

export function explainMembershipOverlap(currentCount: number): string {
  if (currentCount >= POWER5_MAX_CORE_TEAM_MEMBERSHIPS) {
    return `At the ${POWER5_MAX_CORE_TEAM_MEMBERSHIPS}-team limit — finish or hand off a tree before adding another core membership.`
  }
  return `${currentCount} of ${POWER5_MAX_CORE_TEAM_MEMBERSHIPS} core tree slots in use.`
}
