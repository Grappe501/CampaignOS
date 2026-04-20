import { useCallback, useEffect, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  claimVolunteerAssignment,
  completeVolunteerAssignment,
  declineVolunteerAssignment,
  saveVolunteerTaskChecklist,
  skipVolunteerAssignment,
  syncVolunteerTasksForProfile,
} from '../lib/taskEngine'
import { supabase } from '../lib/supabaseClient'
import { pointsForTaskType } from '../lib/taskScoring'
import type { AgentJonesVolunteerMissionContext } from '../lib/agentJonesContextV2'
import {
  parseWorkspaceSpec,
  type VolunteerTaskWorkspaceSpec,
} from '../lib/volunteerTaskWorkspace'

export type VolunteerTaskRow = {
  id: string
  task_id: string
  status: string
  assigned_at: string
  due_at: string | null
  claimed_at: string | null
  checklist_progress: Record<string, boolean>
  template_key: string
  title: string
  description: string | null
  task_type: string
  priority: string
  estimated_minutes: number
  workspace_spec: VolunteerTaskWorkspaceSpec
}

export type VolunteerEngagementRow = {
  points_total: number
  engagement_readiness: number
  streak_active_days: number
  streak_completion_days: number
}

const ACTIVE = ['assigned', 'in_progress', 'blocked'] as const

function dueStatsFromActive(active: VolunteerTaskRow[]): {
  next_assignment_due_at: string | null
  assignments_due_within_7d_count: number
} {
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  let count = 0
  const scored: { row: VolunteerTaskRow; ms: number }[] = []
  for (const t of active) {
    if (!t.due_at || !String(t.due_at).trim()) continue
    const ms = new Date(t.due_at).getTime()
    if (!Number.isFinite(ms)) continue
    if (ms <= now + weekMs) count++
    scored.push({ row: t, ms })
  }
  scored.sort((a, b) => a.ms - b.ms)
  const first = scored[0]?.row ?? null
  return {
    next_assignment_due_at: first?.due_at
      ? String(first.due_at).trim().slice(0, 40)
      : null,
    assignments_due_within_7d_count: count,
  }
}

function normalizeChecklist(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && k.length <= 96 && v === true) out[k] = true
  }
  return out
}

function mapAssignmentRow(r: {
  id: string
  task_id: string
  status: string
  assigned_at: string
  due_at: string | null
  claimed_at: string | null
  checklist_progress: unknown
  template_key: string
  volunteer_tasks: {
    id: string
    title: string
    description: string | null
    task_type: string
    priority: string
    estimated_minutes: number
    workspace_spec: unknown
  } | null
}): VolunteerTaskRow | null {
  const t = r.volunteer_tasks
  if (!t?.title) return null
  return {
    id: r.id,
    task_id: r.task_id,
    status: r.status,
    assigned_at: r.assigned_at,
    due_at: r.due_at,
    claimed_at: r.claimed_at,
    checklist_progress: normalizeChecklist(r.checklist_progress),
    template_key: r.template_key,
    title: t.title,
    description: t.description,
    task_type: t.task_type,
    priority: t.priority,
    estimated_minutes: t.estimated_minutes,
    workspace_spec: parseWorkspaceSpec(t.workspace_spec),
  }
}

export function useVolunteerTasks(campaignProfileId: string | undefined) {
  const [active, setActive] = useState<VolunteerTaskRow[]>([])
  const [recentDone, setRecentDone] = useState<
    { id: string; title: string; completed_at: string }[]
  >([])
  const [engagement, setEngagement] = useState<VolunteerEngagementRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setActive([])
      setRecentDone([])
      setEngagement(null)
      setLoading(false)
      setError(null)
      return
    }
    if (!campaignProfileId) {
      setActive([])
      setRecentDone([])
      setEngagement(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    await syncVolunteerTasksForProfile(campaignProfileId)

    const [aRes, rRes, eRes] = await Promise.all([
      supabase
        .from('volunteer_task_assignments')
        .select(
          `id, task_id, status, assigned_at, due_at, claimed_at, checklist_progress, template_key,
           volunteer_tasks ( id, title, description, task_type, priority, estimated_minutes, workspace_spec )`,
        )
        .eq('assignee_profile_id', campaignProfileId)
        .in('status', [...ACTIVE])
        .order('assigned_at', { ascending: true })
        .limit(5),
      supabase
        .from('volunteer_task_assignments')
        .select('id, completed_at, volunteer_tasks ( title )')
        .eq('assignee_profile_id', campaignProfileId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(4),
      supabase
        .from('volunteer_engagement_scores')
        .select(
          'points_total, engagement_readiness, streak_active_days, streak_completion_days',
        )
        .eq('campaign_profile_id', campaignProfileId)
        .maybeSingle(),
    ])

    if (aRes.error) setError(aRes.error.message)
    const rows = (aRes.data ?? []) as Parameters<typeof mapAssignmentRow>[0][]
    setActive(
      rows.map(mapAssignmentRow).filter((x): x is VolunteerTaskRow => Boolean(x)),
    )

    const rr = (rRes.data ?? []) as {
      id: string
      completed_at: string
      volunteer_tasks: { title: string } | null
    }[]
    setRecentDone(
      rr
        .map((x) => ({
          id: x.id,
          title: x.volunteer_tasks?.title ?? 'Task',
          completed_at: x.completed_at,
        }))
        .filter((x) => x.completed_at),
    )

    if (eRes.data) {
      setEngagement(eRes.data as VolunteerEngagementRow)
    } else {
      setEngagement(null)
    }

    setLoading(false)
  }, [campaignProfileId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const claim = useCallback(
    async (assignmentId: string) => {
      const ok = await claimVolunteerAssignment(assignmentId)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const complete = useCallback(
    async (assignmentId: string, notes?: string | null) => {
      const ok = await completeVolunteerAssignment(assignmentId, notes)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const skip = useCallback(
    async (assignmentId: string) => {
      const ok = await skipVolunteerAssignment(assignmentId)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const decline = useCallback(
    async (assignmentId: string, reason?: string | null) => {
      const ok = await declineVolunteerAssignment(assignmentId, reason)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const saveChecklist = useCallback(
    async (assignmentId: string, progress: Record<string, boolean>) => {
      const ok = await saveVolunteerTaskChecklist(assignmentId, progress)
      if (ok) await load()
      return ok
    },
    [load],
  )

  const nextBest = active[0] ?? null
  const stalled = active.filter((t) => t.status === 'blocked')
  const dueStats = dueStatsFromActive(active)

  const agentMissionContext: AgentJonesVolunteerMissionContext = {
    active_summaries: active.slice(0, 3).map((t) => ({
      title: t.title,
      status: t.status,
      templateKey: t.template_key,
      why_points: pointsForTaskType(t.task_type),
    })),
    next_best_title: nextBest?.title ?? null,
    next_best_template_key: nextBest?.template_key ?? null,
    recent_completed: recentDone.slice(0, 3).map((x) => ({
      title: x.title,
      completed_at: x.completed_at,
    })),
    stalled_titles: stalled.map((t) => t.title),
    next_assignment_due_at: dueStats.next_assignment_due_at,
    assignments_due_within_7d_count: dueStats.assignments_due_within_7d_count,
    points: engagement?.points_total,
    streaks:
      engagement != null
        ? {
            active_days: engagement.streak_active_days,
            completion_days: engagement.streak_completion_days,
          }
        : undefined,
  }

  return {
    active,
    recentDone,
    stalled,
    engagement,
    loading,
    error,
    refetch: load,
    claim,
    complete,
    skip,
    decline,
    saveChecklist,
    nextBest,
    agentMissionContext,
  }
}
