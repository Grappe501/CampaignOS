import type {
  AgentJonesCampaignPhaseSummary,
  AgentJonesCommandFusionSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesInterventionSequence,
  AgentJonesOperatingContext,
} from './agentJonesContextV2'
import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'
import type { AgentJonesAreaScore } from './agentJonesContextV2'

export function buildAgentJonesInterventionSequence(input: {
  operating: AgentJonesOperatingContext
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  escalation: AgentJonesEscalationSummary | null
  field: AgentJonesFieldIntelligenceSummary | null
  area_ranking: AgentJonesAreaScore[] | undefined | null
  phase: AgentJonesCampaignPhaseSummary | null
  commandFusion: AgentJonesCommandFusionSummary | undefined | null
}): AgentJonesInterventionSequence | null {
  const steps: string[] = []
  let primary_owner: string | null = null
  const downstream: string[] = []

  const mode = input.phase?.campaign_mode
  if (mode === 'gotv' || mode === 'election_day') {
    steps.push(
      'Campaign leadership: sequence GOTV staffing, captain comms, and shift truth before new geography or experiments (phase heuristic).',
    )
    primary_owner = primary_owner ?? 'campaign_manager'
    downstream.push('Coordinator-visible boards should reflect staffing decisions before volunteers see new asks.')
  } else if (mode === 'early_vote') {
    steps.push(
      'Campaign leadership: align early-vote touchpoints and assignment coverage before scaling cold outreach (operational framing only).',
    )
    primary_owner = primary_owner ?? 'campaign_manager'
  } else if (mode === 'recovery') {
    steps.push(
      'Campaign leadership: stabilize exceptions and supervised debt first — recovery optics follow honest capacity signals.',
    )
    primary_owner = primary_owner ?? 'campaign_manager'
  }

  const fusionHead = input.commandFusion?.top_combined_pressure_headline?.trim()
  if (fusionHead && steps.length < 5) {
    steps.push(`Fused pressure (session): ${fusionHead.slice(0, 180)} — sequence using coordinator/admin visible boards.`)
    primary_owner = primary_owner ?? 'campaign_manager'
  }

  if (input.operating.exception_summary.pending_review) {
    steps.push('Admin / governance: resolve roster exception queue so voter-gated work can resume safely.')
    primary_owner = primary_owner ?? 'admin'
    downstream.push('Field and coordinator execution stays paused on gated paths until cleared.')
  }

  const ops = input.coordinatorOps
  if (ops && (ops.blocked_count > 0 || ops.overdue_count > 0)) {
    steps.push(
      `Coordinator: triage supervised board — ${ops.blocked_count} blocked, ${ops.overdue_count} overdue (visible counts).`,
    )
    primary_owner = primary_owner ?? 'coordinator'
    downstream.push('Volunteer and intern lanes unblock after supervisor decisions.')
  }

  const ex = input.escalation
  if (ex && (ex.cross_desk_issue_count ?? 0) >= 2) {
    steps.push(
      'Campaign manager / HQ: pick one cross-desk escalation route and finish it before adding geography or programs.',
    )
    primary_owner = primary_owner ?? 'campaign_manager'
    downstream.push('Other desks should idle parallel escalations until the first path closes.')
  }

  const ranked = input.area_ranking?.length ? sortAgentJonesAreaRanking(input.area_ranking) : []
  const top = ranked[0]
  if (top && (top.priority_band === 'critical' || top.priority_band === 'high')) {
    steps.push(
      `Area sequencing: stabilize “${top.area_label.slice(0, 80)}” (${top.priority_band}) before weaker turf expansion.`,
    )
    primary_owner = primary_owner ?? 'campaign_manager'
  } else if (input.field?.top_field_risks?.[0]) {
    steps.push(`Field: address top visible risk — ${input.field.top_field_risks[0].slice(0, 160)}`)
    primary_owner = primary_owner ?? 'coordinator'
  }

  if (input.field?.volunteer_capacity_warning_count != null && input.field.volunteer_capacity_warning_count > 0) {
    steps.push(
      'Captains / leads: convert not-yet-started supervised rows into shifts or honest deferrals — avoid silent backlog.',
    )
    downstream.push('Intern pipeline may depend on those rows — check intern desk signals.')
  }

  if (steps.length === 0) return null

  const sequence_headline =
    primary_owner === 'admin'
      ? 'Sequence: governance exception first, then supervised execution, then geography.'
      : primary_owner === 'coordinator'
        ? 'Sequence: supervised board truth first, then field expansion.'
        : 'Sequence: stabilize the highest-pressure visible lane before parallel initiatives.'

  const unblock_value_note =
    downstream.length > 0
      ? 'Clearing the first step reduces duplicate escalations and protects volunteer morale — still session-bounded intelligence.'
      : 'Order reflects visible operating signals only — not a full org chart audit.'

  return {
    sequence_headline,
    ordered_steps: steps.slice(0, 5),
    primary_owner,
    downstream_dependencies: downstream.length ? downstream.slice(0, 3) : undefined,
    unblock_value_note,
  }
}
