/**
 * Cross-module consequence summaries derived from leadership briefing snapshot (source of truth).
 * Advisory heuristics — not simulation.
 */

import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CockpitModuleId } from './cockpitWorkspaceSchemas'
import { expandRelatedModules } from './cockpitRelationshipGraph'

export type CockpitConsequenceSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type CockpitConsequence = {
  id: string
  severity: CockpitConsequenceSeverity
  impact_summary: string
  affected_modules: CockpitModuleId[]
  suggested_owner: 'governance' | 'operations' | 'field' | 'comms' | 'principal' | 'finance' | null
  time_sensitivity: 'now' | 'today' | 'this_week' | 'soon' | 'none'
}

function uniq(mods: CockpitModuleId[]): CockpitModuleId[] {
  return [...new Set(mods)]
}

const WAR_CRITICAL_GRAPH_SEEDS: CockpitModuleId[] = [
  'war_room',
  'event_operations',
  'volunteer_command',
  'communications_press',
]

export function buildCockpitConsequences(snapshot: LeadershipBriefingSnapshot): CockpitConsequence[] {
  const c = snapshot.counts
  const out: CockpitConsequence[] = []

  if (c.approval_pending >= 3) {
    out.push({
      id: 'appr_backlog',
      severity: c.approval_pending >= 8 ? 'critical' : 'high',
      impact_summary:
        'Approval backlog delays staffing confirmation, Mobilize promotion, and downstream volunteer assignments.',
      affected_modules: uniq(['approvals_leadership', 'event_operations', 'communications_press', 'volunteer_command']),
      suggested_owner: 'governance',
      time_sensitivity: 'today',
    })
  } else if (c.approval_pending >= 1) {
    out.push({
      id: 'appr_gate',
      severity: 'medium',
      impact_summary: 'Pending governance items can block activation of staffing and promotion workflows.',
      affected_modules: uniq(['approvals_leadership', 'event_operations']),
      suggested_owner: 'governance',
      time_sensitivity: 'this_week',
    })
  }

  if (c.critical_risk_events >= 1) {
    out.push({
      id: 'war_critical',
      severity: c.critical_risk_events >= 3 ? 'critical' : 'high',
      impact_summary:
        'Critical war-room health bands require cross-event sequencing — staffing, comms, and field intervention may compete for the same window.',
      affected_modules: expandRelatedModules(WAR_CRITICAL_GRAPH_SEEDS, 8),
      suggested_owner: 'operations',
      time_sensitivity: 'now',
    })
  }

  if (c.staffing_incomplete_events >= 6) {
    out.push({
      id: 'staffing_strain',
      severity: 'high',
      impact_summary:
        'Wide staffing gaps increase day-of failure risk and can force volunteer load-balancing across programs.',
      affected_modules: uniq(['volunteer_command', 'event_operations', 'war_room', 'field_operations']),
      suggested_owner: 'operations',
      time_sensitivity: 'today',
    })
  } else if (c.staffing_incomplete_events >= 3) {
    out.push({
      id: 'staffing_watch',
      severity: 'medium',
      impact_summary: 'Incomplete staffing signals coordination drag — calendar and sequencing may need alignment.',
      affected_modules: uniq(['volunteer_command', 'calendar', 'event_operations']),
      suggested_owner: 'operations',
      time_sensitivity: 'this_week',
    })
  }

  if (c.communications_risk_events >= 3) {
    out.push({
      id: 'comms_risk_cluster',
      severity: 'medium',
      impact_summary: 'Communications risk clusters can compress media timelines and interact with principal schedule.',
      affected_modules: uniq(['communications_press', 'candidate_schedule', 'event_operations']),
      suggested_owner: 'comms',
      time_sensitivity: 'soon',
    })
  }

  if (c.live_now >= 5) {
    out.push({
      id: 'live_density',
      severity: 'high',
      impact_summary: 'High concurrent live programs increase operational collision risk across field and volunteer channels.',
      affected_modules: uniq(['war_room', 'field_operations', 'volunteer_command']),
      suggested_owner: 'operations',
      time_sensitivity: 'now',
    })
  }

  if (c.postevent_closure_incomplete_digest >= 3 || c.postevent_followup_gaps >= 3) {
    out.push({
      id: 'afteraction_debt',
      severity: 'medium',
      impact_summary: 'After-action documentation debt reduces learning transfer into approvals and future staffing.',
      affected_modules: uniq(['event_operations', 'approvals_leadership', 'leadership_briefing']),
      suggested_owner: 'operations',
      time_sensitivity: 'this_week',
    })
  }

  const sorted = out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
  if (sorted.some((x) => x.id === 'appr_backlog')) {
    return sorted.filter((x) => x.id !== 'appr_gate')
  }
  return sorted
}

function severityRank(s: CockpitConsequenceSeverity): number {
  const o: Record<CockpitConsequenceSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  }
  return o[s]
}

export function mergeAffectedModules(consequences: CockpitConsequence[]): CockpitModuleId[] {
  const s = new Set<CockpitModuleId>()
  for (const z of consequences) {
    for (const m of z.affected_modules) s.add(m)
  }
  return [...s]
}
