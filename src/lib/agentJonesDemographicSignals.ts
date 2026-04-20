import type {
  AgentJonesContextV2,
  AgentJonesDemographicSummary,
  AgentJonesGeoIntelligence,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole } from './agentJonesRoleDesk'

function qualitativePopulationBand(
  st: AgentJonesGeoIntelligence['scope_type'] | null | undefined,
): string | null {
  if (st === 'precinct') {
    return 'Precinct-scale universe (typical voter count is smaller than whole-county — no numeric population loaded here; not census data).'
  }
  if (st === 'county') {
    return 'County-scale universe (larger than a single precinct — no numeric population loaded here; not census data).'
  }
  if (st === 'district') {
    return 'Legislative-district scale (broad geography — treat voter population as unknown in chat without data-team confirmation).'
  }
  if (st === 'region') {
    return 'Regional / multi-unit framing — stay qualitative; no population figure in this payload.'
  }
  if (st === 'campaign' || !st) {
    return 'Campaign-wide or undefined geography in this session — use public messaging scale only, not micro-targeting claims.'
  }
  return null
}

function roleScopedConfidenceSuffix(role: AgentJonesNormalizedRole | null | undefined): string {
  if (role === 'coordinator') {
    return ' Coordinator scope: tie narratives to supervised board counts you can see — not census or purchased microtargeting lists.'
  }
  if (role === 'campaign_manager' || role === 'assistant_campaign_manager') {
    return ' CM/ACM scope: sequence cross-desk escalation and KPI weakest lane before opening new geographic programs.'
  }
  if (role === 'admin') {
    return ' Admin scope: governance and exceptions gate effective field coverage — keep narratives inside visible desk signals.'
  }
  return ''
}

/** Issue pillars + geography + scope heuristics only — never raw voter or census rows. */
export function buildAgentJonesDemographicSummary(input: {
  geo: AgentJonesGeoIntelligence | null
  campaign: AgentJonesContextV2['campaign'] | null | undefined
  commandScope: boolean
  /** When set, tightens confidence_note for coordinator / CM / admin command surfaces. */
  normalizedRole?: AgentJonesNormalizedRole | null
}): AgentJonesDemographicSummary | null {
  if (!input.commandScope) return null

  const geo = input.geo
  const area_label = geo?.primary_area_label ?? null
  const population_band = qualitativePopulationBand(geo?.scope_type ?? null)

  const highlights: string[] = []
  const pillars = input.campaign?.issuePillars
  if (pillars?.length) {
    for (const p of pillars.slice(0, 2)) {
      const t = p.title?.trim()
      if (t) highlights.push(`Campaign public pillar: ${t}`)
    }
  }

  const organizing: string[] = []
  const st = geo?.scope_type
  if (st === 'precinct') {
    organizing.push(
      'Precinct-scale work favors neighbor trust, visible community presence, and clear polling-place plans over generic blast messaging.',
    )
  } else if (st === 'county') {
    organizing.push(
      'County-scale work benefits from hub-and-spoke captains, consistent messaging from public campaign materials, and honest capacity tracking.',
    )
  } else if (st === 'district') {
    organizing.push(
      'District-wide narratives should stay anchored in public campaign pillars and visible KPI goals — avoid implying precinct-level detail you cannot see here.',
    )
  } else if (st === 'region') {
    organizing.push(
      'Multi-unit regional framing needs consistent public messaging and clear handoffs between captains — avoid fake precision on local turnout.',
    )
  } else if (!st || st === 'campaign') {
    organizing.push(
      'Stay at the level of public campaign messaging and visible desk signals until roster-linked geography is available.',
    )
  }

  const turnout: string[] = []
  turnout.push(
    'Turnout strategy belongs to principals and data stewards — here you only have coaching context, not turnout modeling.',
  )

  const baseConfidence =
    'Summary uses public campaign copy and roster-safe geography only — not census microdata, commercial voter models, or raw files.'
  const roleNote = roleScopedConfidenceSuffix(input.normalizedRole ?? null)

  const clipNote = (s: string) => (s.length > 360 ? `${s.slice(0, 357)}…` : s)

  if (!area_label && highlights.length === 0 && organizing.length === 0) {
    return {
      confidence_note: clipNote(
        `No geography or public-issue context in this payload — do not invent demographic or census detail.${roleNote}`,
      ),
    }
  }

  return {
    area_label,
    population_band,
    turnout_relevant_notes: turnout.slice(0, 2),
    demographic_highlights: highlights.slice(0, 3),
    organizing_considerations: organizing.slice(0, 2),
    confidence_note: clipNote(`${baseConfidence}${roleNote}`),
  }
}
