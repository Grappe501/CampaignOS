/**
 * Turnout intervention hints (deterministic — execution via tasks/queues).
 */

import type { GotvInterventionKind } from './gotvDomain'
import type { GotvSiteRollup } from './gotvMetrics'
import { GOTV_ROUTES, gotvCountyOpsAnchor } from './gotvDomain'
import type { GotvTurnoutPhase } from './gotvDomain'

export type GotvInterventionHint = {
  kind: GotvInterventionKind
  title: string
  explanation: string
  route_path: string
  site_id: string | null
  county_id: string | null
}

export function buildGotvInterventionHints(
  rollups: readonly GotvSiteRollup[],
  phase: GotvTurnoutPhase,
): GotvInterventionHint[] {
  const sorted = [...rollups].sort((a, b) => a.score - b.score)
  const hints: GotvInterventionHint[] = []

  for (const r of sorted.slice(0, 8)) {
    if (r.readiness_band !== 'red' && r.readiness_band !== 'orange') continue
    hints.push({
      kind: r.next_intervention_hint === 'Assign captain' ? 'assign_captain' : 'fill_site',
      title: `${r.next_intervention_hint ?? 'Fill site'}: ${r.label}`,
      explanation: `${r.primary_reasons[0] ?? 'Coverage risk'} — phase ${phase.replace(/_/g, ' ')}.`,
      route_path: gotvCountyOpsAnchor(r.county_id),
      site_id: r.site_id,
      county_id: r.county_id,
    })
  }

  if (
    phase === 'election_day' ||
    phase === 'pre_election_48h' ||
    phase === 'early_vote_launch'
  ) {
    hints.push({
      kind: 'rapid_action_route',
      title: 'Open rapid actions for coordinator desk',
      explanation: 'Use trusted rapid actions for staffing and reminders — no silent sends.',
      route_path: GOTV_ROUTES.coordinator_desk,
      site_id: null,
      county_id: null,
    })
  }

  return hints.slice(0, 12)
}
