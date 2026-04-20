import type {
  AgentJonesCampaignPhaseSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesDeskRoutingSummary,
  AgentJonesEscalationSummary,
  AgentJonesOperatingContext,
  AgentJonesSurface,
} from './agentJonesContextV2'

function roleLabel(role: AgentJonesOperatingContext['normalized_role']): string {
  switch (role) {
    case 'admin':
      return 'admin'
    case 'campaign_manager':
    case 'assistant_campaign_manager':
      return 'campaign_manager'
    case 'candidate':
      return 'candidate'
    case 'coordinator':
      return 'coordinator'
    case 'county_lead':
      return 'county_lead'
    case 'precinct_captain':
      return 'precinct_captain'
    case 'intern':
      return 'intern'
    default:
      return 'volunteer'
  }
}

export function buildAgentJonesDeskRoutingSummary(input: {
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  escalation: AgentJonesEscalationSummary | null
  phase: AgentJonesCampaignPhaseSummary | null
}): AgentJonesDeskRoutingSummary | null {
  const ex = input.escalation
  const routes = ex?.escalation_routes?.map((r) => r.trim().slice(0, 200)).filter(Boolean).slice(0, 4) ?? []

  let first_owner_role: string | null = null
  let second_owner_role: string | null = null
  let route_headline: string | null = null

  if (input.operating.exception_summary.pending_review) {
    first_owner_role = 'admin'
    second_owner_role = 'campaign_manager'
    route_headline = 'Exceptions route first to admin governance, then CM sequences field recovery.'
  } else if (input.surface === 'admin_desk') {
    first_owner_role = 'admin'
    second_owner_role =
      (input.coordinatorOps?.blocked_count ?? 0) > 0 ? 'coordinator' : 'campaign_manager'
    route_headline = 'Admin clears governance and desk health; CM/coordinator picks up execution lanes next.'
  } else if (
    input.operating.normalized_role === 'campaign_manager' ||
    input.operating.normalized_role === 'assistant_campaign_manager'
  ) {
    first_owner_role = 'campaign_manager'
    second_owner_role = 'coordinator'
    const pm = input.phase?.campaign_mode
    if (pm === 'gotv' || pm === 'election_day') {
      route_headline =
        'GOTV window: CM holds one honest sequencing path; coordinator owns shift truth and supervised execution before new asks.'
    } else if (pm === 'early_vote') {
      route_headline =
        'Early-vote window: CM aligns ballot-access priorities; coordinator runs staffed assignment lanes visible on boards.'
    } else {
      route_headline = 'CM sets sequencing; coordinator owns supervised board truth and volunteer air-cover.'
    }
  } else if (input.surface === 'coordinator_desk' || input.operating.normalized_role === 'coordinator') {
    first_owner_role = 'coordinator'
    second_owner_role =
      input.operating.normalized_role === 'county_lead' ||
      input.operating.normalized_role === 'precinct_captain'
        ? roleLabel(input.operating.normalized_role)
        : 'precinct_captain'
    route_headline = 'Coordinator unblocks assignments; local leads execute shifts and field coverage.'
  } else if (input.surface === 'candidate_desk' || input.operating.normalized_role === 'candidate') {
    first_owner_role = 'candidate'
    second_owner_role = 'campaign_manager'
    route_headline = 'Candidate time on narrative and closers; CM holds execution stack and tradeoffs.'
  } else if (
    input.operating.normalized_role === 'county_lead' ||
    input.operating.normalized_role === 'precinct_captain'
  ) {
    first_owner_role = roleLabel(input.operating.normalized_role)
    second_owner_role = 'coordinator'
    route_headline = 'Local lead executes turf plan; coordinator escalates capacity and reassignment.'
  } else if ((ex?.cross_desk_issue_count ?? 0) >= 2) {
    first_owner_role = 'campaign_manager'
    second_owner_role = 'admin'
    route_headline = 'Cross-desk pressure: CM sequences one honest path; admin supports if governance blocks.'
  } else {
    first_owner_role = roleLabel(input.operating.normalized_role)
    second_owner_role = 'coordinator'
    route_headline = 'Default route: your lane acts on visible tasks; coordinator is escalation for supervised work.'
  }

  if (!route_headline && !routes.length) return null

  return {
    first_owner_role,
    second_owner_role,
    ...(routes.length ? { escalation_route: routes } : {}),
    route_headline,
  }
}
