import type {
  AgentJonesCampaignPhaseSummary,
  AgentJonesCoverageSummary,
  AgentJonesEventDeploymentSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGotvSummary,
} from './agentJonesContextV2'
import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'
import type { AgentJonesAreaScore } from './agentJonesContextV2'

export function buildAgentJonesGotvSummary(input: {
  phase: AgentJonesCampaignPhaseSummary | null
  area_ranking: AgentJonesAreaScore[] | undefined | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  eventDeployment: AgentJonesEventDeploymentSummary | undefined | null
}): AgentJonesGotvSummary | null {
  const mode = input.phase?.campaign_mode
  const gotv_mode_active = mode === 'gotv' || mode === 'election_day'
  const earlyVote = mode === 'early_vote'
  if (!gotv_mode_active && !earlyVote) return null

  const ranked = input.area_ranking?.length ? sortAgentJonesAreaRanking(input.area_ranking) : []
  const highest_pressure_area_labels = ranked
    .filter((r) => r.priority_band === 'critical' || r.priority_band === 'high')
    .map((r) => r.area_label)
    .slice(0, 4)

  const w = input.field?.weakest_area_label
    ?.replace(/\s*\(visible session[^)]*\)\s*$/i, '')
    .trim()
  const staffing =
    input.coverage?.volunteer_shortage_area_labels?.slice(0, 3) ??
    (w ? [w] : [])

  const actions: string[] = []
  if (gotv_mode_active || mode === 'early_vote') {
    actions.push('Confirm poll-greeter and shift rosters on coordinator-visible boards — do not invent poll coverage.')
    actions.push('Run a captain huddle focused on not-yet-started supervised rows and tomorrow’s deadlines.')
  }
  if ((input.eventDeployment?.staffing_pressure_count ?? 0) > 0) {
    actions.push('Prioritize the flagged deployment / event staffing lane before net-new turf asks.')
  }
  if (input.field?.high_pressure_area_count != null && input.field.high_pressure_area_count > 0) {
    actions.push(
      `Address ${input.field.high_pressure_area_count} high-pressure field signal bucket(s) visible in this session.`,
    )
  }

  const volunteer_deployment_headline =
    (input.coverage?.event_staffing_pressure_count ?? 0) > 0
      ? `Assignment staffing pressure (visible): ${input.coverage?.event_staffing_pressure_count} — redeploy before recruiting cold.`
      : input.field?.coordinator_pressure_count != null && input.field.coordinator_pressure_count > 0
        ? `Supervised board pressure (blocked/overdue proxy): ${input.field.coordinator_pressure_count} — sequence GOTV around that truth.`
        : gotv_mode_active
          ? 'GOTV mode (heuristic): assume lean capacity — protect highest-leverage shifts and reminders.'
          : null

  const turnout_risk_headline =
    highest_pressure_area_labels.length || w
      ? `Turnout vulnerability proxies (session): ${[...highest_pressure_area_labels, ...(w && !highest_pressure_area_labels.includes(w) ? [w] : [])].slice(0, 3).join(' · ') || 'see area ranking'}.`
      : null

  if (
    !volunteer_deployment_headline &&
    !turnout_risk_headline &&
    !actions.length &&
    !staffing.length
  ) {
    return null
  }

  return {
    gotv_mode_active,
    ...(highest_pressure_area_labels.length ? { highest_pressure_area_labels } : {}),
    volunteer_deployment_headline,
    ...(staffing.length ? { staffing_gap_labels: staffing } : {}),
    turnout_risk_headline,
    ...(actions.length ? { best_next_gotv_actions: actions.slice(0, 4) } : {}),
  }
}
