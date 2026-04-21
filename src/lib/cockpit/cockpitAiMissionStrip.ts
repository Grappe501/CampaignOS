/**
 * Mission strip + Agent Jones digest — grounded in leadership briefing + consequence engine.
 */

import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { AgentJonesCockpitMissionDigest } from '../agentJonesContextV2'
import type { CockpitConsequence } from './cockpitConsequenceEngine'
import type { CockpitCompareTemplateId } from './cockpitCompareTemplates'
import type { CenterLayoutMode, CockpitModuleId } from './cockpitWorkspaceSchemas'
import { mergeAffectedModules } from './cockpitConsequenceEngine'

export type CockpitMissionStripExtras = {
  stripMode: AgentJonesCockpitMissionDigest['strip_mode']
  strainLine: string | null
  crossSystemLine: string
  topConsequences: string[]
  recommendedCenterLabel: string
  recommendedCompareId: CockpitCompareTemplateId | null
}

export function inferCockpitStripMode(
  snapshot: LeadershipBriefingSnapshot,
): AgentJonesCockpitMissionDigest['strip_mode'] {
  const c = snapshot.counts
  const st = snapshot.pulse.overall_operational_status
  if (st === 'concern' && (c.critical_risk_events >= 3 || c.approval_pending >= 8)) return 'crisis'
  if (c.staffing_incomplete_events >= 8 || snapshot.pulse.staffing_strain_headline) return 'staffing_strain'
  if (snapshot.emphasis === 'candidate' && c.upcoming_7d >= 5) return 'candidate_heavy'
  if (c.live_now >= 5 || c.upcoming_7d >= 14 || c.communications_risk_events >= 4) return 'high_volume'
  if (c.aggregate_pressure_score >= 58 && st === 'concern') return 'fundraising'
  return 'calm'
}

export function pickRecommendedCenterModule(
  snapshot: LeadershipBriefingSnapshot,
  consequences: CockpitConsequence[],
): CockpitModuleId {
  const top = consequences[0]
  if (top?.id === 'appr_backlog' || top?.id === 'appr_gate') return 'approvals_leadership'
  if (top?.id === 'war_critical' || top?.id === 'live_density') return 'war_room'
  if (top?.id === 'staffing_strain' || top?.id === 'staffing_watch') return 'volunteer_command'
  if (top?.id === 'comms_risk_cluster') return 'communications_press'
  const c = snapshot.counts
  if (c.approval_pending >= 2) return 'approvals_leadership'
  if (c.critical_risk_events >= 1) return 'war_room'
  return 'leadership_briefing'
}

export function pickRecommendedCompareTemplate(
  snapshot: LeadershipBriefingSnapshot,
  consequences: CockpitConsequence[],
): CockpitCompareTemplateId | null {
  const ids = new Set(consequences.map((x) => x.id))
  if (ids.has('appr_backlog') || ids.has('appr_gate')) return 'warroom_approvals'
  if (ids.has('war_critical') || ids.has('live_density')) return 'event_staffing_rescue'
  if (ids.has('staffing_strain') || ids.has('staffing_watch'))
    return 'volunteer_event_load'
  if (ids.has('comms_risk_cluster')) return 'event_comms_prep'
  if (
    consequences.length === 0 &&
    snapshot.counts.upcoming_7d >= 14 &&
    snapshot.counts.critical_risk_events === 0
  ) {
    return 'calendar_candidate_conflicts'
  }
  return null
}

export function buildCockpitMissionDigest(
  snapshot: LeadershipBriefingSnapshot,
  consequences: CockpitConsequence[],
  layout: {
    centerPrimary: CockpitModuleId
    centerSecondary: CockpitModuleId | null
    centerMode: CenterLayoutMode
  },
): AgentJonesCockpitMissionDigest {
  const strip_mode = inferCockpitStripMode(snapshot)
  const top_consequences = consequences.slice(0, 3).map((z) => z.impact_summary.slice(0, 280))
  const recommended_center_module_id = pickRecommendedCenterModule(snapshot, consequences)
  const recommended_compare_template_id = pickRecommendedCompareTemplate(snapshot, consequences)
  const strain_headline =
    snapshot.pulse.staffing_strain_headline ??
    snapshot.pulse.top_strategic_concern ??
    (consequences[0]?.impact_summary.slice(0, 200) ?? null)
  const pressure = snapshot.counts
  const fluxMods = mergeAffectedModules(consequences)
  const cross_system_pressure_line = fluxMods.length
    ? `Pressure index ${String(pressure.aggregate_pressure_score)} · cross-module: ${fluxMods.slice(0, 6).join(', ')}`
    : `Pressure index ${String(pressure.aggregate_pressure_score)} · tempo ${strip_mode}`
  const active_layout_hint = `${layout.centerMode}: ${layout.centerPrimary}${layout.centerSecondary ? ` + ${layout.centerSecondary}` : ''}`

  return {
    strip_mode,
    top_consequences,
    recommended_center_module_id,
    recommended_compare_template_id,
    strain_headline: strain_headline ? strain_headline.slice(0, 400) : null,
    cross_system_pressure_line: cross_system_pressure_line.slice(0, 400),
    active_layout_hint: active_layout_hint.slice(0, 200),
  }
}

export function buildMissionStripExtras(
  digest: AgentJonesCockpitMissionDigest,
  recommendedModuleTitle: string,
): CockpitMissionStripExtras {
  return {
    stripMode: digest.strip_mode,
    strainLine: digest.strain_headline,
    crossSystemLine: digest.cross_system_pressure_line,
    topConsequences: digest.top_consequences.slice(0, 2),
    recommendedCenterLabel: recommendedModuleTitle,
    recommendedCompareId: digest.recommended_compare_template_id,
  }
}
