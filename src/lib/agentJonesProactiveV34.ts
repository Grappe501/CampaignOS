import type {
  AgentJonesCommandFusionSummary,
  AgentJonesOperatingContext,
  AgentJonesProactiveAlert,
  AgentJonesSurface,
} from './agentJonesContextV2'
import type { AgentJonesV34Pack } from './agentJonesV34Pack'

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
 * Single phase-aware chief-of-staff nudge (Pass 3). Skips when v3.3 fusion already
 * recommends the same first move (avoids duplicate alerts).
 */
export function buildAgentJonesV34ProactiveSupplements(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  v34: AgentJonesV34Pack | null
  commandFusion: AgentJonesCommandFusionSummary | null | undefined
}): AgentJonesProactiveAlert[] {
  if (!leadershipish(input.surface, input.operating.normalized_role)) return []
  if (!input.v34 || Object.keys(input.v34).length === 0) return []

  const seq = input.v34.intervention_sequence
  const step0 = seq?.ordered_steps?.[0]?.trim()
  const tr = input.v34.tradeoff_summary?.preferred_primary_action?.trim()
  const line = (step0 ?? tr ?? '').trim()
  if (!line) return []

  const fusionLine = input.commandFusion?.recommended_intervention?.trim()
  if (
    fusionLine &&
    line.slice(0, 72).toLowerCase() === fusionLine.slice(0, 72).toLowerCase()
  ) {
    return []
  }

  const late =
    input.v34.countdown_summary?.countdown_window === 'same_day' ||
    input.v34.countdown_summary?.countdown_window === '24h'
  const gotv = input.v34.gotv_summary?.gotv_mode_active

  return [
    {
      id: 'proactive-v34-chief-sequencing',
      severity: late || gotv ? 'high' : 'medium',
      title: 'Chief of staff — sequencing priority',
      explanation: line.slice(0, 320),
      dismissible: true,
    },
  ]
}
