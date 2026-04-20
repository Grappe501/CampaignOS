import { buildAgentJonesDeskSummary } from './agentJonesDeskSummaries'
import { buildAgentJonesNavigationHints } from './agentJonesNavigationHints'
import { buildAgentJonesPrioritySignals } from './agentJonesPrioritySignals'
import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'
import { agentJonesV32CommandScope } from './agentJonesV32Pack'
import type { AgentJonesV33Pack } from './agentJonesV33Pack'
import type { AgentJonesV34Pack } from './agentJonesV34Pack'
import type {
  AgentJonesCoverageSummary,
  AgentJonesDeskSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesNavigationHint,
  AgentJonesOperatingContext,
  AgentJonesPrioritySignal,
  AgentJonesSurface,
} from './agentJonesContextV2'

export type AgentJonesV3Brain = {
  priority_signals: AgentJonesPrioritySignal[]
  desk_summary: AgentJonesDeskSummary
  navigation_hints: AgentJonesNavigationHint[]
}

/** Optional v3.2 slice merged into priority cards and desk headline (Pass 1). */
export type AgentJonesV32BrainSlice = {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
}

function leadershipishSurface(surface: AgentJonesSurface): boolean {
  return (
    surface === 'admin_desk' ||
    surface === 'candidate_desk' ||
    surface === 'coordinator_desk'
  )
}

function mergeV32PrioritySignals(
  base: AgentJonesPrioritySignal[],
  surface: AgentJonesSurface,
  v32: AgentJonesV32BrainSlice,
): AgentJonesPrioritySignal[] {
  if (!leadershipishSurface(surface)) return base

  const extra: AgentJonesPrioritySignal[] = []
  const risk = v32.field?.top_field_risks?.[0]
  if (risk) {
    extra.push({
      id: 'v32-field-visible-risk',
      severity: 'medium',
      category: 'readiness',
      title: 'Visible field pressure (session)',
      explanation: risk.slice(0, 320),
      owner_hint: null,
      route_hint: surface === 'coordinator_desk' ? '/coordinator' : null,
      target_id: surface === 'coordinator_desk' ? 'coordinator-mission-ops' : null,
      confidence: 1,
    })
  }

  const geo = v32.geo?.primary_area_label
  const cov = v32.coverage?.readiness_headline
  if (geo && cov) {
    extra.push({
      id: 'v32-coverage-readiness-geo',
      severity: 'low',
      category: 'readiness',
      title: 'Coverage / staffing hint (roster scope)',
      explanation: `${geo}: ${cov.slice(0, 280)}`,
      owner_hint: null,
      route_hint: null,
      target_id: null,
      confidence: 1,
    })
  }

  return [...base, ...extra].slice(0, 10)
}

function mergeV32DeskHeadline(
  headline: string,
  surface: AgentJonesSurface,
  v32: AgentJonesV32BrainSlice,
): string {
  const geo = v32.geo?.primary_area_label?.trim()
  if (!geo) return headline
  if (!leadershipishSurface(surface)) return headline
  const suffix = ` Roster geography anchor: ${geo.length > 90 ? `${geo.slice(0, 87)}…` : geo}.`
  if (headline.includes(geo.slice(0, 20))) return headline
  return `${headline}${suffix}`
}

function v33BrainScope(surface: AgentJonesSurface, operating: AgentJonesOperatingContext): boolean {
  return agentJonesV32CommandScope({
    surface,
    normalizedRole: operating.normalized_role,
    userScope: operating.user_scope,
  })
}

function mergeV33PrioritySignals(
  base: AgentJonesPrioritySignal[],
  operating: AgentJonesOperatingContext,
  surface: AgentJonesSurface,
  v33: AgentJonesV33Pack,
): AgentJonesPrioritySignal[] {
  if (!v33BrainScope(surface, operating)) return base
  const extra: AgentJonesPrioritySignal[] = []
  const top = v33.area_ranking?.length
    ? sortAgentJonesAreaRanking(v33.area_ranking)[0]
    : undefined
  if (top && (top.priority_band === 'critical' || top.priority_band === 'high')) {
    extra.push({
      id: 'v33-area-comparative',
      severity: top.priority_band === 'critical' ? 'high' : 'medium',
      category: 'readiness',
      title: `Area priority (commander): ${top.area_label}`,
      explanation: (
        top.recommendation_headline ??
        `${top.priority_band} band for ${top.area_type} — bounded session ranking only.`
      ).slice(0, 320),
      owner_hint: null,
      route_hint: surface === 'coordinator_desk' ? '/coordinator' : null,
      target_id: surface === 'coordinator_desk' ? 'coordinator-mission-ops' : null,
      confidence: 1,
    })
  }
  const fusion = v33.command_fusion?.top_combined_pressure_headline?.trim()
  if (fusion) {
    extra.push({
      id: 'v33-fused-pressure',
      severity: 'medium',
      category: 'missions',
      title: 'Fused field / task / calendar pressure',
      explanation: fusion.slice(0, 320),
      owner_hint: null,
      route_hint: null,
      target_id: null,
      confidence: 1,
    })
  }
  return [...base, ...extra].slice(0, 10)
}

function mergeV33DeskHeadline(
  headline: string,
  surface: AgentJonesSurface,
  operating: AgentJonesOperatingContext,
  v33: AgentJonesV33Pack,
): string {
  if (!v33BrainScope(surface, operating)) return headline
  const t = v33.campaign_theater?.command_headline?.trim()
  if (!t) return headline
  const frag = t.length > 100 ? `${t.slice(0, 97)}…` : t
  if (headline.includes(frag.slice(0, 24))) return headline
  return `${headline} Commander: ${frag}`
}

function mergeV33NavigationHints(
  hints: AgentJonesNavigationHint[],
  input: {
    pathname: string
    surface: AgentJonesSurface
    operating: AgentJonesOperatingContext
    v33: AgentJonesV33Pack
  },
): AgentJonesNavigationHint[] {
  if (!v33BrainScope(input.surface, input.operating)) return hints
  const keyOf = (h: AgentJonesNavigationHint) =>
    `${h.kind}|${h.route ?? ''}|${h.target_id ?? ''}`

  const p = input.pathname.split('?')[0] ?? '/'
  const ranked = input.v33.area_ranking?.length
    ? sortAgentJonesAreaRanking(input.v33.area_ranking)
    : []
  const top = ranked[0]
  const firstHints: AgentJonesNavigationHint[] = []

  if (top && (top.priority_band === 'critical' || top.priority_band === 'high')) {
    let targetId: string | null = null
    if (input.surface === 'coordinator_desk' || p.startsWith('/coordinator')) {
      targetId = 'coordinator-mission-ops'
    } else if (input.surface === 'admin_desk' || p.startsWith('/admin')) {
      targetId = 'admin-overview'
    } else if (input.surface === 'candidate_desk' || p.startsWith('/candidate')) {
      targetId = 'candidate-health-snapshot'
    }
    if (targetId) {
      const short =
        top.area_label.length > 30 ? `${top.area_label.slice(0, 27)}…` : top.area_label
      firstHints.push({
        kind: 'scroll',
        label: `Top area: ${short}`,
        route: null,
        target_id: targetId,
        reason: `${top.priority_band} priority — ${(top.recommendation_headline ?? 'See area ranking in context.').slice(0, 100)}`,
        priority: 1,
      })
    }
  }

  const out = [...firstHints, ...hints]
  const dedup: AgentJonesNavigationHint[] = []
  const seen = new Set<string>()
  for (const h of out) {
    const k = keyOf(h)
    if (seen.has(k) || dedup.length >= 3) continue
    seen.add(k)
    dedup.push({ ...h, priority: (dedup.length + 1) as 1 | 2 | 3 })
  }

  const push = (h: Omit<AgentJonesNavigationHint, 'priority'>) => {
    const k = keyOf(h as AgentJonesNavigationHint)
    if (seen.has(k) || dedup.length >= 3) return
    seen.add(k)
    dedup.push({ ...h, priority: (dedup.length + 1) as 1 | 2 | 3 })
  }

  if (
    input.v33.command_fusion &&
    (p.startsWith('/coordinator') || input.surface === 'coordinator_desk')
  ) {
    push({
      kind: 'scroll',
      label: 'Mission operations',
      route: null,
      target_id: 'coordinator-mission-ops',
      reason: 'Fused pressure points to supervised execution',
    })
  }
  if (
    input.v33.event_deployment?.staffing_pressure_count &&
    input.v33.event_deployment.staffing_pressure_count > 0 &&
    input.surface === 'candidate_desk'
  ) {
    push({
      kind: 'scroll',
      label: 'Campaign health',
      route: null,
      target_id: 'candidate-health-snapshot',
      reason: 'Event staffing pressure — align principals with visible health strip',
    })
  }
  if (
    input.v33.area_ranking?.some((a) => a.priority_band === 'critical' || a.priority_band === 'high') &&
    (p.startsWith('/admin') || input.surface === 'admin_desk') &&
    !dedup.some((h) => h.target_id === 'admin-overview')
  ) {
    push({
      kind: 'scroll',
      label: 'Admin overview',
      route: null,
      target_id: 'admin-overview',
      reason: 'High-priority area signal — triage governance view',
    })
  }

  return dedup.slice(0, 3)
}

function mergeV34PrioritySignals(
  base: AgentJonesPrioritySignal[],
  operating: AgentJonesOperatingContext,
  surface: AgentJonesSurface,
  v34: AgentJonesV34Pack,
): AgentJonesPrioritySignal[] {
  if (!v33BrainScope(surface, operating)) return base
  const gv = v34.gotv_summary
  if (!gv?.gotv_mode_active) return base
  const ex =
    gv.turnout_risk_headline?.trim() ?? gv.volunteer_deployment_headline?.trim()
  if (!ex) return base
  const urgent =
    v34.countdown_summary?.countdown_window === 'same_day' ||
    v34.countdown_summary?.countdown_window === '24h'
  let out = [
    ...base,
    {
      id: 'v34-gotv-proxy',
      severity: urgent ? 'high' : 'medium',
      category: 'missions',
      title: 'GOTV window (session proxies)',
      explanation: ex.slice(0, 320),
      owner_hint: null,
      route_hint: surface === 'coordinator_desk' ? '/coordinator' : null,
      target_id: surface === 'coordinator_desk' ? 'coordinator-mission-ops' : null,
      confidence: 1,
    },
  ].slice(0, 10)

  const tr = v34.tradeoff_summary
  const isCm =
    operating.normalized_role === 'campaign_manager' ||
    operating.normalized_role === 'assistant_campaign_manager'
  if (isCm && tr?.top_tradeoff_headline?.trim()) {
    const expl = [tr.top_tradeoff_headline, tr.preferred_primary_action].filter(Boolean).join(' — ').slice(0, 320)
    out = [
      ...out,
      {
        id: 'v34-tradeoff-hq',
        severity: 'medium',
        category: 'readiness',
        title: 'HQ tradeoff (heuristic)',
        explanation: expl,
        owner_hint: null,
        route_hint: '/coordinator',
        target_id: null,
        confidence: 1,
      },
    ].slice(0, 10)
  }

  return out
}

function mergeV34DeskHeadline(
  headline: string,
  surface: AgentJonesSurface,
  operating: AgentJonesOperatingContext,
  v34: AgentJonesV34Pack,
): string {
  if (!v33BrainScope(surface, operating)) return headline
  const mode = v34.campaign_phase?.campaign_mode
  if (mode !== 'gotv' && mode !== 'election_day' && mode !== 'early_vote') return headline
  const frag = v34.campaign_phase?.mode_headline?.trim()
  if (!frag) return headline
  const short = frag.length > 80 ? `${frag.slice(0, 77)}…` : frag
  if (headline.includes(short.slice(0, Math.min(20, short.length)))) return headline
  return `${headline} Phase: ${short}`
}

function mergeV34NavigationHints(
  hints: AgentJonesNavigationHint[],
  input: {
    pathname: string
    surface: AgentJonesSurface
    operating: AgentJonesOperatingContext
    v34: AgentJonesV34Pack
  },
): AgentJonesNavigationHint[] {
  if (!v33BrainScope(input.surface, input.operating)) return hints
  if (!input.v34 || Object.keys(input.v34).length === 0) return hints

  const keyOf = (h: AgentJonesNavigationHint) =>
    `${h.kind}|${h.route ?? ''}|${h.target_id ?? ''}`

  const p = input.pathname.split('?')[0] ?? '/'
  const mode = input.v34.campaign_phase?.campaign_mode
  const cw = input.v34.countdown_summary?.countdown_window
  const late =
    mode === 'gotv' ||
    mode === 'election_day' ||
    cw === 'same_day' ||
    cw === '24h' ||
    cw === '48h' ||
    cw === '96h'

  const firstHints: AgentJonesNavigationHint[] = []

  if (input.operating.exception_summary.pending_review) {
    if (input.surface === 'admin_desk' || p.startsWith('/admin')) {
      firstHints.push({
        kind: 'scroll',
        label: 'Exceptions (governance first)',
        route: null,
        target_id: 'admin-exceptions',
        reason: (
          input.v34.desk_routing?.route_headline ??
          'Clear roster exceptions before expanding execution.'
        ).slice(0, 120),
        priority: 1,
      })
    }
  }

  const cmRole =
    input.operating.normalized_role === 'campaign_manager' ||
    input.operating.normalized_role === 'assistant_campaign_manager'
  if (
    cmRole &&
    input.v34.tradeoff_summary?.preferred_primary_action?.trim() &&
    input.surface !== 'coordinator_desk' &&
    !p.startsWith('/coordinator')
  ) {
    firstHints.push({
      kind: 'navigate',
      label: 'Coordinator board (execution truth)',
      route: '/coordinator',
      target_id: null,
      reason: input.v34.tradeoff_summary.preferred_primary_action.trim().slice(0, 120),
      priority: 1,
    })
  }

  if (late && (input.surface === 'coordinator_desk' || p.startsWith('/coordinator'))) {
    const reason = (
      input.v34.countdown_summary?.countdown_pressure_headline ??
      input.v34.campaign_phase?.mode_headline ??
      'Late-window pressure — stay on supervised boards only.'
    ).slice(0, 120)
    firstHints.push({
      kind: 'scroll',
      label: 'Execution / GOTV window',
      route: null,
      target_id: 'coordinator-mission-ops',
      reason,
      priority: 1,
    })
  }

  if (
    mode === 'early_vote' &&
    (input.surface === 'candidate_desk' || p.startsWith('/candidate'))
  ) {
    firstHints.push({
      kind: 'scroll',
      label: 'Campaign health (early vote)',
      route: null,
      target_id: 'candidate-health-snapshot',
      reason: 'Early-vote phase — align principals with the visible KPI strip first.',
      priority: 1,
    })
  }

  const out = [...firstHints, ...hints]
  const dedup: AgentJonesNavigationHint[] = []
  const seen = new Set<string>()
  for (const h of out) {
    const k = keyOf(h)
    if (seen.has(k) || dedup.length >= 3) continue
    seen.add(k)
    dedup.push({ ...h, priority: (dedup.length + 1) as 1 | 2 | 3 })
  }
  return dedup.slice(0, 3)
}

export function buildAgentJonesV3Brain(input: {
  pathname: string
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  /** When set, merges field/geo/coverage intelligence into cards and desk headline. */
  v32?: AgentJonesV32BrainSlice | null
  /** v3.3 commander layer — priority cards, headline tail, navigation when command-scoped. */
  v33?: AgentJonesV33Pack | null
  /** v3.4 phase / countdown / GOTV — navigation and headline bias when command-scoped. */
  v34?: AgentJonesV34Pack | null
}): AgentJonesV3Brain {
  let baseSignals = buildAgentJonesPrioritySignals(input.operating)
  if (input.v32) {
    baseSignals = mergeV32PrioritySignals(baseSignals, input.surface, input.v32)
  }
  let merged33 = baseSignals
  if (input.v33 && Object.keys(input.v33).length > 0) {
    merged33 = mergeV33PrioritySignals(baseSignals, input.operating, input.surface, input.v33)
  }
  const priority_signals =
    input.v34 && Object.keys(input.v34).length > 0
      ? mergeV34PrioritySignals(merged33, input.operating, input.surface, input.v34)
      : merged33

  let desk_summary = buildAgentJonesDeskSummary(input.surface, input.operating)
  if (input.v32) {
    desk_summary = {
      ...desk_summary,
      headline: mergeV32DeskHeadline(desk_summary.headline, input.surface, input.v32),
    }
  }
  if (input.v33 && Object.keys(input.v33).length > 0) {
    desk_summary = {
      ...desk_summary,
      headline: mergeV33DeskHeadline(desk_summary.headline, input.surface, input.operating, input.v33),
    }
  }
  if (input.v34 && Object.keys(input.v34).length > 0) {
    desk_summary = {
      ...desk_summary,
      headline: mergeV34DeskHeadline(desk_summary.headline, input.surface, input.operating, input.v34),
    }
  }

  let navigation_hints = buildAgentJonesNavigationHints(input)
  if (input.v33 && Object.keys(input.v33).length > 0) {
    navigation_hints = mergeV33NavigationHints(navigation_hints, {
      pathname: input.pathname,
      surface: input.surface,
      operating: input.operating,
      v33: input.v33,
    })
  }
  if (input.v34 && Object.keys(input.v34).length > 0) {
    navigation_hints = mergeV34NavigationHints(navigation_hints, {
      pathname: input.pathname,
      surface: input.surface,
      operating: input.operating,
      v34: input.v34,
    })
  }

  return {
    priority_signals,
    desk_summary,
    navigation_hints,
  }
}
