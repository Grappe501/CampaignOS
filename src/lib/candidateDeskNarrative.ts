import type { CountdownUrgency } from './campaignClock'
import type { CampaignKpiRow } from './kpiEngine'

export type StrategicPhase = {
  title: string
  summary: string
  operationalEmphasis: readonly string[]
}

const PHASE_COPY: Record<CountdownUrgency, StrategicPhase> = {
  default: {
    title: 'Foundation & field build',
    summary:
      'Calendar distance favors disciplined infrastructure: volunteer depth, recurring contact programs, and clear accountability chains before paid media and turnout dominate.',
    operationalEmphasis: [
      'Invest in coordinator and intern capacity — they translate strategy into weekly outcomes.',
      'Keep KPI definitions stable so teams do not optimize to moving goalposts.',
    ],
  },
  d90: {
    title: 'Acceleration window',
    summary:
      'Roughly ninety days out, persuasion and organization should compound: fewer experiments, more repeatable voter touch patterns.',
    operationalEmphasis: [
      'Align public schedule with field reality so volunteers are not surprised.',
      'Review weakest KPI lanes with coordinators and reallocate time, not just rhetoric.',
    ],
  },
  d30: {
    title: 'Persuasion & turnout prep',
    summary:
      'Final month shifts emphasis to identified supporters, ballot readiness, and clearing blockers for GOTV.',
    operationalEmphasis: [
      'Escalate roster and data issues immediately — there is little time to re-run fixes.',
      'Protect principal time for high-leverage events and donor confidence.',
    ],
  },
  d7: {
    title: 'Turnout execution',
    summary:
      'The organization should be in execution mode: chase ballots, confirm plans, and remove friction for volunteers at the doors and on the phones.',
    operationalEmphasis: [
      'Daily standups between HQ and coordinators beat new initiatives.',
      'Message discipline matters — one clear closing argument.',
    ],
  },
  h72: {
    title: 'Final push',
    summary:
      'Inside the last few days, every hour is about turnout and visibility — not net-new strategy.',
    operationalEmphasis: [
      'Surge support to intern and volunteer queues; resolve blockers in real time.',
      'Keep energy sustainable — sleep and clarity at the top help everyone else.',
    ],
  },
  closed: {
    title: 'Polls closed',
    summary:
      'Election administration and thank-you work continue; preserve data and relationships for whatever comes next.',
    operationalEmphasis: [
      'Document lessons learned while memory is fresh.',
      'Honor volunteers publicly — they carried the load.',
    ],
  },
}

export function getStrategicPhase(urgency: CountdownUrgency): StrategicPhase {
  return PHASE_COPY[urgency] ?? PHASE_COPY.default
}

/** KPI furthest behind target (by % of goal) among the provided rows — no invented totals. */
export function pickWeakestActiveKpi(kpis: CampaignKpiRow[]): {
  row: CampaignKpiRow
  pctOfTarget: number
} | null {
  if (!kpis.length) return null
  let worst: CampaignKpiRow | null = null
  let worstPct = Infinity
  for (const k of kpis) {
    const t = Number(k.target_value)
    const c = Number(k.current_value)
    if (!Number.isFinite(t) || t <= 0) continue
    const pct = (100 * (Number.isFinite(c) ? c : 0)) / t
    if (pct < worstPct) {
      worstPct = pct
      worst = k
    }
  }
  return worst ? { row: worst, pctOfTarget: Math.min(100, Math.round(worstPct * 10) / 10) } : null
}

/** KPI closest to or above target (by % of goal) among the provided rows — capped at 100% for display parity with weakest. */
export function pickStrongestActiveKpi(kpis: CampaignKpiRow[]): {
  row: CampaignKpiRow
  pctOfTarget: number
} | null {
  if (!kpis.length) return null
  let best: CampaignKpiRow | null = null
  let bestPct = -Infinity
  for (const k of kpis) {
    const t = Number(k.target_value)
    const c = Number(k.current_value)
    if (!Number.isFinite(t) || t <= 0) continue
    const pct = (100 * (Number.isFinite(c) ? c : 0)) / t
    if (pct > bestPct) {
      bestPct = pct
      best = k
    }
  }
  return best ? { row: best, pctOfTarget: Math.min(100, Math.round(bestPct * 10) / 10) } : null
}
