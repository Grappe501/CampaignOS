import { buildAgentJonesDeskSummary } from './agentJonesDeskSummaries'
import { buildAgentJonesNavigationHints } from './agentJonesNavigationHints'
import { buildAgentJonesPrioritySignals } from './agentJonesPrioritySignals'
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

export function buildAgentJonesV3Brain(input: {
  pathname: string
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  /** When set, merges field/geo/coverage intelligence into cards and desk headline. */
  v32?: AgentJonesV32BrainSlice | null
}): AgentJonesV3Brain {
  const baseSignals = buildAgentJonesPrioritySignals(input.operating)
  const priority_signals = input.v32
    ? mergeV32PrioritySignals(baseSignals, input.surface, input.v32)
    : baseSignals

  let desk_summary = buildAgentJonesDeskSummary(input.surface, input.operating)
  if (input.v32) {
    desk_summary = {
      ...desk_summary,
      headline: mergeV32DeskHeadline(desk_summary.headline, input.surface, input.v32),
    }
  }

  return {
    priority_signals,
    desk_summary,
    navigation_hints: buildAgentJonesNavigationHints(input),
  }
}
