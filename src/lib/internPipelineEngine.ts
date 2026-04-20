import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'

export type ContactMethod = 'call' | 'text' | 'email'
export type ContactOutcome = 'no_answer' | 'left_message' | 'spoke' | 'scheduled_followup'

export async function assignVolunteerToIntern(
  volunteerProfileId: string,
  internProfileId: string,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('intern_assign_volunteer_to_intern', {
    p_volunteer: volunteerProfileId,
    p_intern: internProfileId,
  })
  if (error) {
    console.warn('intern_assign_volunteer_to_intern:', error.message)
    return false
  }
  return true
}

export async function logContactAttempt(
  pipelineId: string,
  contactMethod: ContactMethod,
  outcome: ContactOutcome,
  notes?: string | null,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('intern_log_contact_attempt', {
    p_pipeline_id: pipelineId,
    p_contact_method: contactMethod,
    p_outcome: outcome,
    p_notes: notes ?? null,
  })
  if (error) {
    console.warn('intern_log_contact_attempt:', error.message)
    return false
  }
  return true
}

export async function evaluatePipelineStatus(pipelineId: string): Promise<Record<string, unknown> | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('intern_evaluate_pipeline', {
    p_pipeline_id: pipelineId,
  })
  if (error) {
    console.warn('intern_evaluate_pipeline:', error.message)
    return null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}

export async function evaluateAllPipelinesForActor(): Promise<number | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('intern_evaluate_all_for_actor')
  if (error) {
    console.warn('intern_evaluate_all_for_actor:', error.message)
    return null
  }
  return typeof data === 'number' ? data : null
}

export async function reassignVolunteer(pipelineId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('intern_reassign_pipeline', {
    p_pipeline_id: pipelineId,
  })
  if (error) {
    console.warn('intern_reassign_pipeline:', error.message)
    return false
  }
  return true
}

export async function escalateVolunteer(pipelineId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('intern_escalate_pipeline', {
    p_pipeline_id: pipelineId,
  })
  if (error) {
    console.warn('intern_escalate_pipeline:', error.message)
    return false
  }
  return true
}

export async function markPipelinePlaced(pipelineId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('intern_mark_pipeline_placed', {
    p_pipeline_id: pipelineId,
  })
  if (error) {
    console.warn('intern_mark_pipeline_placed:', error.message)
    return false
  }
  return true
}

export async function ensureInternDailyLeadership(internProfileId: string): Promise<string | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('intern_ensure_daily_leadership', {
    p_intern: internProfileId,
  })
  if (error) {
    console.warn('intern_ensure_daily_leadership:', error.message)
    return null
  }
  return typeof data === 'string' ? data : null
}

export async function fetchSupervisorInternOverview(
  power5TeamId: string,
): Promise<Record<string, unknown> | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('supervisor_intern_overview', {
    p_team_id: power5TeamId,
  })
  if (error) {
    console.warn('supervisor_intern_overview:', error.message)
    return null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}
