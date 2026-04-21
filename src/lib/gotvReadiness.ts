/**
 * Explainable site readiness scoring (0–100) for turnout command.
 */

import type {
  GotvIncidentRow,
  GotvPollingPlaceRow,
  GotvReadinessBand,
  GotvSiteAssignmentRow,
  GotvSiteShiftRow,
} from './gotvDomain'
import { phaseExpectsHigherCoverage, type GotvTurnoutPhase } from './gotvCountdownEngine'

export type GotvSiteReadiness = {
  site_id: string
  score_0_100: number
  band: GotvReadinessBand
  primary_reasons: string[]
  coverage_pct: number
  slots_needed: number
  slots_filled: number
  captain_assigned: boolean
  open_incidents: number
  next_intervention_hint: string | null
}

function bandFromScore(score: number): GotvReadinessBand {
  if (score >= 85) return 'green'
  if (score >= 65) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}

function isCaptainRole(roleSlug: string): boolean {
  const r = roleSlug.toLowerCase()
  return r.includes('captain') || r === 'lead' || r.includes('site_lead')
}

function countsTowardFill(a: GotvSiteAssignmentRow): boolean {
  return ['invited', 'confirmed', 'checked_in'].includes(a.assignment_status)
}

export function computeGotvSiteReadiness(input: {
  site: GotvPollingPlaceRow
  shifts: readonly GotvSiteShiftRow[]
  assignmentsByShiftId: ReadonlyMap<string, GotvSiteAssignmentRow[]>
  openIncidents: readonly GotvIncidentRow[]
  phase: GotvTurnoutPhase
  phaseUrgency: number
}): GotvSiteReadiness {
  const { site, shifts, assignmentsByShiftId, openIncidents, phase, phaseUrgency } = input
  const activeShifts = shifts.filter((s) => s.status !== 'canceled')
  let slots_needed = 0
  let slots_filled = 0
  let captain_assigned = false

  for (const sh of activeShifts) {
    const need = Math.max(0, sh.slots_needed)
    slots_needed += need
    const assigns = assignmentsByShiftId.get(sh.id) ?? []
    const filled = assigns.filter(countsTowardFill).length
    slots_filled += Math.min(need, filled)
    if (isCaptainRole(sh.role_slug) && assigns.some((a) => countsTowardFill(a) && a.assignment_status !== 'invited')) {
      captain_assigned = true
    }
    if (isCaptainRole(sh.role_slug) && assigns.some((a) => a.assignment_status === 'confirmed' || a.assignment_status === 'checked_in')) {
      captain_assigned = true
    }
  }

  const coverage_pct = slots_needed > 0 ? Math.round((100 * slots_filled) / slots_needed) : 100
  const reasons: string[] = []
  let score = 100

  if (slots_needed === 0) {
    reasons.push('No shift requirements defined — add slots to track coverage.')
    score -= 15
  } else if (coverage_pct < 100) {
    reasons.push(`Coverage ${coverage_pct}% vs required slots (${slots_filled}/${slots_needed}).`)
    score -= Math.min(45, Math.round((100 - coverage_pct) * 0.45))
  }

  const needsCaptain = activeShifts.some((s) => isCaptainRole(s.role_slug))
  if (needsCaptain && !captain_assigned) {
    reasons.push('Captain / site lead not confirmed.')
    score -= 22
  }

  const inc = openIncidents.filter((i) => i.site_id === site.id && i.status !== 'resolved')
  if (inc.length) {
    reasons.push(`${inc.length} open incident(s) at this site.`)
    score -= Math.min(30, inc.length * 10)
  }

  const unconfirmedRisk = computeUnconfirmedRatio(assignmentsByShiftId, activeShifts)
  if (unconfirmedRisk > 0.35 && phaseExpectsHigherCoverage(phase)) {
    reasons.push('High share of invited-but-not-confirmed assignments near peak phase.')
    score -= 12
  }

  score = Math.round(score * phaseUrgency)
  score = Math.max(0, Math.min(100, score))

  const importance = site.importance ?? 50
  if (importance >= 80 && bandFromScore(score) === 'red') {
    reasons.push('High-importance geography — red band is strategic risk.')
  }

  const band = bandFromScore(score)
  const primary_reasons = reasons.slice(0, 4)

  let next_intervention_hint: string | null = null
  if (band === 'red' || band === 'orange') {
    next_intervention_hint = needsCaptain && !captain_assigned ? 'Assign captain' : 'Fill site now'
  } else if (coverage_pct < 90) {
    next_intervention_hint = 'Confirm coverage'
  }

  return {
    site_id: site.id,
    score_0_100: score,
    band,
    primary_reasons,
    coverage_pct,
    slots_needed,
    slots_filled,
    captain_assigned,
    open_incidents: inc.length,
    next_intervention_hint,
  }
}

function computeUnconfirmedRatio(
  assignmentsByShiftId: ReadonlyMap<string, GotvSiteAssignmentRow[]>,
  shifts: readonly GotvSiteShiftRow[],
): number {
  let invited = 0
  let confirmed = 0
  for (const sh of shifts) {
    for (const a of assignmentsByShiftId.get(sh.id) ?? []) {
      if (a.assignment_status === 'invited') invited++
      if (a.assignment_status === 'confirmed' || a.assignment_status === 'checked_in') confirmed++
    }
  }
  const denom = invited + confirmed
  return denom > 0 ? invited / denom : 0
}
