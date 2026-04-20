import type {
  AgentJonesCampaignPhaseSummary,
  AgentJonesCommandFusionSummary,
  AgentJonesCoverageSummary,
  AgentJonesEventDeploymentSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesTradeoffSummary,
} from './agentJonesContextV2'
import type { AgentJonesSegmentationSummary } from './agentJonesContextV2'

export function buildAgentJonesTradeoffSummary(input: {
  phase: AgentJonesCampaignPhaseSummary | null
  segmentation: AgentJonesSegmentationSummary | undefined | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  eventDeployment: AgentJonesEventDeploymentSummary | undefined | null
  commandFusion: AgentJonesCommandFusionSummary | undefined | null
}): AgentJonesTradeoffSummary | null {
  const mode = input.phase?.campaign_mode
  const primary = input.segmentation?.primary_mode
  const rationale: string[] = []
  let top_tradeoff_headline: string | null = null
  let preferred_primary_action: string | null = null
  let deferred_secondary_action: string | null = null
  const staff = input.coverage?.event_staffing_pressure_count ?? 0
  const weakField = Boolean(input.field?.weakest_area_label?.trim())

  if (mode === 'gotv' || mode === 'election_day') {
    top_tradeoff_headline =
      'Tradeoff (late phase): turnout mobilization and shift coverage beat new persuasion volume unless boards show spare capacity.'
    preferred_primary_action =
      'Protect visible poll/event staffing and captain-led follow-through before generic outreach expansion.'
    deferred_secondary_action =
      'Defer low-leverage admin clean-up and experimental programs until staffing truth stabilizes on coordinator views.'
    rationale.push('Derived from campaign phase heuristic + session segmentation — not turnout modeling.')
  } else if (mode === 'early_vote') {
    top_tradeoff_headline =
      'Tradeoff: ballot-access tasks and staffed touchpoints beat broad passive messaging in this window.'
    preferred_primary_action = 'Prioritize shifts, reminders, and coverage around early-vote paths visible in assignments.'
    deferred_secondary_action = 'Deprioritize long-horizon persuasion experiments absent spare volunteer hours.'
    rationale.push('Early-vote framing is operational; exact EV dates are not in this payload.')
  } else if (mode === 'recovery') {
    top_tradeoff_headline =
      'Tradeoff (recovery heuristic): stabilization and honest capacity beat optics — reopen lanes only when boards show slack.'
    preferred_primary_action =
      'Close governance exceptions, unblock supervised rows, and confirm KPI truth before narrative or program recovery pushes.'
    deferred_secondary_action =
      'Defer prestige events and net-new volunteer programs until coordinator-visible assignment debt drops.'
    rationale.push('Recovery mode is a phase label from visible signals, not a performance verdict.')
  } else if (primary === 'persuasion' && (mode === 'turnout_build' || mode === 'persuasion')) {
    top_tradeoff_headline =
      'Tradeoff: persuasion posture is primary in context — still protect coordinator backlog before adding turf scope.'
    preferred_primary_action = 'Keep narrative + relational work aligned to visible KPIs and segmentation confidence_note.'
    deferred_secondary_action =
      staff > 0
        ? 'Defer net-new events if assignment staffing rows show pressure.'
        : 'Defer speculative geography expansion without coordinator confirmation.'
    rationale.push('Segmentation modes are heuristics, not voter-file truth.')
  } else if (primary === 'turnout' || primary === 'event_mobilization') {
    top_tradeoff_headline = 'Tradeoff: turnout / mobilization signals lead — shore up events and shifts before phone/door scale-up.'
    preferred_primary_action = 'Close staffing gaps and supervised blocked rows visible on this desk.'
    deferred_secondary_action = 'Generic follow-up blitz can wait if boards show assignment debt.'
    rationale.push('Grounded in segmentation primary_mode and coverage staffing hints only.')
  }

  if (staff > 0 && input.eventDeployment?.staffing_pressure_count != null && input.eventDeployment.staffing_pressure_count > 0) {
    if (!top_tradeoff_headline) {
      top_tradeoff_headline =
        'Tradeoff: visible event staffing pressure argues for captains and reassignment before new recruitment asks.'
      preferred_primary_action = 'Staff the flagged event / assignment lanes coordinators can see.'
      deferred_secondary_action = 'Pause low-ROI busywork that does not relieve those lanes.'
      rationale.push('Staffing counts are board-visible proxies only.')
    }
  }

  const fusionRec = input.commandFusion?.recommended_intervention?.trim()
  if (fusionRec && weakField) {
    rationale.push(`Fused intervention hint: ${fusionRec.slice(0, 200)}`)
  } else if (fusionRec && (mode === 'gotv' || mode === 'election_day' || mode === 'early_vote')) {
    rationale.push(`Fused intervention hint: ${fusionRec.slice(0, 200)}`)
  }

  const confidence_note =
    rationale.length === 0
      ? 'Thin signals in this session — state tradeoffs qualitatively and confirm on coordinator / admin surfaces.'
      : 'Heuristic only; confirm capacity and deadlines on visible boards before hard commitments.'

  if (!top_tradeoff_headline && !preferred_primary_action) {
    if (rationale.length === 0) return null
    return {
      top_tradeoff_headline: 'No strong tradeoff lock — sequence visible risks first, then revisit posture.',
      rationale_points: rationale.slice(0, 4),
      confidence_note,
    }
  }

  return {
    top_tradeoff_headline,
    preferred_primary_action,
    deferred_secondary_action,
    rationale_points: rationale.length ? rationale.slice(0, 5) : undefined,
    confidence_note,
  }
}
