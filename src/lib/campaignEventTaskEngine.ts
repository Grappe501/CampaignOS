/**
 * Task template engine by event type and stage (blueprint 05 — Part B).
 * Uses matrix `requiredTasks` and routes each line to a stage via lightweight heuristics.
 * Replace with explicit per-task metadata when the event table lands.
 */

import {
  CAMPAIGN_EVENT_STAGES,
  type CampaignEventStage,
  type CampaignEventTypeKey,
  type EventCoordinatorOwnerRole,
  campaignEventTypeByKey,
} from './campaignEventTypeMatrix'

function norm(s: string): string {
  return s.toLowerCase()
}

/**
 * Infer workflow stage from free-text task titles in the type matrix.
 * Tuned for coordinator planning — adjust as templates gain structured keys.
 */
export function inferStageForTaskTitle(taskTitle: string): CampaignEventStage {
  const t = norm(taskTitle)

  if (
    /\bupload results\b/.test(t) ||
    /\breporting\b/.test(t) ||
    /\barchive\b/.test(t)
  ) {
    return 'reporting_archive'
  }

  if (
    /\bfollow[- ]?up\b/.test(t) ||
    /\bpost-event\b/.test(t) ||
    /\bpost event\b/.test(t) ||
    /\bnotes capture\b/.test(t) ||
    /\bnotes and commitments\b/.test(t) ||
    /\bdebrief\b/.test(t) ||
    /\breconciliation\b/.test(t) ||
    /\battendance capture\b/.test(t) ||
    /\battendee capture\b/.test(t) ||
    /\bsupporter follow-up\b/.test(t) ||
    /\bdonor follow-up\b/.test(t) ||
    /\bmedia and organizing follow-up\b/.test(t)
  ) {
    return 'follow_up'
  }

  if (
    /\bmobilize\b/.test(t) ||
    /\bdigital promotion\b/.test(t) ||
    /\bpress\b/.test(t) ||
    /\bcomms\b/.test(t) ||
    /\brsvp\b/.test(t) ||
    /\binvitation plan\b/.test(t) ||
    /\binvite\b/.test(t) ||
    /\breminder\b/.test(t) ||
    /\bpublic listing\b/.test(t) ||
    /\blisting\b/.test(t)
  ) {
    return 'promotion'
  }

  if (
    /\bstaffing\b/.test(t) ||
    /\bshift\b/.test(t) ||
    /\bassign shift\b/.test(t) ||
    /\bvolunteer\b/.test(t) ||
    /\bmatrix\b/.test(t) ||
    /\bcrowd\b/.test(t) ||
    /\bsign-in workflow\b/.test(t)
  ) {
    return 'staffing'
  }

  if (
    /\bapproval\b/.test(t) ||
    /\bfinance review\b/.test(t) ||
    /\bstrategic approval\b/.test(t) ||
    /\bevent approval\b/.test(t) ||
    /\bcompliance\b/.test(t)
  ) {
    return 'approval'
  }

  if (
    /\bintake\b/.test(t) ||
    /\brequest\b/.test(t) ||
    /\bsubmitted\b/.test(t) ||
    /\bobjective entered\b/.test(t) ||
    /\bmeeting objective\b/.test(t) ||
    /\bpurpose selected\b/.test(t) ||
    /\bqualification\b/.test(t)
  ) {
    return 'qualification'
  }

  if (
    /\bplan\b/.test(t) ||
    /\bmaterials\b/.test(t) ||
    /\breservation\b/.test(t) ||
    /\bvenue\b/.test(t) ||
    /\bconfirm\b/.test(t) ||
    /\bsecure\b/.test(t) ||
    /\bpermit\b/.test(t) ||
    /\bscript\b/.test(t) ||
    /\bremarks prep\b/.test(t) ||
    /\btalking points\b/.test(t) ||
    /\bbriefing\b/.test(t) ||
    /\btarget list\b/.test(t) ||
    /\bhandouts\b/.test(t) ||
    /\bliterature\b/.test(t) ||
    /\bsignage\b/.test(t) ||
    /\baudio\b/.test(t) ||
    /\bstage\b/.test(t) ||
    /\bsecurity\b/.test(t) ||
    /\bcoordination\b/.test(t)
  ) {
    return 'planning'
  }

  return 'planning'
}

/** Pass 2 — structured template row (no completion state; UI shows checklist only). */
export type EventStructuredTaskTemplate = {
  task_key: string
  task_title: string
  event_stage: CampaignEventStage
  owner_role: EventCoordinatorOwnerRole
  due_offset_from_event: string | null
  depends_on_task_key: string | null
  required: boolean
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
}

function inferOwnerRoleForTaskTitle(taskTitle: string): EventCoordinatorOwnerRole {
  const t = norm(taskTitle)
  if (/\bfinance\b/.test(t) || /\bcompliance\b/.test(t) || /\bdonation\b/.test(t)) {
    return 'finance_lead'
  }
  if (/\bhost\b/.test(t) || /\bvenue\b|\bhome\b/.test(t)) {
    return 'host'
  }
  if (/\bcounty\b/.test(t)) {
    return 'county_lead'
  }
  if (/\bpress\b/.test(t) || /\bcomms\b/.test(t) || /\bdigital\b/.test(t)) {
    return 'communications_lead'
  }
  if (/\bvolunteer\b/.test(t)) {
    return 'volunteer_coordinator'
  }
  if (/\bcandidate\b/.test(t) || /\bscheduler\b/.test(t)) {
    return 'candidate_scheduler'
  }
  return 'event_coordinator'
}

function dueOffsetForTaskIndex(index: number, total: number): string | null {
  if (index === 0) return '-21d'
  if (index < Math.ceil(total / 3)) return '-14d'
  if (index < total - 2) return '-7d'
  if (index === total - 1) return '+1d'
  return '0'
}

/**
 * Deterministic templates: stage from heuristics, owner from heuristics, lightweight due offsets,
 * linear dependency chain for ordering (not enforcement).
 */
export function buildStructuredTaskTemplatesForType(
  typeKey: CampaignEventTypeKey,
): EventStructuredTaskTemplate[] {
  const def = campaignEventTypeByKey(typeKey)
  if (!def) return []

  return def.requiredTasks.map((title, index) => {
    const slug = slugifyTitle(title) || 'task'
    const task_key = `${typeKey}__${index}__${slug}`
    const prevKey =
      index > 0
        ? `${typeKey}__${index - 1}__${slugifyTitle(def.requiredTasks[index - 1]!) || 'task'}`
        : null
    return {
      task_key,
      task_title: title,
      event_stage: inferStageForTaskTitle(title),
      owner_role: inferOwnerRoleForTaskTitle(title),
      due_offset_from_event: dueOffsetForTaskIndex(index, def.requiredTasks.length),
      depends_on_task_key: prevKey,
      required: true,
    }
  })
}

export function getRequiredStagesForEventType(typeKey: CampaignEventTypeKey): CampaignEventStage[] {
  const tasks = buildStructuredTaskTemplatesForType(typeKey)
  return CAMPAIGN_EVENT_STAGES.filter((s) => tasks.some((t) => t.event_stage === s))
}

export function orderedStructuredChecklistForEventType(typeKey: CampaignEventTypeKey): {
  stage: CampaignEventStage
  tasks: EventStructuredTaskTemplate[]
}[] {
  const tasks = buildStructuredTaskTemplatesForType(typeKey)
  return CAMPAIGN_EVENT_STAGES.map((stage) => ({
    stage,
    tasks: tasks.filter((t) => t.event_stage === stage),
  })).filter((b) => b.tasks.length > 0)
}

export function groupTasksByStageForType(
  typeKey: CampaignEventTypeKey,
): Record<CampaignEventStage, string[]> {
  const empty = Object.fromEntries(
    CAMPAIGN_EVENT_STAGES.map((s) => [s, [] as string[]]),
  ) as Record<CampaignEventStage, string[]>

  const def = campaignEventTypeByKey(typeKey)
  if (!def) return empty

  for (const task of def.requiredTasks) {
    const stage = inferStageForTaskTitle(task)
    empty[stage].push(task)
  }
  return empty
}

export function tasksForEventTypeAndStage(
  typeKey: CampaignEventTypeKey,
  stage: CampaignEventStage,
): readonly string[] {
  return groupTasksByStageForType(typeKey)[stage] ?? []
}

/** Flat ordered checklist: stages in pipeline order, tasks within each stage. */
export function orderedChecklistForEventType(typeKey: CampaignEventTypeKey): {
  stage: CampaignEventStage
  tasks: string[]
}[] {
  const grouped = groupTasksByStageForType(typeKey)
  return CAMPAIGN_EVENT_STAGES.map((stage) => ({
    stage,
    tasks: grouped[stage] ?? [],
  })).filter((b) => b.tasks.length > 0)
}
