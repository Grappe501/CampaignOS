import type { CampaignOperatingPicture } from './copTypes'

/** Bounded AI-facing summary — deterministic fields only; Agent Jones may elaborate, not replace. */
export type CopAgentSummary = {
  source: 'campaign_operating_picture_v1'
  scopeLabel: string
  generatedAtMs: number
  readinessScore: number
  pressureIndex: number
  momentumIndex: number
  criticalRisks: Array<{ title: string; severity: string; why: string }>
  topActions: Array<{ title: string; whyNow: string; href: string }>
  operationalNarrative: string
}

export function buildCopAgentSummary(pic: CampaignOperatingPicture): CopAgentSummary {
  const criticalRisks = pic.risks.slice(0, 8).map((r) => ({
    title: r.title,
    severity: r.severity,
    why: r.evidence,
  }))
  const topActions = pic.actionQueue.slice(0, 8).map((a) => ({
    title: a.title,
    whyNow: a.whyNow,
    href: a.routeTarget.href,
  }))
  const narrative = [
    pic.summary.headline,
    `Readiness ${String(pic.summary.overallOperationalReadiness)} · Pressure ${String(pic.summary.campaignPressureIndex)} · Momentum ${String(pic.summary.campaignMomentumIndex)}.`,
    pic.freshness.notes.join(' '),
  ]
    .join('\n')
    .slice(0, 3500)

  return {
    source: 'campaign_operating_picture_v1',
    scopeLabel: pic.scope.label,
    generatedAtMs: new Date(pic.generatedAt).getTime(),
    readinessScore: pic.summary.overallOperationalReadiness,
    pressureIndex: pic.summary.campaignPressureIndex,
    momentumIndex: pic.summary.campaignMomentumIndex,
    criticalRisks,
    topActions,
    operationalNarrative: narrative,
  }
}
