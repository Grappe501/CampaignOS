/**
 * Campaign Operating Picture — canonical operational model (deterministic; client-built).
 */

export type CampaignOperatingScopeKind =
  | 'campaign_global'
  | 'district'
  | 'county'
  | 'city'
  | 'turf'
  | 'event'
  | 'role_desk'
  | 'volunteer_operations'
  | 'leadership'
  | 'war_room'

export type CampaignOperatingScope = {
  kind: CampaignOperatingScopeKind
  label: string
  /** When scoped to entity geography or event */
  entityId?: string
  districtId?: string
  countyId?: string
  city?: string
  /** ISO date range for windowed scopes */
  windowStart?: string
  windowEnd?: string
}

export type CopFreshness = {
  generatedAtMs: number
  /** 0–100 — penalize stale browser prior, sparse events, missing staffing map */
  dataFreshnessScore: number
  /** Human-readable */
  notes: string[]
}

export type CopMetricStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export type CopTrendKind =
  | 'up'
  | 'down'
  | 'flat'
  | 'volatile'
  | 'insufficient_data'

export type CopMetricSnapshot = {
  key: string
  label: string
  currentValue: number | null
  targetValue?: number | null
  status: CopMetricStatus
  trend: CopTrendKind
  delta: number | null
  confidence: number
  provenance: string
  lastUpdatedAt: string | null
  reason: string
  nextActionRefs: string[]
}

export type CopRiskSeverity = 'low' | 'medium' | 'high' | 'critical'

export type CopRiskItem = {
  id: string
  severity: CopRiskSeverity
  category: string
  title: string
  probability: number
  impact: number
  urgency: number
  scopeLabel: string
  evidence: string
  suggestedActions: string[]
  routeTarget: CopRouteTarget
}

export type CopOpportunityItem = {
  id: string
  title: string
  category: string
  impact: number
  routeTarget: CopRouteTarget
  rationale: string
}

export type CopActionCategory =
  | 'staffing'
  | 'approvals'
  | 'event_preparation'
  | 'event_closeout'
  | 'volunteer_activation'
  | 'leadership_attention'
  | 'data_repair'
  | 'route_followup'

export type CopActionCandidate = {
  id: string
  title: string
  category: CopActionCategory
  priorityScore: number
  urgencyScore: number
  impactScore: number
  confidence: number
  whyNow: string
  blockers: string[]
  requiresApproval: boolean
  sourceMetricKeys: string[]
  routeTarget: CopRouteTarget
  payload?: Record<string, string | number | boolean | null>
}

export type CopRouteTarget = {
  href: string
  label: string
  sectionKey?: string
  entityId?: string
  fallbackHref: string
}

export type CopSourceHealth = {
  source: string
  responded: boolean
  stale: boolean
  incomplete: boolean
  confidenceHint: number
  note: string | null
}

export type CopFeatureVector = {
  /** Normalized 0–1 features used for scoring transparency */
  eventCriticalShare: number
  approvalPressure: number
  staffingGapPressure: number
  commsRiskPressure: number
  followupBacklogPressure: number
  trendDeltaSigned: number
}

/** Future automation seams (placeholders; not executed) */
export type CopOrchestrationHints = {
  actionExecutionEligibility: Record<string, 'eligible' | 'manual_only' | 'blocked'>
  approvalRequirement: Record<string, boolean>
  automationCandidate: Record<string, boolean>
  executionWindow: string | null
}

export type CampaignOperatingSummary = {
  headline: string
  subhead: string
  overallOperationalReadiness: number
  campaignPressureIndex: number
  campaignMomentumIndex: number
}

export type CampaignOperatingPicture = {
  generatedAt: string
  scope: CampaignOperatingScope
  freshness: CopFreshness
  summary: CampaignOperatingSummary
  metrics: CopMetricSnapshot[]
  risks: CopRiskItem[]
  opportunities: CopOpportunityItem[]
  actionQueue: CopActionCandidate[]
  routeMap: CopRouteTarget[]
  sourceHealth: CopSourceHealth[]
  featureVector: CopFeatureVector
  orchestration: CopOrchestrationHints
}
