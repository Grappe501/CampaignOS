import type {
  DailyLane,
  UserLaneScoresPayload,
} from './dailyMissionEngine'
import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'

const NON_COMM: DailyLane[] = ['voter', 'events', 'leadership']

function scoreForLane(row: UserLaneScoresPayload, lane: DailyLane): number {
  switch (lane) {
    case 'communications':
      return row.communications_score
    case 'voter':
      return row.voter_score
    case 'events':
      return row.events_score
    case 'leadership':
      return row.leadership_score
    default:
      return 0
  }
}

/** Strongest lane; default excludes communications so specialization matches adaptive generator. */
export function getTopLane(
  scores: UserLaneScoresPayload,
  mode: 'exclude_comm' | 'all' = 'exclude_comm',
): DailyLane {
  const lanes: DailyLane[] = mode === 'all' ? ['communications', ...NON_COMM] : [...NON_COMM]
  let best: DailyLane = lanes[0]
  let bestV = scoreForLane(scores, best)
  for (const ln of lanes) {
    const v = scoreForLane(scores, ln)
    if (v > bestV) {
      bestV = v
      best = ln
    }
  }
  return best
}

/** Lane to grow next; excludes communications. */
export function getWeakLane(scores: UserLaneScoresPayload): DailyLane {
  let weak: DailyLane = NON_COMM[0]
  let weakV = scoreForLane(scores, weak)
  for (const ln of NON_COMM) {
    const v = scoreForLane(scores, ln)
    if (v < weakV) {
      weakV = v
      weak = ln
    }
  }
  return weak
}

export function progressionStage(input: {
  activation_days_completed: number
  tasks_completed_sum: number
  max_non_comm_score: number
}): 'new' | 'active' | 'advanced' {
  if (input.activation_days_completed < 4 || input.tasks_completed_sum < 12) return 'new'
  if (input.max_non_comm_score >= 72) return 'advanced'
  return 'active'
}

export function laneDisplayLabel(lane: string): string {
  switch (lane) {
    case 'communications':
      return 'Social'
    case 'voter':
      return 'Voter'
    case 'events':
      return 'Events'
    case 'leadership':
      return 'Leadership'
    default:
      return lane
  }
}

export function buildAssignmentHint(input: {
  stage: 'new' | 'active' | 'advanced'
  top_lane: DailyLane
  growth_lane: DailyLane
}): string {
  if (input.stage === 'new') {
    return 'Balanced lanes while you ramp up — social stays universal every day.'
  }
  if (input.top_lane === input.growth_lane) {
    return 'Keep steady reps — social stays universal; extra reps lean into your strongest lane when you are ready.'
  }
  if (input.stage === 'advanced') {
    return `You are strong in ${laneDisplayLabel(input.top_lane)} — doubling down there while still growing ${laneDisplayLabel(input.growth_lane)}. Social stays universal.`
  }
  return `Leaning into ${laneDisplayLabel(input.top_lane)} while building ${laneDisplayLabel(input.growth_lane)}. Social stays universal.`
}

/** Recompute lane + behavior scores from metrics (server). */
export async function updateLaneScores(campaignProfileId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('daily_sync_activation_scores', {
    p_profile_id: campaignProfileId,
  })
  if (error) {
    console.warn('daily_sync_activation_scores:', error.message)
    return false
  }
  return true
}
