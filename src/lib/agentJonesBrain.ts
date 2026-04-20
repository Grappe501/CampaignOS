import type { CampaignProfile } from '../hooks/useProfile'
import { getAgentJonesGuidanceBundle } from './agentJonesGuidance'
import type { AgentJonesResponse } from './api/agentJones'
import type { DashboardProgressSlice } from './dashboardState'
import { getOnboardingEngineAiExtras } from './onboardingEngine'
import type {
  AgentJonesCampaignGoalsContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'

function trunc(s: unknown, max: number): string {
  const t = String(s ?? '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) : t
}

function missionFallbackLines(m: AgentJonesVolunteerMissionContext): string[] {
  const lines: string[] = []
  const pts = m.active_summaries[0]?.why_points
  if (m.next_best_title) {
    lines.push(`Here is your next best move: ${m.next_best_title}.`)
    if (pts != null) {
      lines.push(
        `You are one step away from more impact — finishing it adds ${pts} momentum points.`,
      )
    }
  }
  if (m.stalled_titles.length) {
    lines.push(`Stalled items to revisit: ${m.stalled_titles.slice(0, 2).join('; ')}.`)
  }
  if (m.points != null && m.streaks) {
    lines.push(
      `Score ${m.points} — ${m.streaks.completion_days}-day completion rhythm when you close tasks.`,
    )
  }
  if (!lines.length) {
    lines.push('Your mission queue is clear — tap a workspace card when you are ready for the next nudge.')
  }
  return lines
}

function dailyFallbackLines(d: AgentJonesDailyActivationContext): string[] {
  const lines: string[] = []
  if (d.total_today > 0) {
    lines.push(
      `Daily activation: you have completed ${d.completed_today} of ${d.total_today} today (${d.points_today} pts today).`,
    )
  }
  if (d.next_task_title && d.total_today > 0) {
    lines.push(`Next quick win: ${d.next_task_title}.`)
  }
  if (d.assignment_hint) {
    lines.push(d.assignment_hint)
  }
  if (
    d.progression_stage &&
    d.progression_stage !== 'new' &&
    d.top_lane &&
    d.growth_lane &&
    d.top_lane !== d.growth_lane
  ) {
    lines.push(
      `You are strong in ${d.top_lane} — keep building ${d.growth_lane} so the team stays balanced.`,
    )
  }
  if (d.team_tier_label) {
    lines.push(`You are ${d.team_tier_label} on your team by points — steady beats flashy.`)
  }
  if (d.streak_days != null && d.streak_days > 1) {
    lines.push(`${d.streak_days}-day activation streak.`)
  }
  if (!lines.length && d.total_today <= 0) {
    lines.push(
      'Daily activation shows up here when your roster is cleared — social stays the universal daily lane.',
    )
  }
  return lines
}

function internFallbackLines(i: AgentJonesInternLayerContext): string[] {
  const lines: string[] = []
  if (i.assigned_pipeline_count > 0) {
    lines.push(
      `Intern desk: ${i.assigned_pipeline_count} active volunteer pipeline(s).`,
    )
  }
  if (i.overdue_first_contact_count > 0) {
    lines.push(
      `${i.overdue_first_contact_count} first-contact window(s) are past due — prioritize a short human reach-out (call or text).`,
    )
  }
  if (i.next_follow_up_hint) {
    lines.push(i.next_follow_up_hint)
  }
  if (i.leadership_task_title) {
    lines.push(`Today’s leadership rep: ${i.leadership_task_title}.`)
  }
  if (!lines.length) {
    lines.push(
      'Intern desk: stay reachable, keep notes light, and escalate when you are stuck after three honest tries.',
    )
  }
  return lines
}

function campaignGoalsFallbackLines(g: AgentJonesCampaignGoalsContext): string[] {
  const lines: string[] = []
  for (const k of g.kpis.slice(0, 4)) {
    lines.push(
      `${k.name}: about ${k.pct}% toward our target (${k.current} of ${k.target} ${k.unit}). Completing your mission tasks moves these numbers.`,
    )
  }
  if (g.user_contribution_summary?.length) {
    lines.push(
      `Your logged impact: ${g.user_contribution_summary
        .map((u) => `${u.slug} +${u.contributed}`)
        .join(', ')}.`,
    )
  }
  if (!lines.length) {
    lines.push('Campaign goals load from the KPI strip on your dashboard when available.')
  }
  return lines
}

export function buildAgentJonesFallbackV2(input: {
  slice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
}): AgentJonesResponse {
  const bundle = getAgentJonesGuidanceBundle({
    slice: input.slice,
    profile: input.profile,
    voterLoading: input.voterLoading,
  })

  const suggestedPrompts = bundle.prompts
    .map((p) => trunc(p.label, 120))
    .filter(Boolean)
    .slice(0, 4)

  const firstScroll = bundle.prompts.find((p) => p.scrollToId)?.scrollToId
  const recommendedActions = firstScroll
    ? [{ type: 'scroll' as const, targetId: firstScroll }]
    : undefined

  const onboarding = getOnboardingEngineAiExtras(input.profile)
  const mission = input.volunteerMission
  const daily = input.dailyActivation
  const intern = input.internLayer
  const goals = input.campaignGoals
  const missionExtra =
    mission && (mission.active_summaries.length || mission.next_best_title)
      ? `\n\n${missionFallbackLines(mission).join('\n')}`
      : ''
  const dailyExtra =
    daily &&
    (daily.total_today > 0 ||
      Boolean(daily.assignment_hint) ||
      Boolean(daily.progression_stage))
      ? `\n\n${dailyFallbackLines(daily).join('\n')}`
      : ''
  const internExtra = intern ? `\n\n${internFallbackLines(intern).join('\n')}` : ''
  const goalsExtra =
    goals && goals.kpis.length ? `\n\n${campaignGoalsFallbackLines(goals).join('\n')}` : ''

  const missionScroll =
    mission?.next_best_title != null && mission.next_best_title !== ''
      ? ([{ type: 'scroll' as const, targetId: 'mission-tasks' as const }] as NonNullable<
          AgentJonesResponse['recommendedActions']
        >)
      : undefined

  const dailyScroll =
    daily && (daily.total_today > 0 || Boolean(daily.assignment_hint))
      ? ([{ type: 'scroll' as const, targetId: 'daily-activation' as const }] as NonNullable<
          AgentJonesResponse['recommendedActions']
        >)
      : undefined

  const internScroll =
    intern &&
    (intern.assigned_pipeline_count > 0 ||
      intern.overdue_first_contact_count > 0 ||
      Boolean(intern.leadership_task_title))
      ? ([{ type: 'scroll' as const, targetId: 'intern-desk' as const }] as NonNullable<
          AgentJonesResponse['recommendedActions']
        >)
      : undefined

  const goalsScroll =
    goals && goals.kpis.length > 0
      ? ([{ type: 'scroll' as const, targetId: 'campaign-kpis' as const }] as NonNullable<
          AgentJonesResponse['recommendedActions']
        >)
      : undefined

  const mergedScrolls = [
    ...(missionScroll ?? []),
    ...(dailyScroll ?? []),
    ...(internScroll ?? []),
    ...(goalsScroll ?? []),
  ].slice(0, 3)

  return {
    response: `${bundle.greeting}\n\n${bundle.stateExplanation}${missionExtra}${dailyExtra}${internExtra}${goalsExtra}`.trim(),
    ...(suggestedPrompts.length ? { suggestedPrompts } : {}),
    ...(mergedScrolls.length ? { recommendedActions: mergedScrolls } : {}),
    ...(!mergedScrolls.length && recommendedActions ? { recommendedActions } : {}),
    ...(onboarding ? onboarding : {}),
    insight: {
      type: 'strategy',
      message:
        'Offline fallback is active — guidance is deterministic and roster-safe.',
    },
  }
}

