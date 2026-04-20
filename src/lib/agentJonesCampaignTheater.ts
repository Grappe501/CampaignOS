import type {
  AgentJonesAreaScore,
  AgentJonesCampaignTheaterSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
} from './agentJonesContextV2'
import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'

function theaterLabelFromGeo(geo: AgentJonesGeoIntelligence | null): string | null {
  if (!geo) return null
  const cd = geo.target_area_labels?.find((x) => /congress|cd-|district/i.test(x))
  if (cd?.trim()) return cd.trim().slice(0, 120)
  if (geo.scope_type === 'district' && geo.primary_area_label) {
    return `District focus: ${geo.primary_area_label.slice(0, 100)}`
  }
  if (geo.scope_type === 'county' && geo.primary_area_label) {
    return `County theater: ${geo.primary_area_label.slice(0, 100)}`
  }
  if (geo.primary_area_label) {
    return `Session geography: ${geo.primary_area_label.slice(0, 100)}`
  }
  return null
}

function pushUnique(arr: string[], label: string, max: number) {
  const L = label.trim()
  if (!L || arr.includes(L) || arr.length >= max) return
  arr.push(L)
}

/** Derive zone buckets from comparative ranking when multiple areas exist (Pass 3). */
function zonesFromAreaRanking(ranked: AgentJonesAreaScore[]): {
  strongest: string[]
  weakest: string[]
  opportunity: string[]
  recovery: string[]
} {
  const sorted = sortAgentJonesAreaRanking([...ranked])
  const strongest: string[] = []
  const weakest: string[] = []
  const opportunity: string[] = []
  const recovery: string[] = []

  for (const r of sorted) {
    if (r.priority_band === 'critical' || r.priority_band === 'high') {
      pushUnique(weakest, r.area_label, 4)
      pushUnique(recovery, r.area_label, 4)
    }
    if (r.priority_band === 'watch') {
      if (r.trend === 'slipping') {
        pushUnique(weakest, r.area_label, 4)
        pushUnique(recovery, r.area_label, 4)
      } else {
        pushUnique(opportunity, r.area_label, 4)
      }
    }
    if (r.priority_band === 'stable') {
      pushUnique(strongest, r.area_label, 4)
    }
    if (r.trend === 'improving' || (r.opportunity_score != null && r.opportunity_score >= 60)) {
      pushUnique(opportunity, r.area_label, 4)
    }
  }

  return { strongest, weakest, opportunity, recovery }
}

export function buildAgentJonesCampaignTheaterSummary(input: {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  operating: AgentJonesOperatingContext
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  area_ranking?: AgentJonesAreaScore[] | null
}): AgentJonesCampaignTheaterSummary | null {
  const geo = input.geo
  const field = input.field
  const theater_label = theaterLabelFromGeo(geo)

  const ranking = input.area_ranking?.length ? input.area_ranking : null
  const useRankingTheater = ranking != null && ranking.length >= 2
  const multi_area_note = useRankingTheater
    ? 'Multi-area view is session-ranked and directional — not a voter-file map.'
    : null

  let strongest: string[] = []
  const s = field?.strongest_area_label
    ?.replace(/\s*\(visible session[^)]*\)\s*$/i, '')
    .trim()
  if (s) strongest.push(s)

  let weakest: string[] = []
  const w = field?.weakest_area_label
    ?.replace(/\s*\(visible session[^)]*\)\s*$/i, '')
    .trim()
  if (w) weakest.push(w)

  let opportunity = [...(geo?.high_opportunity_area_labels ?? [])]
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4)

  let recovery =
    field?.high_pressure_area_count != null && field.high_pressure_area_count > 0 && w
      ? [w]
      : []

  if (useRankingTheater && ranking) {
    const z = zonesFromAreaRanking(ranking)
    if (z.strongest.length) strongest = z.strongest
    if (z.weakest.length) weakest = z.weakest
    if (z.opportunity.length) opportunity = z.opportunity
    if (z.recovery.length) recovery = z.recovery
  }

  const readiness =
    field?.area_readiness_summary?.slice(0, 200) ??
    (input.leadershipSnapshot && input.leadershipSnapshot.kpis_below_half_target > 0
      ? `${input.leadershipSnapshot.kpis_below_half_target} KPI lane(s) under half in this leadership view.`
      : null)

  const deskUrgent = Object.values(input.operating.desk_health).some((x) => x === 'urgent')
  const command_headline = deskUrgent
    ? 'At least one desk lane reads urgent in this session — stabilize governance before geographic expansion.'
    : field?.top_field_risks?.[0]?.slice(0, 180) ??
      (readiness ? 'Readiness is mixed — anchor plans to visible boards and KPIs only.' : null)

  if (
    !theater_label &&
    !strongest.length &&
    !weakest.length &&
    !opportunity.length &&
    !recovery.length &&
    !readiness &&
    !command_headline &&
    !multi_area_note
  ) {
    return null
  }

  return {
    theater_label,
    strongest_zone_labels: strongest.length ? strongest : undefined,
    weakest_zone_labels: weakest.length ? weakest : undefined,
    opportunity_zone_labels: opportunity.length ? opportunity : undefined,
    recovery_zone_labels: recovery.length ? recovery : undefined,
    readiness_headline: readiness,
    command_headline,
    ...(multi_area_note ? { multi_area_note } : {}),
  }
}
