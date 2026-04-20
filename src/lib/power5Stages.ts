/**
 * Deterministic Power of 5 node stages (DB keys in power5_progress_states + extensions).
 */

export type Power5StageKey = string

export const POWER5_STAGE_LABELS: Record<string, string> = {
  dormant: 'Dormant',
  stalled: 'Paused',
  identified: 'Identified',
  planning: 'Planning contact',
  first_contact: 'First contact',
  contacted: 'Contacted',
  follow_up: 'Follow-up',
  invited: 'Invited',
  interested: 'Interested',
  committed: 'Committed',
  activated: 'Activated / committed',
  signed_up: 'Signed up',
  matched_voter: 'Matched on roster',
  active: 'Active',
}

export const POWER5_STAGE_BADGE_CLASS: Record<string, string> = {
  dormant: 'power5-badge--muted',
  stalled: 'power5-badge--muted',
  identified: 'power5-badge--new',
  planning: 'power5-badge--plan',
  first_contact: 'power5-badge--plan',
  contacted: 'power5-badge--progress',
  follow_up: 'power5-badge--progress',
  invited: 'power5-badge--progress',
  interested: 'power5-badge--hot',
  committed: 'power5-badge--hot',
  activated: 'power5-badge--hot',
  signed_up: 'power5-badge--done',
  matched_voter: 'power5-badge--done',
  active: 'power5-badge--done',
}

/** Allowed transitions (minimal guardrails; UI may still allow admin jumps). */
const ALLOWED: Record<string, Set<string>> = {
  identified: new Set(['planning', 'first_contact', 'contacted', 'stalled', 'dormant']),
  planning: new Set(['first_contact', 'contacted', 'stalled']),
  first_contact: new Set(['contacted', 'follow_up', 'invited', 'stalled']),
  contacted: new Set(['follow_up', 'invited', 'interested', 'stalled']),
  follow_up: new Set(['invited', 'interested', 'committed', 'contacted', 'stalled']),
  invited: new Set(['interested', 'committed', 'follow_up', 'stalled']),
  interested: new Set(['committed', 'contacted', 'invited', 'stalled']),
  committed: new Set(['activated', 'signed_up', 'contacted', 'stalled']),
  activated: new Set(['signed_up', 'matched_voter', 'active', 'follow_up']),
  signed_up: new Set(['matched_voter', 'active', 'follow_up']),
  matched_voter: new Set(['active', 'follow_up']),
  active: new Set(['follow_up', 'dormant']),
  stalled: new Set(['identified', 'planning', 'contacted', 'follow_up']),
  dormant: new Set(['identified', 'planning']),
}

export function canTransitionPower5Stage(from: string, to: string): boolean {
  if (from === to) return true
  const set = ALLOWED[from]
  if (!set) return true
  return set.has(to)
}

export function labelForPower5Stage(key: string): string {
  return POWER5_STAGE_LABELS[key] ?? key.replace(/_/g, ' ')
}

export function badgeClassForPower5Stage(key: string): string {
  return POWER5_STAGE_BADGE_CLASS[key] ?? 'power5-badge--default'
}

/** Rough progression score 0–1 for gamification hooks. */
export function power5StageScore(key: string): number {
  const order = [
    'dormant',
    'stalled',
    'identified',
    'planning',
    'first_contact',
    'contacted',
    'follow_up',
    'invited',
    'interested',
    'committed',
    'activated',
    'signed_up',
    'matched_voter',
    'active',
  ]
  const i = order.indexOf(key)
  if (i < 0) return 0.2
  return Math.min(1, (i + 1) / order.length)
}
