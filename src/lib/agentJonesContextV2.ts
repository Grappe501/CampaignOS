import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { needsOnboardingPath } from './dashboardState'
import type { MatchedVoterDisplayRow } from './voterMatch'

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
  points?: number
  streaks?: { active_days: number; completion_days: number }
}

export type AgentJonesContextV2 = {
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
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
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
  campaign?: AgentJonesContextV2['campaign'] | null
  relationalPower5?: AgentJonesRelationalPower5Context | null
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
}): AgentJonesContextV2 {
  const {
    profile,
    matchedVoter,
    voterMatched,
    progressSlice,
    voterLoading,
    campaign,
    relationalPower5,
    volunteerMission,
    dailyActivation,
    internLayer,
    campaignGoals,
  } = input

  return {
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
  }
}

