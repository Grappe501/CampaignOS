import type {
  AgentJonesAreaScore,
  AgentJonesCoverageSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
} from './agentJonesContextV2'

const PRIORITY_BAND_ORDER: Record<AgentJonesAreaScore['priority_band'], number> = {
  critical: 0,
  high: 1,
  watch: 2,
  stable: 3,
}

function scopeToAreaType(
  scope: string | null | undefined,
): AgentJonesAreaScore['area_type'] {
  const s = String(scope ?? '')
    .trim()
    .toLowerCase()
  if (s === 'precinct') return 'precinct'
  if (s === 'county') return 'county'
  if (s === 'district') return 'district'
  if (s === 'region') return 'region'
  if (s === 'campaign') return 'region'
  return 'turf'
}

/**
 * Infer area grain from label text when geo scope is coarse (e.g. campaign-wide).
 * Honest heuristics only — no voter-file typing.
 */
export function inferAreaTypeFromLabel(
  label: string,
  fallback: AgentJonesAreaScore['area_type'],
): AgentJonesAreaScore['area_type'] {
  const L = label.trim().toLowerCase()
  if (!L) return fallback
  if (/\bward\b/.test(L)) return 'ward'
  if (/\bprecinct\b|\bpct\.?\b/.test(L)) return 'precinct'
  if (/\bcounty\b|^co\.\s/.test(L)) return 'county'
  if (
    /congressional|state senate|state house|\bcd[-\s]?\d|district\s*\d/i.test(
      label,
    )
  ) {
    return 'district'
  }
  if (/\bregion\b|\bmetro\b|\bmarket\b/.test(L)) return 'region'
  return fallback
}

function stripProxySuffix(label: string): string {
  return label.replace(/\s*\(visible session[^)]*\)\s*$/i, '').trim() || label
}

function bandFromPressure(highPressure: number | null | undefined): AgentJonesAreaScore['priority_band'] {
  const n = highPressure ?? 0
  if (n >= 3) return 'critical'
  if (n >= 2) return 'high'
  if (n >= 1) return 'watch'
  return 'stable'
}

/**
 * Bounded 40–88 “coverage board” proxy when assignment/coverage signals exist — not a census score.
 */
export function coverageScoreFromBoard(
  coverage: AgentJonesCoverageSummary | null,
): number | null {
  if (!coverage) return null
  let v = 40
  let any = false
  if (coverage.readiness_headline?.trim()) {
    v += 20
    any = true
  }
  if ((coverage.event_staffing_pressure_count ?? 0) > 0) {
    v += 12
    any = true
  }
  if ((coverage.county_coverage_watch_count ?? 0) > 0) {
    v += 8
    any = true
  }
  if ((coverage.precinct_coverage_watch_count ?? 0) > 0) {
    v += 8
    any = true
  }
  if ((coverage.volunteer_shortage_area_labels?.length ?? 0) > 0) {
    v += 8
    any = true
  }
  if (!any) return null
  return Math.min(88, v)
}

/** Coarse 0–100 proxies from visible counts only — often null when not meaningful. */
function deriveScores(input: {
  priority: AgentJonesAreaScore['priority_band']
  isOpportunityList: boolean
  isStressProxy: boolean
}): Pick<
  AgentJonesAreaScore,
  'opportunity_score' | 'readiness_score' | 'pressure_score'
> {
  let opportunity_score: number | null = null
  let readiness_score: number | null = null
  let pressure_score: number | null = null

  if (input.isOpportunityList) {
    opportunity_score = 72
  }
  if (input.isStressProxy) {
    pressure_score = input.priority === 'critical' ? 85 : input.priority === 'high' ? 68 : 52
    readiness_score = Math.max(25, 85 - (pressure_score ?? 50))
  } else if (input.priority === 'stable') {
    readiness_score = 62
    opportunity_score = opportunity_score ?? 55
  }

  return {
    opportunity_score,
    readiness_score,
    pressure_score,
  }
}

function attachCoverageScores(
  rows: AgentJonesAreaScore[],
  coverage: AgentJonesCoverageSummary | null,
): AgentJonesAreaScore[] {
  const board = coverageScoreFromBoard(coverage)
  if (board == null) return rows
  return rows.map((r) =>
    r.coverage_score == null ? { ...r, coverage_score: board } : r,
  )
}

/** True comparative order: band → pressure → opportunity → label (stable tie-break). */
export function sortAgentJonesAreaRanking(rows: AgentJonesAreaScore[]): AgentJonesAreaScore[] {
  return [...rows].sort((a, b) => {
    const bo =
      PRIORITY_BAND_ORDER[a.priority_band] - PRIORITY_BAND_ORDER[b.priority_band]
    if (bo !== 0) return bo
    const pp = (b.pressure_score ?? -1) - (a.pressure_score ?? -1)
    if (pp !== 0) return pp
    const oo = (b.opportunity_score ?? -1) - (a.opportunity_score ?? -1)
    if (oo !== 0) return oo
    const cr = (b.coverage_score ?? -1) - (a.coverage_score ?? -1)
    if (cr !== 0) return cr
    return a.area_label.localeCompare(b.area_label)
  })
}

/**
 * Comparative area rows from roster-safe geo + visible field pressure — not a turf file ranking.
 */
export function buildAgentJonesAreaRanking(input: {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
}): AgentJonesAreaScore[] {
  const geo = input.geo
  const field = input.field
  const highN = field?.high_pressure_area_count ?? 0
  const defaultBand = bandFromPressure(highN || null)
  const scopeFallback = scopeToAreaType(geo?.scope_type)
  const rows: AgentJonesAreaScore[] = []
  const seen = new Set<string>()

  const pushRow = (row: AgentJonesAreaScore) => {
    const typed: AgentJonesAreaScore = {
      ...row,
      area_type: inferAreaTypeFromLabel(row.area_label, row.area_type),
    }
    const k = typed.area_label.trim().toLowerCase()
    if (!k || seen.has(k)) return
    seen.add(k)
    rows.push(typed)
  }

  const primary = geo?.primary_area_label?.trim()
  if (primary) {
    const stress =
      Boolean(field?.weakest_area_label?.includes(primary)) ||
      defaultBand === 'critical' ||
      defaultBand === 'high'
    const scores = deriveScores({
      priority: stress ? defaultBand : 'stable',
      isOpportunityList: false,
      isStressProxy: stress,
    })
    const cov = coverageScoreFromBoard(input.coverage)
    pushRow({
      area_label: stripProxySuffix(primary),
      area_type: scopeFallback,
      priority_band: stress ? defaultBand : 'stable',
      ...scores,
      coverage_score: cov,
      trend: stress ? 'slipping' : 'steady',
      recommendation_headline: stress
        ? 'Stabilize execution here before expanding asks.'
        : 'Hold rhythm; protect captains from scope creep.',
    })
  }

  for (const raw of geo?.undercovered_area_labels ?? []) {
    const label = raw.trim()
    if (!label) continue
    const scores = deriveScores({
      priority: 'watch',
      isOpportunityList: false,
      isStressProxy: true,
    })
    pushRow({
      area_label: stripProxySuffix(label),
      area_type: scopeFallback,
      priority_band: 'watch',
      ...scores,
      coverage_score: coverageScoreFromBoard(input.coverage),
      trend: 'slipping',
      recommendation_headline: 'Add visible coverage or captain air-cover before promising outcomes.',
    })
    if (rows.length >= 8) break
  }

  for (const raw of geo?.high_opportunity_area_labels ?? []) {
    const label = raw.trim()
    if (!label) continue
    const scores = deriveScores({
      priority: 'stable',
      isOpportunityList: true,
      isStressProxy: false,
    })
    pushRow({
      area_label: stripProxySuffix(label),
      area_type: scopeFallback,
      priority_band: 'stable',
      ...scores,
      coverage_score: coverageScoreFromBoard(input.coverage),
      trend: 'improving',
      recommendation_headline: 'Good candidate for volunteer pushes when nearby pressure is controlled.',
    })
    if (rows.length >= 8) break
  }

  const w = field?.weakest_area_label?.trim()
  if (w && !seen.has(stripProxySuffix(w).toLowerCase())) {
    pushRow({
      area_label: stripProxySuffix(w),
      area_type: scopeFallback,
      priority_band: defaultBand === 'stable' ? 'watch' : defaultBand,
      ...deriveScores({
        priority: defaultBand,
        isOpportunityList: false,
        isStressProxy: true,
      }),
      coverage_score: coverageScoreFromBoard(input.coverage),
      trend: 'slipping',
      recommendation_headline: 'Session stress proxy — sequence coordinator board + exceptions first.',
    })
  }

  const ranked = sortAgentJonesAreaRanking(attachCoverageScores(rows, input.coverage))
  return ranked.slice(0, 5)
}
