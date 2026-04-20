import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { needsOnboardingPath } from './dashboardState'
import type { MatchedVoterDisplayRow } from './voterMatch'
import type {
  AgentJonesDeskRoute,
  AgentJonesLeadershipLevel,
  AgentJonesNormalizedRole,
  AgentJonesUserScope,
} from './agentJonesRoleDesk'
import { buildAgentJonesTaskPressure } from './agentJonesTaskPressure'
import { enrichCampaignManagerCommandPass2 } from './agentJonesCampaignManagerCommand'
import {
  enrichLeadershipCommandWithV32,
  enrichLeadershipCommandWithV33,
  enrichLeadershipCommandWithV34,
} from './agentJonesLeadershipCommand'
import { buildAgentJonesV31Pack } from './agentJonesV31Pack'
import {
  agentJonesV32CommandScope,
  buildAgentJonesV32Pack,
} from './agentJonesV32Pack'
import { buildAgentJonesV32ProactiveSupplements, mergeProactiveAlertLists } from './agentJonesProactiveV32'
import { buildAgentJonesV33ProactiveSupplements } from './agentJonesProactiveV33'
import { buildAgentJonesV3Brain } from './agentJonesV3Brain'
import { buildAgentJonesV33Pack } from './agentJonesV33Pack'
import { buildAgentJonesV34Pack } from './agentJonesV34Pack'

/** Bounded relational organizing summary — no PII beyond counts and stage hints. */
export type AgentJonesRelationalPower5Context = {
  network_counts: {
    identified_total: number
    contacted: number
    activated: number
    roster_matched: number
  }
  early_stage_count: number
  open_manual_relays: number
  recommended_next: string | null
}

export function buildAgentJonesRelationalPower5Context(input: {
  totalNodes: number
  contacted: number
  activated: number
  rosterMatched: number
  earlyStageCount: number
  openManualRelays: number
  recommendedNext: string | null
}): AgentJonesRelationalPower5Context {
  return {
    network_counts: {
      identified_total: input.totalNodes,
      contacted: input.contacted,
      activated: input.activated,
      roster_matched: input.rosterMatched,
    },
    early_stage_count: input.earlyStageCount,
    open_manual_relays: input.openManualRelays,
    recommended_next: input.recommendedNext,
  }
}

/** Bounded mission-task queue for coaching (no raw notes / PII). */
/** Daily four-lane activation (UTC day) — safe counts + tier label only. */
export type AgentJonesDailyActivationContext = {
  completed_today: number
  total_today: number
  points_today: number
  team_tier_label: string | null
  next_task_title: string | null
  total_points?: number
  streak_days?: number
  /** Adaptive intelligence (bounded, no PII). */
  progression_stage?: 'new' | 'active' | 'advanced'
  top_lane?: string | null
  growth_lane?: string | null
  lane_scores?: {
    communications: number
    voter: number
    events: number
    leadership: number
  }
  reliability_score?: number
  consistency_score?: number
  momentum_score?: number
  assignment_hint?: string | null
}

/** Intern desk — counts and hints only (no volunteer PII). */
export type AgentJonesInternLayerContext = {
  assigned_pipeline_count: number
  overdue_first_contact_count: number
  next_follow_up_hint: string | null
  leadership_task_title: string | null
}

/** Campaign KPIs — bounded counts for coaching (no financial detail beyond totals). */
export type AgentJonesCampaignGoalsContext = {
  kpis: {
    slug: string
    name: string
    current: number
    target: number
    unit: string
    pct: number
  }[]
  user_contribution_summary: { slug: string; contributed: number }[] | null
}

/** UI route / desk — drives guidance tone (not a permission model). */
export const AGENT_JONES_SURFACES = [
  'volunteer_dashboard',
  'intern_desk',
  'coordinator_desk',
  'candidate_desk',
  'admin_desk',
] as const
export type AgentJonesSurface = (typeof AGENT_JONES_SURFACES)[number]

export function agentJonesSurfaceFromPathname(pathname: string): AgentJonesSurface {
  const p = (pathname.split('?')[0] ?? '/').trim() || '/'
  if (p.startsWith('/admin')) return 'admin_desk'
  if (p.startsWith('/intern')) return 'intern_desk'
  if (p.startsWith('/events')) return 'coordinator_desk'
  if (p.startsWith('/coordinator')) return 'coordinator_desk'
  if (p.startsWith('/candidate')) return 'candidate_desk'
  return 'volunteer_dashboard'
}

/** Brain mode hint — UI may stay unified; server uses this for tone. */
export type AgentJonesOperatingMode =
  | 'guide'
  | 'command'
  | 'ops'
  | 'task'
  | 'calendar'
  | 'leadership'
  | 'training'

export type AgentJonesUrgentSignal = {
  id: string
  label: string
  /** One-line why this signal matters (deterministic, roster-safe). */
  explanation: string
  severity: 'info' | 'watch' | 'urgent'
  owner_hint: string | null
  route_hint: string | null
}

export type AgentJonesCommandSummary = {
  attention_now: string[]
  on_track: string[]
  next_steps: string[]
  recent_changes: string[]
}

/** Compact operating picture: deterministic, roster-safe, no invented metrics. */
export type AgentJonesOperatingContext = {
  normalized_role: AgentJonesNormalizedRole
  desk_route: AgentJonesDeskRoute
  leadership_level: AgentJonesLeadershipLevel
  user_scope: AgentJonesUserScope
  recommended_mode: AgentJonesOperatingMode
  command_summary: AgentJonesCommandSummary
  urgent_signals: AgentJonesUrgentSignal[]
  exception_summary: {
    status_key: string
    has_open_exception: boolean
    pending_review: boolean
  }
  desk_health: {
    volunteer_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    intern_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    coordinator_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    leadership_lane: 'healthy' | 'watch' | 'urgent' | 'na'
  }
  kpi_telemetry: {
    active_kpi_count: number | null
    mean_pct: number | null
    below_half: number | null
    weakest_name: string | null
    weakest_pct_of_target: number | null
  }
  readiness_summary: string
  /** Stable hash of visible operating inputs — repetition guard + session hints. */
  signal_epoch: string
}

/** v3 — ranked priority cards derived from `operating` (client-built, server-validated). */
export type AgentJonesPrioritySignalSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'

export type AgentJonesPrioritySignalCategory =
  | 'exceptions'
  | 'kpi'
  | 'intern'
  | 'coordinator'
  | 'missions'
  | 'readiness'

export type AgentJonesPrioritySignal = {
  id: string
  severity: AgentJonesPrioritySignalSeverity
  category: AgentJonesPrioritySignalCategory
  title: string
  explanation: string
  owner_hint: string | null
  route_hint: string | null
  target_id: string | null
  confidence: 0 | 1
}

export type AgentJonesDeskSummaryDesk =
  | 'volunteer'
  | 'intern'
  | 'coordinator'
  | 'candidate'
  | 'admin'

export type AgentJonesDeskSummary = {
  desk: AgentJonesDeskSummaryDesk
  headline: string
  attention_now: string[]
  on_track: string[]
  next_steps: string[]
  recent_changes: string[]
  recommended_mode: AgentJonesOperatingMode
  readiness_summary: string
}

export type AgentJonesNavigationHint = {
  kind: 'scroll' | 'navigate'
  label: string
  route: string | null
  target_id: string | null
  reason: string
  priority: 1 | 2 | 3
}

/** Compact workload snapshot — counts only, no PII. */
export type AgentJonesTaskPressureSummary = {
  mission_active: number
  mission_stalled: number
  daily_remaining: number | null
  intern_pipeline_assigned: number
  intern_overdue_first_contact: number
  coord_blocked: number
  coord_overdue: number
  open_assignments: number
  headline: string
}

/** Client-only session hint so the model varies wording when signals are unchanged. */
export type AgentJonesSessionCoaching = {
  signal_epoch: string
  avoid_repeating: string[]
}

/** v3.1 — optional calendar/time layer until a full events engine exists. */
export type AgentJonesCalendarSummary = {
  next_event_title?: string | null
  next_event_at?: string | null
  next_deadline_title?: string | null
  next_deadline_at?: string | null
  upcoming_count_7d?: number | null
  staffing_gap_count?: number | null
  governance_warning_count?: number | null
  has_meaningful_upcoming_activity?: boolean | null
}

/** v3.1 — deterministic proactive nudges (grounded; no invented events). */
export type AgentJonesProactiveAlert = {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  explanation: string
  route_hint?: string | null
  target_id?: string | null
  dismissible?: boolean
}

/** v3.1 — leadership/admin/CM synthesis (compact). */
export type AgentJonesLeadershipCommand = {
  synthesis_lines: string[]
  recommended_intervention: string | null
}

/** v3.1 — readiness / “where we are thin” framing (no county engine yet). */
export type AgentJonesReadinessCoverage = {
  summary_lines: string[]
  thin_areas: string[]
}

/** v3.2 Pass 1 — compact field pressure (client-visible; not multi-county turf engine). */
export type AgentJonesFieldIntelligenceSummary = {
  weakest_area_label?: string | null
  strongest_area_label?: string | null
  undercovered_area_count?: number | null
  high_pressure_area_count?: number | null
  volunteer_capacity_warning_count?: number | null
  coordinator_pressure_count?: number | null
  area_readiness_summary?: string | null
  top_field_risks?: string[]
}

/** v3.2 Pass 1 — geography from roster-safe fields only. */
export type AgentJonesGeoIntelligence = {
  scope_type?: 'campaign' | 'district' | 'county' | 'precinct' | 'region' | null
  primary_area_label?: string | null
  target_area_labels?: string[]
  undercovered_area_labels?: string[]
  high_opportunity_area_labels?: string[]
  area_count_in_view?: number | null
}

/** v3.2 Pass 1 — coverage / staffing hints from visible assignments + timing layer. */
export type AgentJonesCoverageSummary = {
  county_coverage_watch_count?: number | null
  precinct_coverage_watch_count?: number | null
  missing_leadership_slots?: string[]
  event_staffing_pressure_count?: number | null
  volunteer_shortage_area_labels?: string[]
  readiness_headline?: string | null
}

/** v3.2 — public/safe demographic framing (no census or voter-file microtargeting). */
export type AgentJonesDemographicSummary = {
  area_label?: string | null
  population_band?: string | null
  turnout_relevant_notes?: string[]
  demographic_highlights?: string[]
  organizing_considerations?: string[]
  confidence_note?: string | null
}

/** v3.2 — cross-desk escalation hints from visible operating signals. */
export type AgentJonesEscalationSummary = {
  cross_desk_issue_count?: number | null
  top_escalation_headline?: string | null
  escalation_routes?: string[]
  blocked_downstream_work_count?: number | null
}

/** v3.2 — campaign-manager / HQ command mode (compact). */
export type AgentJonesCampaignManagerCommand = {
  command_lines: string[]
  top_opportunity_hint: string | null
  top_risk_hint: string | null
  cross_desk_note: string | null
  /** Session-visible area stress proxy — not a ranked turf list. */
  top_risk_area_hint?: string | null
  /** Session-visible relative clarity proxy when present. */
  top_opportunity_area_hint?: string | null
  /** One-line CM/ACM sequencing recommendation from visible signals. */
  recommended_intervention?: string | null
  /** Honest limits of field analytics in chat (short). */
  field_readiness_framing?: string | null
  /** Coverage + timing pressure from visible boards / calendar layer. */
  coverage_task_pressure_line?: string | null
  /** v3.3 Pass 2 — comparative top row focus for HQ (session-safe). */
  recommended_area_focus?: string | null
  /** v3.3 Pass 2 — turnout / persuasion / recruitment posture (heuristic). */
  segmentation_posture_line?: string | null
  /** v3.3 Pass 2 — event staffing + weak-field overlap (one line). */
  event_deployment_line?: string | null
}

/** v3.3 — comparative area row (bounded scores; nulls when not derivable). */
export type AgentJonesAreaScore = {
  area_label: string
  area_type: 'turf' | 'ward' | 'precinct' | 'county' | 'district' | 'region'
  priority_band: 'critical' | 'high' | 'watch' | 'stable'
  opportunity_score?: number | null
  readiness_score?: number | null
  coverage_score?: number | null
  pressure_score?: number | null
  trend?: 'improving' | 'steady' | 'slipping' | null
  recommendation_headline?: string | null
}

/** v3.3 — persuasion / turnout / posture framing (operational guidance, not voter truth). */
export type AgentJonesSegmentationSummary = {
  area_label?: string | null
  primary_mode?:
    | 'turnout'
    | 'persuasion'
    | 'recruitment'
    | 'leadership'
    | 'event_mobilization'
    | null
  secondary_mode?:
    | 'turnout'
    | 'persuasion'
    | 'recruitment'
    | 'leadership'
    | 'event_mobilization'
    | null
  rationale_points?: string[]
  confidence_note?: string | null
  /** Explicit turnout vs persuasion balance line when both matter (operational, not voter truth). */
  turnout_persuasion_balance?: string | null
}

/** v3.3 — event staffing / deployment hints from timing + coverage layer. */
export type AgentJonesEventDeploymentSummary = {
  highest_priority_event_label?: string | null
  highest_priority_event_reason?: string | null
  staffing_pressure_count?: number | null
  overlap_with_field_pressure?: string[]
  recommended_event_action?: string | null
  /** Stripped field weakest-area proxy when present. */
  weak_field_area_label?: string | null
  /** Narrative link between weak field and staffing/events (no microtargeting). */
  weak_field_overlap_note?: string | null
}

/** v3.3 — fused field + calendar + task pressure (command headline). */
export type AgentJonesCommandFusionSummary = {
  top_combined_pressure_headline?: string | null
  combined_pressure_areas?: string[]
  deadline_overlap_count?: number | null
  event_overlap_count?: number | null
  task_overlap_count?: number | null
  /** Visible assignment rows flagged for event/adjacent staffing (coverage boards). */
  coverage_staffing_pressure_count?: number | null
  /** Assignment timing / governance warnings in the calendar layer (session). */
  governance_timing_signal_count?: number | null
  recommended_intervention?: string | null
}

/** v3.3 — district / session-scope theater narrative. */
export type AgentJonesCampaignTheaterSummary = {
  theater_label?: string | null
  strongest_zone_labels?: string[]
  weakest_zone_labels?: string[]
  opportunity_zone_labels?: string[]
  recovery_zone_labels?: string[]
  readiness_headline?: string | null
  command_headline?: string | null
  /** When multiple ranked areas exist — honest scope note (Pass 3). */
  multi_area_note?: string | null
}

/** v3.4 — phase-aware campaign mode (derived; not turnout math). */
export type AgentJonesCampaignPhaseSummary = {
  campaign_mode?:
    | 'persuasion'
    | 'turnout_build'
    | 'early_vote'
    | 'gotv'
    | 'election_day'
    | 'recovery'
    | null
  mode_headline?: string | null
  days_to_next_major_milestone?: number | null
  next_major_milestone_label?: string | null
  urgency_level?: 'watch' | 'high' | 'critical' | null
  recommended_focus_areas?: string[]
}

/** v3.4 — election + session timing countdown (bounded). */
export type AgentJonesCountdownSummary = {
  next_countdown_label?: string | null
  days_remaining?: number | null
  countdown_window?: '7d' | '96h' | '48h' | '24h' | 'same_day' | null
  countdown_pressure_headline?: string | null
  action_window_notes?: string[]
  /** When the timing layer has no surfaced assignment milestones — election clock only. */
  countdown_scope_note?: string | null
}

/** v3.4 — resource / posture tradeoffs (heuristic). */
export type AgentJonesTradeoffSummary = {
  top_tradeoff_headline?: string | null
  preferred_primary_action?: string | null
  deferred_secondary_action?: string | null
  rationale_points?: string[]
  confidence_note?: string | null
}

/** v3.4 — intervention order from visible signals only. */
export type AgentJonesInterventionSequence = {
  sequence_headline?: string | null
  ordered_steps?: string[]
  primary_owner?: string | null
  downstream_dependencies?: string[]
  unblock_value_note?: string | null
}

/** v3.4 — GOTV / mobilization hints (no poll-level precision). */
export type AgentJonesGotvSummary = {
  gotv_mode_active?: boolean | null
  highest_pressure_area_labels?: string[]
  volunteer_deployment_headline?: string | null
  staffing_gap_labels?: string[]
  turnout_risk_headline?: string | null
  best_next_gotv_actions?: string[]
}

/** v3.4 — who should act first (coaching labels, not permissions). */
export type AgentJonesDeskRoutingSummary = {
  first_owner_role?: string | null
  second_owner_role?: string | null
  escalation_route?: string[]
  route_headline?: string | null
}

/** Coordinator oversight — counts only, no assignee PII. */
export type AgentJonesCoordinatorOpsContext = {
  has_supervisor_scope: boolean
  supervised_team_count: number
  open_assignments_total: number
  blocked_count: number
  overdue_count: number
  in_progress_count: number
  assigned_not_started_count: number
  intern_pipelines_active: number | null
  intern_pipelines_escalated: number | null
  intern_overdue_first_contact: number | null
  desk_loading: boolean
}

/** Leadership / principal desk — KPI summary only. */
export type AgentJonesLeadershipSnapshotContext = {
  active_kpi_count: number
  kpi_mean_progress_pct: number | null
  kpis_below_half_target: number
  weakest_kpi_name: string | null
  weakest_kpi_pct_of_target: number | null
  missions_visible_count: number
}

export type AgentJonesVolunteerMissionContext = {
  active_summaries: {
    title: string
    status: string
    templateKey: string
    why_points: number
  }[]
  next_best_title: string | null
  next_best_template_key: string | null
  recent_completed: { title: string; completed_at: string }[]
  stalled_titles: string[]
  /** Soonest assignment due_at among active rows (ISO), when present. */
  next_assignment_due_at?: string | null
  /** Active assignments overdue or due within 7 days (timing pressure). */
  assignments_due_within_7d_count?: number
  points?: number
  streaks?: { active_days: number; completion_days: number }
}

export type AgentJonesContextV2 = {
  surface: AgentJonesSurface
  /** Policy flags for server / future tool use (no open-web browsing in current release). */
  policy?: {
    outside_internet: 'denied' | 'elevated_reserved'
  }
  user: {
    role?: string | null
    onboarding_status?: string | null
    onboarding_branch?: string | null
    onboarding_momentum_state?: string | null
    onboarding_direction_key?: string | null
    onboarding_micro_commitment_key?: string | null
    onboarding_last_prompt?: string | null
    onboarding_last_action_at?: string | null
    voterMatched: boolean
    precinct?: string | null
    county?: string | null
    congressional_district?: string | null
    state_senate_district?: string | null
    state_representative_district?: string | null
    /** When exception was submitted (ISO) — timing nudges only; optional. */
    exception_requested_at?: string | null
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    /** Per-request rows from `campaign_knowledge_chunks` matched to the user's question. */
    retrievedKnowledge?: { text: string; tags?: string[] }[]
    /** Welcome Kit + org outline model (server-safe excerpts). */
    onboardingBrief?: {
      flowSteps?: string[]
      welcomePurpose?: string
      howWeWork?: string
      howWeGrow?: string
      pickLane?: string
      firstActions?: string
      messaging?: string
      escalation?: string
      valueTitles?: string[]
      laneOptions?: {
        key: string
        title: string
        summary?: string
        firstAction?: string
      }[]
      talkTrackTitles?: string[]
    }
  }
  operational: {
    progressSlice: DashboardProgressSlice
    voterLoading: boolean
    needsOnboardingPath: boolean
  }
  relational_power5?: AgentJonesRelationalPower5Context
  volunteer_mission?: AgentJonesVolunteerMissionContext
  daily_activation?: AgentJonesDailyActivationContext
  intern_layer?: AgentJonesInternLayerContext
  campaign_goals?: AgentJonesCampaignGoalsContext
  coordinator_ops?: AgentJonesCoordinatorOpsContext
  leadership_snapshot?: AgentJonesLeadershipSnapshotContext
  /** Role-aware command snapshot — grounded in visible client state only. */
  operating?: AgentJonesOperatingContext
  /** v3 operating console — deterministic extensions of `operating`. */
  priority_signals?: AgentJonesPrioritySignal[]
  desk_summary?: AgentJonesDeskSummary
  navigation_hints?: AgentJonesNavigationHint[]
  /** Compact workload counts for the model (Pass 1). */
  task_pressure?: AgentJonesTaskPressureSummary
  /** Optional: client adds per-request for repetition discipline (Pass 3). */
  session_coaching?: AgentJonesSessionCoaching
  /** v3.1 operations intelligence (optional blocks). */
  calendar_summary?: AgentJonesCalendarSummary
  proactive_alerts?: AgentJonesProactiveAlert[]
  leadership_command?: AgentJonesLeadershipCommand
  readiness_coverage?: AgentJonesReadinessCoverage
  /** v3.2 — field / geo / coverage / demographics / escalation / CM command (compact, client-built). */
  geo_intelligence?: AgentJonesGeoIntelligence
  field_intelligence?: AgentJonesFieldIntelligenceSummary
  coverage_intelligence?: AgentJonesCoverageSummary
  demographic_summary?: AgentJonesDemographicSummary
  escalation_summary?: AgentJonesEscalationSummary
  campaign_manager_command?: AgentJonesCampaignManagerCommand
  /** v3.3 — campaign commander layer (leadership / command-scoped desks only). */
  area_ranking?: AgentJonesAreaScore[]
  /** Pass 1 — when ranking rows are missing or thin. */
  area_ranking_note?: string
  segmentation_summary?: AgentJonesSegmentationSummary
  event_deployment?: AgentJonesEventDeploymentSummary
  command_fusion?: AgentJonesCommandFusionSummary
  campaign_theater?: AgentJonesCampaignTheaterSummary
  /** v3.4 — chief of staff / GOTV command layer (command-scoped desks). */
  campaign_phase?: AgentJonesCampaignPhaseSummary
  countdown_summary?: AgentJonesCountdownSummary
  tradeoff_summary?: AgentJonesTradeoffSummary
  intervention_sequence?: AgentJonesInterventionSequence
  gotv_summary?: AgentJonesGotvSummary
  desk_routing?: AgentJonesDeskRoutingSummary
}

function trunc(s: unknown, max: number): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

function safeBool(x: unknown): boolean {
  return Boolean(x)
}

export function buildAgentJonesContextV2(input: {
  profile: CampaignProfile | null
  matchedVoter: MatchedVoterDisplayRow | null
  voterMatched: boolean
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  surface?: AgentJonesSurface
  campaign?: AgentJonesContextV2['campaign'] | null
  relationalPower5?: AgentJonesRelationalPower5Context | null
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
  coordinatorOps?: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot?: AgentJonesLeadershipSnapshotContext | null
  policy?: AgentJonesContextV2['policy'] | null
  operating?: AgentJonesOperatingContext | null
  /** Current path — used for v3 navigation hints (scroll vs route). */
  pathname?: string
}): AgentJonesContextV2 {
  const {
    profile,
    matchedVoter,
    voterMatched,
    progressSlice,
    voterLoading,
    surface: surfaceIn,
    campaign,
    relationalPower5,
    volunteerMission,
    dailyActivation,
    internLayer,
    campaignGoals,
    coordinatorOps,
    leadershipSnapshot,
    policy,
    operating,
    pathname: pathnameIn = '/',
  } = input

  const surface: AgentJonesSurface = surfaceIn ?? 'volunteer_dashboard'
  const pathname = (pathnameIn ?? '/').split('?')[0] || '/'

  const taskPressure =
    operating != null
      ? buildAgentJonesTaskPressure({
          volunteerMission: volunteerMission ?? null,
          dailyActivation: dailyActivation ?? null,
          internLayer: internLayer ?? null,
          coordinatorOps: coordinatorOps ?? null,
        })
      : null

  const v31 =
    operating != null
      ? buildAgentJonesV31Pack({
          surface,
          operating,
          volunteerMission: volunteerMission ?? null,
          dailyActivation: dailyActivation ?? null,
          coordinatorOps: coordinatorOps ?? null,
          leadershipSnapshot: leadershipSnapshot ?? null,
          profile,
          progressSlice,
          internLayer: internLayer ?? null,
        })
      : null

  const v32 =
    operating != null
      ? buildAgentJonesV32Pack({
          surface,
          operating,
          matchedVoter,
          voterMatched,
          coordinatorOps: coordinatorOps ?? null,
          leadershipSnapshot: leadershipSnapshot ?? null,
          volunteerMission: volunteerMission ?? null,
          internLayer: internLayer ?? null,
          calendarSummary: v31?.calendar_summary ?? null,
          taskPressure,
          campaign: campaign ?? null,
        })
      : null

  const v33 =
    operating != null && v32
      ? buildAgentJonesV33Pack({
          surface,
          operating,
          leadershipSnapshot: leadershipSnapshot ?? null,
          geo: v32.geo_intelligence,
          field: v32.field_intelligence,
          coverage: v32.coverage_intelligence,
          demographic: v32.demographic_summary,
          calendarSummary: v31?.calendar_summary ?? null,
          taskPressure,
          volunteerMission: volunteerMission ?? null,
          campaignManagerCommand: v32.campaign_manager_command ?? null,
        })
      : null

  const v33Brain =
    v33 && Object.keys(v33).length > 0 ? v33 : null

  const v34 =
    operating != null && v32
      ? buildAgentJonesV34Pack({
          surface,
          operating,
          v33: v33Brain,
          calendarSummary: v31?.calendar_summary ?? null,
          coordinatorOps: coordinatorOps ?? null,
          leadershipSnapshot: leadershipSnapshot ?? null,
          field: v32.field_intelligence,
          coverage: v32.coverage_intelligence,
          escalation: v32.escalation_summary,
        })
      : null

  const v34Brain = v34 && Object.keys(v34).length > 0 ? v34 : null

  const proactiveAlerts =
    v31 && v32 && operating
      ? (() => {
          const cmdScope = agentJonesV32CommandScope({
            surface,
            normalizedRole: operating.normalized_role,
            userScope: operating.user_scope,
          })
          const base = mergeProactiveAlertLists(
            v31.proactive_alerts,
            buildAgentJonesV32ProactiveSupplements({
              operating,
              commandScope: cmdScope,
              surface,
              geo: v32.geo_intelligence,
              field: v32.field_intelligence,
              coverage: v32.coverage_intelligence,
              escalation: v32.escalation_summary,
            }),
            cmdScope ? 6 : 5,
          )
          if (!v33Brain) return base
          return mergeProactiveAlertLists(
            base,
            buildAgentJonesV33ProactiveSupplements({
              surface,
              operating,
              fusion: v33Brain.command_fusion,
            }),
            6,
          )
        })()
      : (v31?.proactive_alerts ?? [])

  const v3Brain =
    operating != null
      ? buildAgentJonesV3Brain({
          pathname,
          surface,
          operating,
          v32:
            v32 &&
            (v32.geo_intelligence != null ||
              v32.field_intelligence != null ||
              v32.coverage_intelligence != null)
              ? {
                  geo: v32.geo_intelligence,
                  field: v32.field_intelligence,
                  coverage: v32.coverage_intelligence,
                }
              : null,
          v33: v33Brain,
          v34: v34Brain,
        })
      : null

  const leadership_command_out = enrichLeadershipCommandWithV34({
    base: enrichLeadershipCommandWithV33({
      base: enrichLeadershipCommandWithV32({
        base: v31?.leadership_command ?? null,
        operating: operating ?? null,
        geo: v32?.geo_intelligence ?? null,
        field: v32?.field_intelligence ?? null,
        coverage: v32?.coverage_intelligence ?? null,
        escalation: v32?.escalation_summary ?? null,
        surface,
      }),
      operating: operating ?? null,
      surface,
      v33: v33Brain,
    }),
    operating: operating ?? null,
    surface,
    v34: v34Brain,
  })

  const exceptionRequestedAt = trunc(profile?.exception_requested_at, 40)

  return {
    surface,
    ...(policy ? { policy } : {}),
    user: {
      role: trunc(profile?.primary_role, 120),
      onboarding_status: trunc(profile?.onboarding_status, 120),
      onboarding_branch: trunc(profile?.onboarding_branch, 120),
      onboarding_momentum_state: trunc(profile?.onboarding_momentum_state, 32),
      onboarding_direction_key: trunc(profile?.onboarding_direction_key, 64),
      onboarding_micro_commitment_key: trunc(
        profile?.onboarding_micro_commitment_key,
        64,
      ),
      onboarding_last_prompt: trunc(profile?.onboarding_last_prompt, 160),
      onboarding_last_action_at: trunc(profile?.onboarding_last_action_at, 48),
      voterMatched: safeBool(voterMatched),
      precinct: trunc(matchedVoter?.precinct_name, 140),
      county: trunc(matchedVoter?.county, 120),
      congressional_district: trunc(matchedVoter?.congressional_district, 32),
      state_senate_district: trunc(matchedVoter?.state_senate_district, 32),
      state_representative_district: trunc(
        matchedVoter?.state_representative_district,
        32,
      ),
      ...(exceptionRequestedAt ? { exception_requested_at: exceptionRequestedAt } : {}),
    },
    ...(campaign ? { campaign } : {}),
    operational: {
      progressSlice,
      voterLoading,
      needsOnboardingPath: needsOnboardingPath(profile),
    },
    ...(relationalPower5 ? { relational_power5: relationalPower5 } : {}),
    ...(volunteerMission ? { volunteer_mission: volunteerMission } : {}),
    ...(dailyActivation ? { daily_activation: dailyActivation } : {}),
    ...(internLayer ? { intern_layer: internLayer } : {}),
    ...(campaignGoals ? { campaign_goals: campaignGoals } : {}),
    ...(coordinatorOps ? { coordinator_ops: coordinatorOps } : {}),
    ...(leadershipSnapshot ? { leadership_snapshot: leadershipSnapshot } : {}),
    ...(operating ? { operating } : {}),
    ...(taskPressure ? { task_pressure: taskPressure } : {}),
    ...(v3Brain ? v3Brain : {}),
    ...(v31?.calendar_summary ? { calendar_summary: v31.calendar_summary } : {}),
    ...(proactiveAlerts.length ? { proactive_alerts: proactiveAlerts } : {}),
    ...(leadership_command_out ? { leadership_command: leadership_command_out } : {}),
    ...(v31?.readiness_coverage
      ? { readiness_coverage: v31.readiness_coverage }
      : {}),
    ...(v32?.geo_intelligence ? { geo_intelligence: v32.geo_intelligence } : {}),
    ...(v32?.field_intelligence ? { field_intelligence: v32.field_intelligence } : {}),
    ...(v32?.coverage_intelligence
      ? { coverage_intelligence: v32.coverage_intelligence }
      : {}),
    ...(v32?.demographic_summary ? { demographic_summary: v32.demographic_summary } : {}),
    ...(v32?.escalation_summary ? { escalation_summary: v32.escalation_summary } : {}),
    ...(v32?.campaign_manager_command
      ? {
          campaign_manager_command: enrichCampaignManagerCommandPass2(
            v32.campaign_manager_command,
            {
              area_ranking: v33?.area_ranking,
              segmentation_summary: v33?.segmentation_summary,
              event_deployment: v33?.event_deployment,
              campaign_phase: v34Brain?.campaign_phase ?? null,
              countdown_summary: v34Brain?.countdown_summary ?? null,
              gotv_summary: v34Brain?.gotv_summary ?? null,
              tradeoff_summary: v34Brain?.tradeoff_summary ?? null,
              intervention_sequence: v34Brain?.intervention_sequence ?? null,
              desk_routing: v34Brain?.desk_routing ?? null,
            },
          ),
        }
      : {}),
    ...(v33?.area_ranking?.length ? { area_ranking: v33.area_ranking } : {}),
    ...(v33?.area_ranking_note ? { area_ranking_note: v33.area_ranking_note } : {}),
    ...(v33?.segmentation_summary
      ? { segmentation_summary: v33.segmentation_summary }
      : {}),
    ...(v33?.event_deployment ? { event_deployment: v33.event_deployment } : {}),
    ...(v33?.command_fusion ? { command_fusion: v33.command_fusion } : {}),
    ...(v33?.campaign_theater ? { campaign_theater: v33.campaign_theater } : {}),
    ...(v34Brain?.campaign_phase ? { campaign_phase: v34Brain.campaign_phase } : {}),
    ...(v34Brain?.countdown_summary ? { countdown_summary: v34Brain.countdown_summary } : {}),
    ...(v34Brain?.tradeoff_summary ? { tradeoff_summary: v34Brain.tradeoff_summary } : {}),
    ...(v34Brain?.intervention_sequence
      ? { intervention_sequence: v34Brain.intervention_sequence }
      : {}),
    ...(v34Brain?.gotv_summary ? { gotv_summary: v34Brain.gotv_summary } : {}),
    ...(v34Brain?.desk_routing ? { desk_routing: v34Brain.desk_routing } : {}),
  }
}

