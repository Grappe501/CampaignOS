import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import type { CampaignProfile } from '../hooks/useProfile'

export type VolunteerTaskTemplateKey =
  | 'onboarding_first_action'
  | 'onboarding_choose_direction'
  | 'onboarding_first_micro_commitment'
  | 'power5_identify_five'
  | 'power5_contact_first_person'
  | 'power5_follow_up_contact'
  | 'power5_invite_to_join'
  | 'training_complete_intro'
  | 'training_complete_lane'
  | 'event_attend_local'
  | 'event_host_small_gathering'
  | 'outreach_text_two_people'
  | 'outreach_call_one_person'

/** Server-side rules + caps; call after profile loads or major state changes. */
export async function syncVolunteerTasksForProfile(
  campaignProfileId: string,
): Promise<void> {
  if (isDevAuthBypassEnabled()) return
  const { error } = await supabase.rpc('volunteer_sync_tasks_for_profile', {
    p_profile_id: campaignProfileId,
  })
  if (error) console.warn('volunteer_sync_tasks_for_profile:', error.message)
}

export async function assignVolunteerTask(
  assigneeProfileId: string,
  templateKey: VolunteerTaskTemplateKey,
): Promise<string | null> {
  if (isDevAuthBypassEnabled()) return null
  const { data, error } = await supabase.rpc('volunteer_assign_task', {
    p_assignee_profile_id: assigneeProfileId,
    p_template_key: templateKey,
  })
  if (error) {
    console.warn('volunteer_assign_task:', error.message)
    return null
  }
  return typeof data === 'string' ? data : null
}

export async function completeVolunteerAssignment(
  assignmentId: string,
  notes?: string | null,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_assignment_complete', {
    p_assignment_id: assignmentId,
    p_notes: notes ?? null,
  })
  if (error) {
    console.warn('volunteer_assignment_complete:', error.message)
    return false
  }
  return true
}

/** Claim task for tracking (sets in_progress + claimed_at + audit). */
export async function claimVolunteerAssignment(assignmentId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_assignment_mark_started', {
    p_assignment_id: assignmentId,
  })
  if (error) {
    console.warn('volunteer_assignment_mark_started:', error.message)
    return false
  }
  return true
}

export async function saveVolunteerTaskChecklist(
  assignmentId: string,
  progress: Record<string, boolean>,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_assignment_save_checklist', {
    p_assignment_id: assignmentId,
    p_progress: progress,
  })
  if (error) {
    console.warn('volunteer_assignment_save_checklist:', error.message)
    return false
  }
  return true
}

/** Intern (or assignee) declines — triggers reassignment when linked to intern pipeline. */
export async function declineVolunteerAssignment(
  assignmentId: string,
  reason?: string | null,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_assignment_decline', {
    p_assignment_id: assignmentId,
    p_reason: reason ?? null,
  })
  if (error) {
    console.warn('volunteer_assignment_decline:', error.message)
    return false
  }
  return true
}

export async function skipVolunteerAssignment(assignmentId: string): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('volunteer_assignment_skip', {
    p_assignment_id: assignmentId,
  })
  if (error) {
    console.warn('volunteer_assignment_skip:', error.message)
    return false
  }
  return true
}

/**
 * Lightweight client-side hints (deterministic). Server enqueue still enforces caps and dedupe.
 */
export function getRecommendedTaskTemplateKeys(input: {
  profile: CampaignProfile | null
  nodeCount: number
}): VolunteerTaskTemplateKey[] {
  const { profile, nodeCount } = input
  if (!profile?.id) return []
  const m = String(profile.onboarding_momentum_state ?? 'new')
    .trim()
    .toLowerCase()
  const dir = String(profile.onboarding_direction_key ?? '').trim()
  const micro = String(profile.onboarding_micro_commitment_key ?? '').trim()
  const out: VolunteerTaskTemplateKey[] = []

  if (m === 'new' || (m === 'exploring' && !dir)) {
    out.push('onboarding_choose_direction')
  }
  if (dir && !micro && (m === 'exploring' || m === 'committed')) {
    out.push('onboarding_first_micro_commitment')
  }
  if (profile.linked_voter_id && nodeCount === 0) {
    out.push('power5_identify_five')
  }
  if (nodeCount > 0) {
    out.push('power5_contact_first_person')
  }
  return out
}
