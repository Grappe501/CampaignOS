/**
 * Resource allocation recommendations — strategy-first, deterministic (no auto-spend).
 */

import type { GotvTurnoutPhase } from './gotvDomain'
import type { BudgetCategory } from './financeDomain'

export type AllocationEngineInput = {
  phase: GotvTurnoutPhase
  /** County labels under geographic pressure (from event/geo command). */
  pressure_counties: string[]
  /** Remaining budget by category (planned − spent, same currency). */
  headroom_by_category: Partial<Record<BudgetCategory, number>>
  /** Simple 0–100 scores for where turnout risk is concentrated (county → score). */
  turnout_risk_by_county: Record<string, number>
}

export type AllocationRecommendation = {
  id: string
  category: BudgetCategory
  county_hint: string | null
  severity: 'high' | 'medium' | 'low'
  action_line: string
  rationale: string
}

const PHASE_MEDIA_WEIGHT: Partial<Record<GotvTurnoutPhase, number>> = {
  pre_early_vote_ramp: 0.35,
  early_vote_launch: 0.25,
  early_vote_sustain: 0.2,
  pre_election_96h: 0.15,
  pre_election_48h: 0.1,
  election_day: 0.05,
  post_close_wrap: 0,
  post_election_review: 0,
}

function headroom(headroom: Partial<Record<BudgetCategory, number>>, cat: BudgetCategory): number {
  return Math.max(0, Number(headroom[cat] ?? 0))
}

/** Produce ordered recommendations; leadership still approves real transfers. */
export function recommendResourceAllocations(input: AllocationEngineInput): AllocationRecommendation[] {
  const out: AllocationRecommendation[] = []
  const mediaW = PHASE_MEDIA_WEIGHT[input.phase] ?? 0.2
  const topCounty =
    Object.entries(input.turnout_risk_by_county).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const geo = input.pressure_counties[0] ?? topCounty

  if (headroom(input.headroom_by_category, 'gotv') > 0 && ['early_vote_launch', 'early_vote_sustain', 'pre_election_48h', 'election_day'].includes(input.phase)) {
    out.push({
      id: 'alloc_gotv_surge',
      category: 'gotv',
      county_hint: geo,
      severity: 'high',
      action_line: 'Shift envelope toward GOTV infrastructure and chase coverage.',
      rationale: `Turnout phase ${input.phase} — protect cost-per-contact efficiency in high-velocity windows.`,
    })
  }

  if (headroom(input.headroom_by_category, 'field_ops') > 0 && input.pressure_counties.length) {
    out.push({
      id: 'alloc_field_geo',
      category: 'field_ops',
      county_hint: geo,
      severity: 'medium',
      action_line: 'Fund field surge in pressure counties before media substitutes for contact.',
      rationale: `Geographic pressure signals: ${input.pressure_counties.slice(0, 3).join(', ') || 'program-wide'}.`,
    })
  }

  if (headroom(input.headroom_by_category, 'media') > 0 && mediaW >= 0.25) {
    out.push({
      id: 'alloc_media_window',
      category: 'media',
      county_hint: null,
      severity: 'medium',
      action_line: 'Timed media to amplify field — avoid media-only weeks without contact goals.',
      rationale: `Phase weight for paid media ~${Math.round(mediaW * 100)}% — pair with measurable contact targets.`,
    })
  }

  if (headroom(input.headroom_by_category, 'reserve') > 0 && out.length === 0) {
    out.push({
      id: 'alloc_reserve_hold',
      category: 'reserve',
      county_hint: null,
      severity: 'low',
      action_line: 'Hold reserve; refresh ROI snapshot after next finance close.',
      rationale: 'No acute phase pressure in inputs — preserve flexibility for late breaks.',
    })
  }

  return out.slice(0, 6)
}
