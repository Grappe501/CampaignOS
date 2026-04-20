import type {
  AgentJonesAreaScore,
  AgentJonesCalendarSummary,
  AgentJonesCampaignPhaseSummary,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesSegmentationSummary,
} from './agentJonesContextV2'
import { getCountdownParts, getCountdownUrgency } from './campaignClock'
import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'

function urgencyFromClock(
  u: ReturnType<typeof getCountdownUrgency>,
): NonNullable<AgentJonesCampaignPhaseSummary['urgency_level']> | null {
  if (u === 'h72' || u === 'd7') return 'critical'
  if (u === 'd30') return 'high'
  if (u === 'd90') return 'watch'
  if (u === 'closed') return null
  return 'watch'
}

function deriveCampaignMode(input: {
  days: number
  totalMs: number
  isPast: boolean
}): NonNullable<AgentJonesCampaignPhaseSummary['campaign_mode']> {
  if (input.isPast) return 'recovery'
  const MS_HOUR = 3_600_000
  if (input.totalMs <= 36 * MS_HOUR) return 'election_day'
  if (input.days <= 14) return 'gotv'
  if (input.days <= 40) return 'early_vote'
  if (input.days <= 90) return 'turnout_build'
  return 'persuasion'
}

export function buildAgentJonesCampaignPhaseSummary(input: {
  nowMs?: number
  calendarSummary: AgentJonesCalendarSummary | null
  segmentation: AgentJonesSegmentationSummary | undefined | null
  area_ranking: AgentJonesAreaScore[] | undefined | null
  leadershipSnapshot?: AgentJonesLeadershipSnapshotContext | null
}): AgentJonesCampaignPhaseSummary | null {
  const parts = getCountdownParts(input.nowMs ?? Date.now())
  const mode = deriveCampaignMode({
    days: parts.days,
    totalMs: parts.totalMs,
    isPast: parts.isPast,
  })
  const urg = urgencyFromClock(getCountdownUrgency(parts))

  const milestoneElection = 'Election Day (polls close CT)'
  let nextLabel = milestoneElection
  let daysToMilestone: number | null = parts.isPast ? 0 : parts.days

  const nd = input.calendarSummary?.next_deadline_at
  if (nd && !parts.isPast) {
    const t = Date.parse(nd)
    if (!Number.isNaN(t)) {
      const d = Math.ceil((t - (input.nowMs ?? Date.now())) / 86_400_000)
      if (d >= 0 && d < (daysToMilestone ?? 999)) {
        daysToMilestone = d
        nextLabel =
          input.calendarSummary?.next_deadline_title?.trim().slice(0, 120) ??
          'Next visible assignment deadline'
      }
    }
  }

  const ranked = input.area_ranking?.length
    ? sortAgentJonesAreaRanking(input.area_ranking)
    : []
  const recommended_focus_areas = ranked
    .filter((r) => r.priority_band === 'critical' || r.priority_band === 'high' || r.priority_band === 'watch')
    .map((r) => r.area_label)
    .slice(0, 4)

  const seg = input.segmentation?.primary_mode
  let mode_headline: string | null = null
  if (mode === 'gotv' || mode === 'election_day') {
    mode_headline =
      seg === 'persuasion'
        ? 'Late execution phase: visible signals favor turnout mobilization over new persuasion volume — stay within roster-safe context.'
        : 'Late execution phase: prioritize turnout lanes, staffing, and deadline discipline from visible boards.'
  } else if (mode === 'early_vote') {
    mode_headline =
      'Early-vote window (heuristic): shift energy toward ballot access, shifts, and coverage — timing layer is session-visible only.'
  } else if (mode === 'turnout_build') {
    mode_headline =
      'Turnout-build window: grow capacity and captains; keep persuasion where segmentation still shows mixed modes.'
  } else if (mode === 'recovery') {
    mode_headline = 'Election phase closed in this client clock — focus on thank-you, data hygiene, and honest wrap-up.'
  } else {
    mode_headline =
      'Persuasion-forward window: build narrative and capacity; avoid promising turnout precision absent from context.'
  }

  const ls = input.leadershipSnapshot
  if (ls && ls.weakest_kpi_name && (ls.weakest_kpi_pct_of_target ?? 100) < 50) {
    mode_headline = `${mode_headline} KPI strip: “${ls.weakest_kpi_name}” under half target — align HQ story before promising turnout scale.`
  }

  if (!mode_headline && !urg && !recommended_focus_areas.length && daysToMilestone == null) {
    return null
  }

  return {
    campaign_mode: mode,
    mode_headline,
    days_to_next_major_milestone: daysToMilestone,
    next_major_milestone_label: nextLabel,
    urgency_level: urg,
    ...(recommended_focus_areas.length ? { recommended_focus_areas } : {}),
  }
}
