import { useCallback, useEffect, useMemo, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  completeDailyTask,
  ensureDailyMission,
  fetchDailyActivationProgress,
  fetchDailyTeamTier,
  fetchUserBehaviorSignals,
  fetchUserLaneScores,
  skipDailyTask,
  utcTodayString,
  type DailyActivationProgressPayload,
  type DailyTeamTierPayload,
  type UserBehaviorSignalsPayload,
  type UserLaneScoresPayload,
} from '../lib/dailyMissionEngine'
import type { AgentJonesDailyActivationContext } from '../lib/agentJonesContextV2'
import {
  buildAssignmentHint,
  getTopLane,
  getWeakLane,
  laneDisplayLabel,
  progressionStage,
} from '../lib/laneScoringEngine'
import { supabase } from '../lib/supabaseClient'

export type DailyTaskRow = {
  id: string
  lane: string
  title: string
  description: string | null
  points: number
  status: string
  completed_at: string | null
}

const LANE_ORDER: Record<string, number> = {
  communications: 0,
  voter: 1,
  events: 2,
  leadership: 3,
}

export type UserScoreRow = {
  total_points: number
  daily_points: number
  weekly_points: number
  activation_streak_days: number
}

export type DailyActivationInsight = {
  progression_stage: 'new' | 'active' | 'advanced'
  top_lane: string
  growth_lane: string
  focus_line: string
  improving_line: string | null
  assignment_hint: string
}

const DEFAULT_LANE_SCORES: UserLaneScoresPayload = {
  communications_score: 25,
  voter_score: 25,
  events_score: 25,
  leadership_score: 25,
}

export function useDailyMission(campaignProfileId: string | undefined) {
  const [missionId, setMissionId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<DailyTaskRow[]>([])
  const [tier, setTier] = useState<DailyTeamTierPayload | null>(null)
  const [scores, setScores] = useState<UserScoreRow | null>(null)
  const [laneScores, setLaneScores] = useState<UserLaneScoresPayload | null>(null)
  const [behavior, setBehavior] = useState<UserBehaviorSignalsPayload | null>(null)
  const [progressStats, setProgressStats] = useState<DailyActivationProgressPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setMissionId(null)
      setTasks([])
      setTier(null)
      setScores(null)
      setLaneScores(null)
      setBehavior(null)
      setProgressStats(null)
      setLoading(false)
      setError(null)
      return
    }
    if (!campaignProfileId) {
      setMissionId(null)
      setTasks([])
      setTier(null)
      setScores(null)
      setLaneScores(null)
      setBehavior(null)
      setProgressStats(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const today = utcTodayString()
    const mid = await ensureDailyMission(campaignProfileId, today)
    setMissionId(mid)

    const [laneSc, beh, prog, tierRes, scRes] = await Promise.all([
      fetchUserLaneScores(campaignProfileId),
      fetchUserBehaviorSignals(campaignProfileId),
      fetchDailyActivationProgress(campaignProfileId),
      fetchDailyTeamTier(campaignProfileId),
      supabase
        .from('user_scores')
        .select('total_points, daily_points, weekly_points, activation_streak_days')
        .eq('campaign_profile_id', campaignProfileId)
        .maybeSingle(),
    ])

    setLaneScores(laneSc)
    setBehavior(beh)
    setProgressStats(prog)

    if (!mid) {
      setTasks([])
      setTier(tierRes)
      setScores(scRes.data != null ? (scRes.data as UserScoreRow) : null)
      setLoading(false)
      return
    }

    const tRes = await supabase
      .from('daily_tasks')
      .select('id, lane, title, description, points, status, completed_at')
      .eq('mission_id', mid)

    if (tRes.error) setError(tRes.error.message)
    const rows = (tRes.data ?? []) as DailyTaskRow[]
    rows.sort(
      (a, b) =>
        (LANE_ORDER[a.lane] ?? 99) - (LANE_ORDER[b.lane] ?? 99) ||
        a.title.localeCompare(b.title),
    )
    setTasks(rows)
    setTier(tierRes)
    setScores(scRes.data != null ? (scRes.data as UserScoreRow) : null)
    setLoading(false)
  }, [campaignProfileId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const mergedLaneScores = laneScores ?? DEFAULT_LANE_SCORES

  const activationInsight = useMemo((): DailyActivationInsight | null => {
    if (!campaignProfileId || isDevAuthBypassEnabled()) return null
    const maxNonComm = Math.max(
      mergedLaneScores.voter_score,
      mergedLaneScores.events_score,
      mergedLaneScores.leadership_score,
    )
    const top = getTopLane(mergedLaneScores)
    const growth = getWeakLane(mergedLaneScores)
    const actDays = progressStats?.activation_days_completed ?? 0
    const tsum = progressStats?.tasks_completed_sum ?? 0
    const stage = progressionStage({
      activation_days_completed: actDays,
      tasks_completed_sum: tsum,
      max_non_comm_score: maxNonComm,
    })
    const assignment_hint = buildAssignmentHint({ stage, top_lane: top, growth_lane: growth })
    const focus_line =
      stage === 'new'
        ? 'Balanced mix while you ramp up — social stays on your list every day.'
        : `Focus: ${laneDisplayLabel(top)} · Growth: ${laneDisplayLabel(growth)}`
    let improving_line: string | null = null
    if (top !== growth && (behavior?.momentum_score ?? 0) >= 32) {
      improving_line = `Nice momentum — you’re strongest in ${laneDisplayLabel(top)}; keep building ${laneDisplayLabel(growth)}.`
    }
    return {
      progression_stage: stage,
      top_lane: top,
      growth_lane: growth,
      focus_line,
      improving_line,
      assignment_hint,
    }
  }, [campaignProfileId, mergedLaneScores, behavior, progressStats])

  const complete = useCallback(
    async (taskId: string) => {
      const ok = await completeDailyTask(taskId)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const skip = useCallback(
    async (taskId: string) => {
      const ok = await skipDailyTask(taskId)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length
  const pointsToday = tasks
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + t.points, 0)

  const nextPending = tasks.find((t) => t.status === 'pending') ?? null

  const agentDailyContext: AgentJonesDailyActivationContext = useMemo(() => {
    const top = getTopLane(mergedLaneScores)
    const growth = getWeakLane(mergedLaneScores)
    const stage = activationInsight?.progression_stage ?? 'new'
    const hint =
      activationInsight?.assignment_hint ??
      buildAssignmentHint({ stage, top_lane: top, growth_lane: growth })
    return {
      completed_today: completedCount,
      total_today: totalCount,
      points_today: pointsToday,
      team_tier_label: tier?.tier_label ?? null,
      next_task_title: nextPending?.title ?? null,
      total_points: scores?.total_points,
      streak_days: scores?.activation_streak_days,
      progression_stage: stage,
      top_lane: top,
      growth_lane: growth,
      lane_scores: {
        communications: mergedLaneScores.communications_score,
        voter: mergedLaneScores.voter_score,
        events: mergedLaneScores.events_score,
        leadership: mergedLaneScores.leadership_score,
      },
      reliability_score: behavior?.reliability_score,
      consistency_score: behavior?.consistency_score,
      momentum_score: behavior?.momentum_score,
      assignment_hint: hint,
    }
  }, [
    mergedLaneScores,
    activationInsight?.progression_stage,
    activationInsight?.assignment_hint,
    completedCount,
    totalCount,
    pointsToday,
    tier?.tier_label,
    nextPending?.title,
    scores?.total_points,
    scores?.activation_streak_days,
    behavior?.reliability_score,
    behavior?.consistency_score,
    behavior?.momentum_score,
  ])

  return {
    missionId,
    tasks,
    tier,
    scores,
    laneScores: mergedLaneScores,
    behavior,
    activationInsight,
    loading,
    error,
    refetch: load,
    complete,
    skip,
    completedCount,
    totalCount,
    pointsToday,
    nextPending,
    agentDailyContext,
  }
}
