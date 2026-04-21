import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CampaignKpiRow } from '../kpiEngine'
import type {
  CampaignOperatingPicture,
  CampaignOperatingScope,
  CopMetricSnapshot,
  CopOpportunityItem,
  CopOrchestrationHints,
} from './copTypes'
import { COP_METRIC_LABELS } from './copMetricCatalog'
import { extractSignalsFromLeadershipSnapshot, buildFeatureVector } from './copFeatureExtraction'
import { buildRisksFromSnapshot } from './copRiskScoring'
import { buildActionQueue } from './copActionEngine'
import { buildSourceHealth, buildFreshness } from './copQualityChecks'
import { mapLeadershipTrend } from './copTrendService'
import { COP_ROUTES } from './copRouting'

export type BuildCampaignOperatingPictureInput = {
  snapshot: LeadershipBriefingSnapshot
  scope: CampaignOperatingScope
  /** When staffing hook loaded assignment map */
  assignmentMapLoaded?: boolean
  /** Optional KPI rows from `useCampaignKpis` — additive context only */
  kpiRows?: CampaignKpiRow[] | null
}

function statusFromPressure(
  pressure01: number,
): CopMetricSnapshot['status'] {
  if (pressure01 < 0.35) return 'healthy'
  if (pressure01 < 0.65) return 'warning'
  return 'critical'
}

function metricBase(
  key: string,
  current: number | null,
  status: CopMetricSnapshot['status'],
  trend: CopMetricSnapshot['trend'],
  reason: string,
  provenance: string,
): CopMetricSnapshot {
  return {
    key,
    label: COP_METRIC_LABELS[key] ?? key,
    currentValue: current,
    targetValue: null,
    status,
    trend,
    delta: null,
    confidence: 0.7,
    provenance,
    lastUpdatedAt: new Date().toISOString(),
    reason,
    nextActionRefs: [],
  }
}

function synthesizeMetrics(
  snap: LeadershipBriefingSnapshot,
  kpiRows: CampaignKpiRow[] | undefined,
): CopMetricSnapshot[] {
  const c = snap.counts
  const trend = mapLeadershipTrend(c.trend_vs_prior)
  const rawPressure = c.aggregate_pressure_score
  const pressure01 = Math.min(1, rawPressure / 80)
  const readiness = Math.max(
    5,
    Math.min(100, Math.round(100 - pressure01 * 72 + (trend === 'up' ? 8 : trend === 'down' ? -10 : 0))),
  )
  const pressureIdx = Math.max(0, Math.min(100, Math.round(pressure01 * 100)))
  const momentum = Math.max(
    5,
    Math.min(100, 52 + (trend === 'up' ? 18 : trend === 'down' ? -22 : 0)),
  )

  const metrics: CopMetricSnapshot[] = [
    metricBase(
      'upcoming_event_volume_7d',
      c.upcoming_7d,
      c.upcoming_7d > 18 ? 'warning' : 'healthy',
      trend,
      'Program events with start time within 7 days.',
      'leadershipBriefingService.counts',
    ),
    metricBase(
      'critical_events_understaffed',
      c.critical_risk_events,
      c.critical_risk_events > 0 ? 'critical' : 'healthy',
      trend,
      'War-room critical health band alignment.',
      'multiEventWarRoomService',
    ),
    metricBase(
      'approval_backlog_total',
      c.approval_pending,
      c.approval_pending > 8 ? 'warning' : 'healthy',
      trend,
      'Pending governance approvals.',
      'eventApprovalService',
    ),
    metricBase(
      'open_staffing_slots',
      c.staffing_incomplete_events,
      c.staffing_incomplete_events > 0 ? 'warning' : 'healthy',
      trend,
      'Events with staffing gaps (roster/assignment assisted when map loads).',
      'leadershipBriefingSelectors',
    ),
    metricBase(
      'overall_operational_readiness',
      readiness,
      statusFromPressure(1 - readiness / 100),
      trend,
      'Composite readiness from pressure + trend (deterministic).',
      'cop.scoring.v1',
    ),
    metricBase(
      'campaign_pressure_index',
      pressureIdx,
      statusFromPressure(pressure01),
      trend,
      'Scaled from aggregate stress score in leadership counts.',
      'leadershipBriefingService.stressScore',
    ),
    metricBase(
      'campaign_momentum_index',
      momentum,
      momentum < 40 ? 'warning' : 'healthy',
      trend,
      'Trend vs prior browser snapshot + heuristics.',
      'leadershipBriefingService.trend',
    ),
    metricBase(
      'data_freshness_score',
      snap.meta.summary_confidence === 'high' ? 88 : snap.meta.summary_confidence === 'medium' ? 70 : 52,
      snap.meta.summary_confidence === 'low' ? 'warning' : 'healthy',
      'insufficient_data',
      'Briefing meta confidence + source-health-derived score in copQualityChecks.',
      'copQualityChecks',
    ),
  ]

  if (kpiRows?.length) {
    let meanPct = 0
    let n = 0
    for (const r of kpiRows.slice(0, 12)) {
      const t = Number(r.target_value) || 1
      const cu = Number(r.current_value) || 0
      meanPct += Math.min(100, (100 * cu) / t)
      n += 1
    }
    if (n > 0) {
      meanPct /= n
      metrics.push(
        metricBase(
          'volunteer_fill_rate',
          Math.round(meanPct),
          meanPct < 45 ? 'critical' : meanPct < 65 ? 'warning' : 'healthy',
          trend,
          'Mean progress across active KPI rows (dashboard goals).',
          'kpiEngine',
        ),
      )
    }
  }

  return metrics
}

function buildOpportunities(snap: LeadershipBriefingSnapshot): CopOpportunityItem[] {
  const out: CopOpportunityItem[] = []
  if (snap.pulse.strongest_positive) {
    out.push({
      id: 'opp-strength',
      title: snap.pulse.strongest_positive,
      category: 'momentum',
      impact: 0.55,
      routeTarget: COP_ROUTES.leadership(),
      rationale: 'From leadership pulse (advisory).',
    })
  }
  for (let i = 0; i < snap.recommendations.length; i += 1) {
    const r = snap.recommendations[i]!
    out.push({
      id: `opp-rec-${String(i)}`,
      title: r.title,
      category: 'execution',
      impact: 0.5,
      routeTarget: COP_ROUTES.dashboard(),
      rationale: r.detail.slice(0, 200),
    })
  }
  return out.slice(0, 12)
}

function defaultOrchestration(): CopOrchestrationHints {
  return {
    actionExecutionEligibility: { default: 'manual_only' },
    approvalRequirement: { approvals: true },
    automationCandidate: {},
    executionWindow: null,
  }
}

export function buildCampaignOperatingPicture(
  input: BuildCampaignOperatingPictureInput,
): CampaignOperatingPicture {
  const { snapshot, scope, assignmentMapLoaded = true, kpiRows } = input
  const sigs = extractSignalsFromLeadershipSnapshot(snapshot)
  const fv = buildFeatureVector(sigs)
  const sourceHealth = buildSourceHealth(snapshot, assignmentMapLoaded)
  const freshness = buildFreshness(snapshot.generated_at_ms, sourceHealth)
  const metrics = synthesizeMetrics(snapshot, kpiRows ?? undefined)
  const risks = buildRisksFromSnapshot(snapshot)
  const opportunities = buildOpportunities(snapshot)
  const actionQueue = buildActionQueue(snapshot)
  const routeMap = Array.from(
    new Map(
      actionQueue.map((a) => [a.routeTarget.href, a.routeTarget] as const),
    ).values(),
  )

  const readiness =
    metrics.find((m) => m.key === 'overall_operational_readiness')?.currentValue ?? null
  const pressure =
    metrics.find((m) => m.key === 'campaign_pressure_index')?.currentValue ?? null
  const momentum =
    metrics.find((m) => m.key === 'campaign_momentum_index')?.currentValue ?? null

  const summary = {
    headline: snapshot.daily_digest_compact,
    subhead: snapshot.pulse.overall_line,
    overallOperationalReadiness: typeof readiness === 'number' ? readiness : 0,
    campaignPressureIndex: typeof pressure === 'number' ? pressure : 0,
    campaignMomentumIndex: typeof momentum === 'number' ? momentum : 0,
  }

  return {
    generatedAt: new Date(snapshot.generated_at_ms).toISOString(),
    scope,
    freshness,
    summary,
    metrics,
    risks,
    opportunities,
    actionQueue,
    routeMap,
    sourceHealth,
    featureVector: fv,
    orchestration: defaultOrchestration(),
  }
}
