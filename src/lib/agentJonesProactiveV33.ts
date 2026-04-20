import type {
  AgentJonesCommandFusionSummary,
  AgentJonesOperatingContext,
  AgentJonesProactiveAlert,
  AgentJonesSurface,
} from './agentJonesContextV2'

function leadershipish(
  surface: AgentJonesSurface,
  role: AgentJonesOperatingContext['normalized_role'],
): boolean {
  if (
    surface === 'admin_desk' ||
    surface === 'candidate_desk' ||
    surface === 'coordinator_desk'
  ) {
    return true
  }
  return role === 'campaign_manager' || role === 'assistant_campaign_manager'
}

/**
 * One high-value nudge from fused commander intelligence (Pass 3).
 * Kept singular to avoid crowding v3.2 supplements.
 */
export function buildAgentJonesV33ProactiveSupplements(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  fusion: AgentJonesCommandFusionSummary | null | undefined
}): AgentJonesProactiveAlert[] {
  if (!leadershipish(input.surface, input.operating.normalized_role)) return []

  const fusion = input.fusion
  const line = fusion?.recommended_intervention?.trim()
  if (!line) return []

  const hot =
    (fusion.task_overlap_count ?? 0) > 4 ||
    (fusion.deadline_overlap_count ?? 0) > 0 ||
    (fusion.coverage_staffing_pressure_count ?? 0) > 0 ||
    (fusion.governance_timing_signal_count ?? 0) > 0 ||
    (fusion.event_overlap_count ?? 0) > 0

  return [
    {
      id: 'proactive-v33-fused-command-intervention',
      severity: hot ? 'high' : 'medium',
      title: 'Fused command — next intervention',
      explanation: line.slice(0, 320),
      dismissible: true,
    },
  ]
}
