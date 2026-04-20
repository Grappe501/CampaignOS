import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'

export type DailyLane = 'communications' | 'voter' | 'events' | 'leadership'

export function utcTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Ensures four-lane mission exists for UTC date (idempotent). */
export async function ensureDailyMission(
  campaignProfileId: string,
  missionDate?: string | null,
): Promise<string | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('daily_ensure_mission_for_profile', {
    p_profile_id: campaignProfileId,
    p_mission_date: missionDate ?? null,
  })
  if (error) {
    console.warn('daily_ensure_mission_for_profile:', error.message)
    return null
  }
  return typeof data === 'string' ? data : null
}

export async function completeDailyTask(taskId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('daily_complete_task', {
    p_task_id: taskId,
  })
  if (error) {
    console.warn('daily_complete_task:', error.message)
    return false
  }
  return true
}

export async function skipDailyTask(taskId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('daily_skip_task', {
    p_task_id: taskId,
  })
  if (error) {
    console.warn('daily_skip_task:', error.message)
    return false
  }
  return true
}

export type DailyTeamTierPayload = {
  tier_label: string | null
  rank: number | null
  team_size: number | null
}

export async function fetchDailyTeamTier(
  campaignProfileId: string,
): Promise<DailyTeamTierPayload | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('daily_activation_team_tier', {
    p_profile_id: campaignProfileId,
  })
  if (error) {
    console.warn('daily_activation_team_tier:', error.message)
    return null
  }
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  return {
    tier_label: typeof o.tier_label === 'string' ? o.tier_label : null,
    rank: typeof o.rank === 'number' ? o.rank : null,
    team_size: typeof o.team_size === 'number' ? o.team_size : null,
  }
}

export type UserLaneScoresPayload = {
  communications_score: number
  voter_score: number
  events_score: number
  leadership_score: number
}

export type UserBehaviorSignalsPayload = {
  reliability_score: number
  consistency_score: number
  momentum_score: number
}

export type DailyActivationProgressPayload = {
  activation_days_completed: number
  tasks_completed_sum: number
}

export async function fetchDailyActivationProgress(
  campaignProfileId: string,
): Promise<DailyActivationProgressPayload | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('daily_activation_progress_stats', {
    p_profile_id: campaignProfileId,
  })
  if (error) {
    console.warn('daily_activation_progress_stats:', error.message)
    return null
  }
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const ad = o.activation_days_completed
  const ts = o.tasks_completed_sum
  if (typeof ad !== 'number' || typeof ts !== 'number') return null
  return { activation_days_completed: ad, tasks_completed_sum: ts }
}

export async function fetchUserLaneScores(
  campaignProfileId: string,
): Promise<UserLaneScoresPayload | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase
    .from('user_lane_scores')
    .select('communications_score, voter_score, events_score, leadership_score')
    .eq('campaign_profile_id', campaignProfileId)
    .maybeSingle()
  if (error) {
    console.warn('user_lane_scores:', error.message)
    return null
  }
  if (!data) return null
  const r = data as Record<string, unknown>
  return {
    communications_score: Number(r.communications_score),
    voter_score: Number(r.voter_score),
    events_score: Number(r.events_score),
    leadership_score: Number(r.leadership_score),
  }
}

export async function fetchUserBehaviorSignals(
  campaignProfileId: string,
): Promise<UserBehaviorSignalsPayload | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase
    .from('user_behavior_signals')
    .select('reliability_score, consistency_score, momentum_score')
    .eq('campaign_profile_id', campaignProfileId)
    .maybeSingle()
  if (error) {
    console.warn('user_behavior_signals:', error.message)
    return null
  }
  if (!data) return null
  return {
    reliability_score: Number(data.reliability_score),
    consistency_score: Number(data.consistency_score),
    momentum_score: Number(data.momentum_score),
  }
}

/** Supervisor / coach layer: team-scoped JSON (requires Power of 5 team id). */
export async function fetchSupervisorActivationInsights(
  power5TeamId: string,
): Promise<Record<string, unknown> | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('supervisor_activation_insights', {
    p_team_id: power5TeamId,
  })
  if (error) {
    console.warn('supervisor_activation_insights:', error.message)
    return null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}
