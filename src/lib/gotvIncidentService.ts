/**
 * Incident helpers (deterministic copy + validation).
 */

import type { GotvIncidentKind } from './gotvDomain'
import { GOTV_INCIDENT_KINDS } from './gotvDomain'

export function normalizeIncidentKind(raw: string): GotvIncidentKind | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_')
  const hit = GOTV_INCIDENT_KINDS.find((k) => k === t)
  return hit ?? null
}

export function incidentTitleTemplate(kind: GotvIncidentKind): string {
  switch (kind) {
    case 'site_short_staffed':
      return 'Site short-staffed'
    case 'captain_absent':
      return 'Captain absent'
    case 'no_show_cluster':
      return 'No-show cluster'
    case 'routing_confusion':
      return 'Routing / wayfinding confusion'
    case 'supply_logistics':
      return 'Supply or logistics issue'
    case 'comms_breakdown':
      return 'Communications breakdown'
    case 'escalated_county':
      return 'Escalated to county lead'
    case 'escalated_leadership':
      return 'Escalated to leadership'
    default:
      return 'Site incident'
  }
}
