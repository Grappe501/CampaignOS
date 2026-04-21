/**
 * Pure metrics + bounded Agent Jones / leadership rollups for volunteer throughput.
 */

import type { ShiftCoverageRow } from './volunteerCommandCoverage'
import type {
  VolunteerAssignment,
  VolunteerAssignmentReminder,
  VolunteerProfile,
  VolunteerReliabilitySummary,
  VolunteerReminderQueueItem,
} from './volunteerCommandDomain'
import type { AgentJonesVolunteerThroughputContext } from './agentJonesContextV2'
import {
  mapAssignmentToThroughputStage,
  mapOnboardingToThroughputStage,
  type VolunteerThroughputStage,
} from './volunteerThroughputDomain'

const STAGES: VolunteerThroughputStage[] = [
  'discovered',
  'invited',
  'interested',
  'opted_in',
  'eligible',
  'recommended',
  'claimed',
  'assigned',
  'reminded',
  'engaged',
  'completed',
  'followed_up',
  'dropped',
  'no_show',
  'cooling_off',
]

function emptyStageCounts(): Record<VolunteerThroughputStage, number> {
  const o = {} as Record<VolunteerThroughputStage, number>
  for (const s of STAGES) o[s] = 0
  return o
}

/** Higher = further along the throughput funnel (for picking one primary bucket per person). */
function stageRank(stage: VolunteerThroughputStage): number {
  const rank: Record<VolunteerThroughputStage, number> = {
    discovered: 10,
    invited: 20,
    interested: 30,
    cooling_off: 32,
    dropped: 35,
    opted_in: 40,
    eligible: 45,
    recommended: 50,
    claimed: 60,
    assigned: 65,
    reminded: 68,
    engaged: 75,
    completed: 85,
    followed_up: 90,
    no_show: 82,
  }
  return rank[stage] ?? 0
}

export function primaryThroughputStageForVolunteer(
  v: VolunteerProfile,
  theirAssignments: readonly VolunteerAssignment[],
): VolunteerThroughputStage {
  let best = mapOnboardingToThroughputStage(v.onboardingStatus, v.activeStatus)
  let bestR = stageRank(best)
  for (const a of theirAssignments) {
    if (a.volunteerId !== v.id) continue
    const m = mapAssignmentToThroughputStage(a.status, {
      noShow: a.noShow,
      checkedIn: a.checkedInAt != null,
    })
    const r = stageRank(m)
    if (r > bestR) {
      best = m
      bestR = r
    }
  }
  return best
}

export type VolunteerThroughputPipelineCounts = Record<VolunteerThroughputStage, number>

/** Count volunteers by canonical onboarding→stage mapping. */
export function countVolunteersByThroughputStage(
  volunteers: readonly VolunteerProfile[],
): VolunteerThroughputPipelineCounts {
  const out = emptyStageCounts()
  for (const v of volunteers) {
    const st = mapOnboardingToThroughputStage(v.onboardingStatus, v.activeStatus)
    out[st] += 1
  }
  return out
}

/** One primary funnel bucket per volunteer (onboarding vs strongest assignment signal). */
export function mergeAssignmentStagesIntoPipeline(
  volunteers: readonly VolunteerProfile[],
  assignments: readonly VolunteerAssignment[],
): VolunteerThroughputPipelineCounts {
  const byVolunteer = new Map<string, VolunteerAssignment[]>()
  for (const a of assignments) {
    if (!a.volunteerId) continue
    const list = byVolunteer.get(a.volunteerId) ?? []
    list.push(a)
    byVolunteer.set(a.volunteerId, list)
  }
  const out = emptyStageCounts()
  for (const v of volunteers) {
    const list = byVolunteer.get(v.id) ?? []
    const stage = primaryThroughputStageForVolunteer(v, list)
    out[stage] += 1
  }
  return out
}

export type VolunteerThroughputRates = {
  acceptanceRate: number | null
  completionRate: number | null
  noShowRate: number | null
  /** Assigned / claimed that moved to completed vs declined/canceled/missed */
  fulfillmentRate: number | null
}

export function computeAssignmentRates(assignments: readonly VolunteerAssignment[]): VolunteerThroughputRates {
  const terminal = assignments.filter((a) =>
    ['completed', 'declined', 'missed', 'canceled'].includes(a.status),
  )
  const assignedish = assignments.filter((a) =>
    ['assigned', 'claimed', 'in_progress', 'completed', 'declined', 'missed', 'canceled'].includes(a.status),
  )
  const completed = assignments.filter((a) => a.status === 'completed').length
  const noShows = assignments.filter((a) => a.noShow || a.status === 'missed').length
  const claimed = assignments.filter((a) => ['claimed', 'in_progress', 'completed'].includes(a.status)).length
  const offered = assignments.filter((a) =>
    ['assigned', 'claimed', 'in_progress', 'completed', 'declined', 'missed'].includes(a.status),
  ).length

  return {
    acceptanceRate: offered > 0 ? claimed / offered : null,
    completionRate: terminal.length > 0 ? completed / terminal.length : null,
    noShowRate: assignedish.length > 0 ? noShows / assignedish.length : null,
    fulfillmentRate: terminal.length > 0 ? completed / terminal.length : null,
  }
}

export type VolunteerThroughputLeadershipRollup = {
  campaign_id: string
  pipeline_total: number
  active_ready_or_eligible: number
  open_assignment_slots: number
  urgent_staffing_gaps: number
  pending_reminder_entities: number
  reliability_category_mix: Record<string, number>
  bottleneck_headline: string | null
}

export function buildVolunteerThroughputLeadershipRollup(input: {
  campaignId: string
  volunteers: readonly VolunteerProfile[]
  assignments: readonly VolunteerAssignment[]
  coverageRows: readonly ShiftCoverageRow[]
  reminders: readonly VolunteerReminderQueueItem[]
  reliability: readonly VolunteerReliabilitySummary[]
}): VolunteerThroughputLeadershipRollup {
  const pipeline = mergeAssignmentStagesIntoPipeline(input.volunteers, input.assignments)
  const pipelineTotal = input.volunteers.length
  const activeReady = input.volunteers.filter(
    (v) =>
      (v.onboardingStatus === 'ready' || v.onboardingStatus === 'active') && v.activeStatus === 'active',
  ).length
  const openAssignmentSlots = input.assignments.filter((a) => a.status === 'open' && !a.volunteerId).length
  const urgentStaffingGaps = input.coverageRows.filter((r) => r.gap > 0 && r.atRisk).length
  const pendingReminders = input.reminders.filter((r) => r.status === 'pending' || r.status === 'sent').length

  const mix: Record<string, number> = {}
  for (const r of input.reliability) {
    const k = r.reliabilityCategory ?? 'unknown'
    mix[k] = (mix[k] ?? 0) + 1
  }

  const unfilled = openAssignmentSlots + urgentStaffingGaps
  let bottleneck: string | null = null
  if (urgentStaffingGaps > 0) {
    bottleneck = `${urgentStaffingGaps} urgent staffing gap(s) in the next 48h`
  } else if (unfilled > 0) {
    bottleneck = `${unfilled} open assignment / coverage slot(s)`
  } else if (pendingReminders > 5) {
    bottleneck = `${pendingReminders} reminders pending operational clearance`
  } else if (pipeline.eligible > pipeline.completed && pipeline.completed < 3) {
    bottleneck = 'Pipeline conversion toward completions is still ramping'
  }

  return {
    campaign_id: input.campaignId,
    pipeline_total: pipelineTotal,
    active_ready_or_eligible: activeReady,
    open_assignment_slots: openAssignmentSlots,
    urgent_staffing_gaps: urgentStaffingGaps,
    pending_reminder_entities: pendingReminders,
    reliability_category_mix: mix,
    bottleneck_headline: bottleneck,
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Bounded context for Agent Jones — no PII, counts and headlines only. */
export function buildAgentJonesVolunteerThroughputContext(input: {
  campaignId: string
  volunteers: readonly VolunteerProfile[]
  assignments: readonly VolunteerAssignment[]
  reliability: readonly VolunteerReliabilitySummary[]
  reminders: readonly VolunteerReminderQueueItem[]
  assignmentReminders: readonly VolunteerAssignmentReminder[]
  coverageRows: readonly ShiftCoverageRow[]
}): AgentJonesVolunteerThroughputContext {
  const pipeline = mergeAssignmentStagesIntoPipeline(input.volunteers, input.assignments)
  const rates = computeAssignmentRates(input.assignments)
  const leadership = buildVolunteerThroughputLeadershipRollup({
    campaignId: input.campaignId,
    volunteers: input.volunteers,
    assignments: input.assignments,
    coverageRows: input.coverageRows,
    reminders: input.reminders,
    reliability: input.reliability,
  })

  const interventions: string[] = []
  if (leadership.urgent_staffing_gaps > 0) {
    interventions.push('Staff near-term shifts before widening outreach')
  }
  if (leadership.open_assignment_slots > 0) {
    interventions.push('Fill open assignment rows or re-publish as opportunities')
  }
  if ((rates.noShowRate ?? 0) > 0.12) {
    interventions.push('No-show rate elevated — confirm reminders and check-in steps')
  }
  if (input.assignmentReminders.filter((r) => r.status === 'pending').length > 3) {
    interventions.push('Clear pending assignment reminder queue')
  }

  const keys: VolunteerThroughputStage[] = [
    'discovered',
    'invited',
    'interested',
    'opted_in',
    'eligible',
    'recommended',
    'claimed',
    'assigned',
    'reminded',
    'engaged',
    'completed',
    'followed_up',
    'dropped',
    'no_show',
    'cooling_off',
  ]
  const pipeline_counts: Record<string, number> = {}
  for (const k of keys) {
    pipeline_counts[k] = clamp(pipeline[k] ?? 0, 0, 50000)
  }

  return {
    campaign_id: input.campaignId,
    pipeline_counts,
    open_unassigned_assignments: clamp(leadership.open_assignment_slots, 0, 99999),
    urgent_coverage_gaps: clamp(leadership.urgent_staffing_gaps, 0, 99999),
    pending_reminder_rows: clamp(leadership.pending_reminder_entities, 0, 99999),
    acceptance_rate: rates.acceptanceRate != null ? clamp(rates.acceptanceRate, 0, 1) : null,
    completion_rate: rates.completionRate != null ? clamp(rates.completionRate, 0, 1) : null,
    no_show_rate: rates.noShowRate != null ? clamp(rates.noShowRate, 0, 1) : null,
    reliability_mix: {
      high_reliability: leadership.reliability_category_mix.high_reliability ?? 0,
      steady: leadership.reliability_category_mix.steady ?? 0,
      developing: leadership.reliability_category_mix.developing ?? 0,
      at_risk: leadership.reliability_category_mix.at_risk ?? 0,
      inactive: leadership.reliability_category_mix.inactive ?? 0,
    },
    bottleneck_headline: leadership.bottleneck_headline,
    recommended_interventions: interventions.slice(0, 5),
  }
}
