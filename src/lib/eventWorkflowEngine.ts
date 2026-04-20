/**
 * Event workflow orchestration — milestones, task DAG, progress, and blockers.
 * Composes template config (`event-types.config`) with executable task instances (`eventTaskTemplateConfig`).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import type { DomainEventTaskTemplate, EventWorkflowPhase } from './campaignEventDomain'
import { EVENT_WORKFLOW_PHASES } from './campaignEventDomain'
import { getEventTypeTemplate } from './event-types.config'
import {
  type EventTaskInstance,
  type EventTaskInstanceBuildInput,
  buildEventTaskInstances,
} from './eventTaskTemplateConfig'

export type WorkflowTaskState = 'pending' | 'blocked' | 'in_progress' | 'completed' | 'skipped'

export type EventWorkflowTask = {
  id: string
  slug: string
  title: string
  phase: EventWorkflowPhase
  critical: boolean
  dueAtIso: string | null
  ownerRole: string
  dependsOn: string[]
  state: WorkflowTaskState
  source: 'template_blueprint' | 'type_config'
}

export type TaskDependency = { fromSlug: string; toSlug: string }

export type EventMilestone = {
  phase: EventWorkflowPhase
  label: string
  complete: boolean
  taskCount: number
  completedCount: number
}

export type EventWorkflowRun = {
  eventId: string
  eventType: CampaignEventTypeKey
  startAtIso: string
  milestones: EventMilestone[]
  tasks: EventWorkflowTask[]
  dependencies: TaskDependency[]
  generatedAtIso: string
}

function mergeTasks(
  eventId: string,
  startAtIso: string,
  instances: EventTaskInstance[],
  blueprints: readonly DomainEventTaskTemplate[],
): EventWorkflowTask[] {
  const bySlug = new Map<string, EventWorkflowTask>()

  for (const bp of blueprints) {
    const id = `${eventId}::bp::${bp.slug}`
    bySlug.set(bp.slug, {
      id,
      slug: bp.slug,
      title: bp.title,
      phase: bp.phase,
      critical: bp.required,
      dueAtIso: dueIsoFromEventStart(startAtIso, bp.dueOffsetDaysFromEvent),
      ownerRole: bp.ownerRoleHint,
      dependsOn: [...(bp.dependsOnSlugs ?? [])],
      state: 'pending',
      source: 'template_blueprint',
    })
  }

  for (const inst of instances) {
    const slug = inst.templateSlug
    const phase = inferPhaseFromStageSlug(inst.stage)
    const existing = bySlug.get(slug)
    if (existing) {
      existing.dueAtIso = inst.dueAtIso ?? existing.dueAtIso
      existing.ownerRole = inst.ownerRole
      existing.critical = existing.critical || inst.required
      existing.source = 'type_config'
      continue
    }
    bySlug.set(slug, {
      id: `${eventId}::cfg::${slug}`,
      slug,
      title: inst.title,
      phase,
      critical: inst.required,
      dueAtIso: inst.dueAtIso,
      ownerRole: inst.ownerRole,
      dependsOn: [...inst.dependencySlugs],
      state: 'pending',
      source: 'type_config',
    })
  }

  return [...bySlug.values()]
}

function dueIsoFromEventStart(startAtIso: string, offsetDays: number | null): string | null {
  if (offsetDays == null) return null
  const d = new Date(startAtIso)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString()
}

/** Map legacy stage slugs from task config to workflow phases. */
export function mapStageSlugToWorkflowPhase(stage: string): EventWorkflowPhase {
  switch (stage) {
    case 'request':
    case 'qualification':
      return 'strategy'
    case 'approval':
      return 'confirmation'
    case 'planning':
      return 'logistics'
    case 'staffing':
      return 'staffing'
    case 'promotion':
      return 'outreach'
    case 'execution':
      return 'day_of_execution'
    case 'followup':
      return 'post_event_followup'
    case 'archive':
      return 'intelligence_review'
    default:
      return 'setup'
  }
}

function inferPhaseFromStageSlug(stage: string): EventWorkflowPhase {
  return mapStageSlugToWorkflowPhase(stage)
}

function buildDependencies(tasks: EventWorkflowTask[]): TaskDependency[] {
  const out: TaskDependency[] = []
  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      if (tasks.some((x) => x.slug === dep)) {
        out.push({ fromSlug: dep, toSlug: t.slug })
      }
    }
  }
  return out
}

function applyBlocking(tasks: EventWorkflowTask[]): EventWorkflowTask[] {
  const completed = new Set(tasks.filter((t) => t.state === 'completed').map((t) => t.slug))
  return tasks.map((t) => {
    const blocked = t.dependsOn.some((d) => !completed.has(d))
    if (t.state === 'completed') return t
    if (blocked && t.state === 'pending') return { ...t, state: 'blocked' as const }
    if (blocked && t.state === 'in_progress') return { ...t, state: 'blocked' as const }
    return t
  })
}

function buildMilestones(tasks: EventWorkflowTask[]): EventMilestone[] {
  return EVENT_WORKFLOW_PHASES.map((phase) => {
    const inPhase = tasks.filter((t) => t.phase === phase)
    const done = inPhase.filter((t) => t.state === 'completed').length
    return {
      phase,
      label: phaseLabel(phase),
      complete: inPhase.length > 0 && done === inPhase.length,
      taskCount: inPhase.length,
      completedCount: done,
    }
  }).filter((m) => m.taskCount > 0)
}

function phaseLabel(phase: EventWorkflowPhase): string {
  return phase.replace(/_/g, ' ')
}

/**
 * Generate a workflow run from event type and schedule. Idempotent for same inputs (new generatedAt).
 */
export function createWorkflowForEvent(input: EventTaskInstanceBuildInput): EventWorkflowRun {
  const tpl = getEventTypeTemplate(input.event_type)
  const instances = buildEventTaskInstances(input)
  const tasks = mergeTasks(input.event_id, input.start_at, instances, tpl.defaultTasks)
  const withDep = buildDependencies(tasks)
  const applied = applyBlocking(tasks)
  return {
    eventId: input.event_id,
    eventType: input.event_type,
    startAtIso: input.start_at,
    milestones: buildMilestones(applied),
    tasks: applied,
    dependencies: withDep,
    generatedAtIso: new Date().toISOString(),
  }
}

export function regenerateWorkflow(
  previous: EventWorkflowRun,
  next: EventTaskInstanceBuildInput,
): EventWorkflowRun {
  const preserved = new Map(
    previous.tasks.filter((t) => t.state === 'completed').map((t) => [t.slug, t.state] as const),
  )
  const run = createWorkflowForEvent(next)
  const tasks = run.tasks.map((t) => {
    const st = preserved.get(t.slug)
    return st ? { ...t, state: st } : t
  })
  const applied = applyBlocking(tasks)
  return {
    ...run,
    tasks: applied,
    milestones: buildMilestones(applied),
    generatedAtIso: new Date().toISOString(),
  }
}

export function completeEventTask(run: EventWorkflowRun, slug: string): EventWorkflowRun {
  const tasks = run.tasks.map((t) =>
    t.slug === slug ? { ...t, state: 'completed' as const } : t,
  )
  const applied = applyBlocking(tasks)
  return {
    ...run,
    tasks: applied,
    milestones: buildMilestones(applied),
    generatedAtIso: new Date().toISOString(),
  }
}

export function getWorkflowProgress(run: EventWorkflowRun): {
  completed: number
  total: number
  percent: number
  byPhase: Record<string, { done: number; total: number }>
} {
  const total = run.tasks.length
  const completed = run.tasks.filter((t) => t.state === 'completed').length
  const byPhase: Record<string, { done: number; total: number }> = {}
  for (const t of run.tasks) {
    const k = t.phase
    if (!byPhase[k]) byPhase[k] = { done: 0, total: 0 }
    byPhase[k].total += 1
    if (t.state === 'completed') byPhase[k].done += 1
  }
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    byPhase,
  }
}

export function getBlockingIssues(run: EventWorkflowRun): string[] {
  const issues: string[] = []
  const blocked = run.tasks.filter((t) => t.state === 'blocked')
  if (blocked.length > 0) {
    issues.push(`${blocked.length} task(s) blocked by incomplete dependencies`)
  }
  const overdue = run.tasks.filter((t) => {
    if (t.state === 'completed' || !t.dueAtIso) return false
    return new Date(t.dueAtIso).getTime() < Date.now()
  })
  if (overdue.length > 0) issues.push(`${overdue.length} overdue task(s)`)
  return issues
}

/** Build workflow from a calendar row when type is known. */
export function createWorkflowForCalendarRecord(
  row: CampaignCalendarEventRecord,
  typeKey: CampaignEventTypeKey,
): EventWorkflowRun {
  return createWorkflowForEvent({
    event_id: row.event_id,
    start_at: row.start_at,
    event_type: typeKey,
  })
}
