import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'

export type SupervisorAssignmentRow = {
  assignment_id: string
  assignee_profile_id: string
  status: string
  assigned_at: string
  due_at: string | null
  completed_at: string | null
  title: string
  task_type: string
  template_key: string
}

/** Tasks visible to the signed-in supervisor (RLS + view). */
export async function fetchSupervisorTeamAssignments(): Promise<
  SupervisorAssignmentRow[]
> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('volunteer_supervisor_task_assignments_v')
    .select(
      'assignment_id, assignee_profile_id, status, assigned_at, due_at, completed_at, title, task_type, template_key',
    )
    .order('assigned_at', { ascending: false })
    .limit(80)

  if (error) {
    console.warn('supervisor assignments:', error.message)
    return []
  }
  return (data ?? []) as SupervisorAssignmentRow[]
}

export async function supervisorReassignTask(
  assignmentId: string,
  newAssigneeProfileId: string,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_supervisor_reassign', {
    p_assignment_id: assignmentId,
    p_new_assignee_profile: newAssigneeProfileId,
  })
  if (error) {
    console.warn('volunteer_supervisor_reassign:', error.message)
    return false
  }
  return true
}

export async function supervisorBlockTask(
  assignmentId: string,
  reason?: string | null,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_supervisor_set_blocked', {
    p_assignment_id: assignmentId,
    p_reason: reason ?? null,
  })
  if (error) {
    console.warn('volunteer_supervisor_set_blocked:', error.message)
    return false
  }
  return true
}

export async function supervisorNudgeTask(assignmentId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_supervisor_nudge', {
    p_assignment_id: assignmentId,
  })
  if (error) {
    console.warn('volunteer_supervisor_nudge:', error.message)
    return false
  }
  return true
}

export function completionRate(assignments: SupervisorAssignmentRow[]): number {
  const done = assignments.filter((a) => a.status === 'completed').length
  if (assignments.length === 0) return 0
  return Math.round((done / assignments.length) * 100)
}

export type VolunteerTaskTemplateOption = {
  template_key: string
  title: string
}

/** Active mission templates (coordinator dispatch). */
export async function fetchVolunteerTaskTemplateOptions(): Promise<
  VolunteerTaskTemplateOption[]
> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('volunteer_task_templates')
    .select('template_key, title')
    .eq('is_active', true)
    .order('title')

  if (error) {
    console.warn('volunteer_task_templates:', error.message)
    return []
  }
  return (data ?? []) as VolunteerTaskTemplateOption[]
}

/**
 * Enqueue a mission for a volunteer on a team you supervise.
 * Uses `volunteer_assign_task` (same authorization as other supervisor RPCs).
 */
export async function supervisorEnqueueMission(
  assigneeProfileId: string,
  templateKey: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (isDevAuthBypassEnabled()) {
    return { ok: false, error: 'Not available in dev bypass mode.' }
  }
  const id = assigneeProfileId.trim()
  const key = templateKey.trim()
  if (!id || !key) {
    return { ok: false, error: 'Assignee and template are required.' }
  }
  const { error } = await supabase.rpc('volunteer_assign_task', {
    p_assignee_profile_id: id,
    p_template_key: key,
  })
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}
