/**
 * Supabase I/O for volunteer command tables.
 */

import { supabase } from './supabaseClient'
import type {
  AssignmentPriority,
  AssignmentStatus,
  OnboardingChecklistItemStatus,
  VolunteerAssignment,
  VolunteerAssignmentReminder,
  VolunteerInterest,
  VolunteerOnboardingChecklistItem,
  VolunteerProfile,
  VolunteerReliabilitySummary,
  VolunteerReminderQueueItem,
  VolunteerRoleDefinition,
  VolunteerShift,
  VolunteerShiftSlot,
  VolunteerSkill,
  VolunteerTrainingRecord,
} from './volunteerCommandDomain'
import {
  parseVolunteerOpportunityPreferenceProfile,
  toPreferenceProfileJson,
  type VolunteerOpportunityPreferenceProfile,
} from './volunteerRecommendationSchemas'

function mapVolunteer(row: Record<string, unknown>): VolunteerProfile {
  return {
    id: String(row.id ?? ''),
    campaignId: String(row.campaign_id ?? 'default'),
    profileId: String(row.profile_id ?? ''),
    displayName: row.display_name != null ? String(row.display_name) : null,
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    locationText: row.location_text != null ? String(row.location_text) : null,
    timezone: row.timezone != null ? String(row.timezone) : null,
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    transportation:
      row.transportation && typeof row.transportation === 'object'
        ? (row.transportation as Record<string, unknown>)
        : {},
    availability:
      row.availability && typeof row.availability === 'object'
        ? (row.availability as Record<string, unknown>)
        : {},
    preferredRoleSlugs: Array.isArray(row.preferred_role_slugs)
      ? (row.preferred_role_slugs as string[])
      : [],
    onboardingStatus: String(row.onboarding_status ?? 'new') as VolunteerProfile['onboardingStatus'],
    activeStatus: String(row.active_status ?? 'active') as VolunteerProfile['activeStatus'],
    reliabilityScore:
      row.reliability_score != null && row.reliability_score !== ''
        ? Number(row.reliability_score)
        : null,
    leadershipPotential:
      row.leadership_potential != null && row.leadership_potential !== ''
        ? Number(row.leadership_potential)
        : null,
    notesInternal: row.notes_internal != null ? String(row.notes_internal) : null,
    onboardingChecklist: Array.isArray(row.onboarding_checklist) ? row.onboarding_checklist : [],
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    onboardingStartedAt: row.onboarding_started_at != null ? String(row.onboarding_started_at) : null,
    onboardingCompletedAt:
      row.onboarding_completed_at != null ? String(row.onboarding_completed_at) : null,
    recommendationPreferences: parseVolunteerOpportunityPreferenceProfile(row.recommendation_preferences),
  }
}

function mapSkill(row: Record<string, unknown>): VolunteerSkill {
  return {
    id: String(row.id ?? ''),
    volunteerId: String(row.volunteer_id ?? ''),
    skillSlug: String(row.skill_slug ?? ''),
    proficiency: String(row.proficiency ?? 'intermediate') as VolunteerSkill['proficiency'],
    createdAt: String(row.created_at ?? ''),
  }
}

function mapInterest(row: Record<string, unknown>): VolunteerInterest {
  return {
    id: String(row.id ?? ''),
    volunteerId: String(row.volunteer_id ?? ''),
    interestSlug: String(row.interest_slug ?? ''),
    weight: Number(row.weight ?? 1),
    createdAt: String(row.created_at ?? ''),
  }
}

function mapRole(row: Record<string, unknown>): VolunteerRoleDefinition {
  return {
    roleSlug: String(row.role_slug ?? ''),
    label: String(row.label ?? ''),
    description: row.description != null ? String(row.description) : null,
    requiredSkillSlugs: Array.isArray(row.required_skill_slugs)
      ? (row.required_skill_slugs as string[])
      : [],
    preferredSkillSlugs: Array.isArray(row.preferred_skill_slugs)
      ? (row.preferred_skill_slugs as string[])
      : [],
    trainingRequirements: Array.isArray(row.training_requirements)
      ? (row.training_requirements as string[])
      : [],
    defaultChecklist: Array.isArray(row.default_checklist) ? row.default_checklist : [],
    maxConcurrentAssignments: Number(row.max_concurrent_assignments ?? 3),
    supervisorType: String(row.supervisor_type ?? 'coordinator') as VolunteerRoleDefinition['supervisorType'],
    isActive: row.is_active !== false,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapAssignment(row: Record<string, unknown>): VolunteerAssignment {
  return {
    id: String(row.id ?? ''),
    campaignId: String(row.campaign_id ?? 'default'),
    volunteerId: row.volunteer_id != null ? String(row.volunteer_id) : null,
    roleSlug: String(row.role_slug ?? ''),
    taskId: row.task_id != null ? String(row.task_id) : null,
    eventId: row.event_id != null ? String(row.event_id) : null,
    shiftId: row.shift_id != null ? String(row.shift_id) : null,
    shiftSlotId: row.shift_slot_id != null ? String(row.shift_slot_id) : null,
    assignedBy: row.assigned_by != null ? String(row.assigned_by) : null,
    assignedAt: String(row.assigned_at ?? ''),
    claimedAt: row.claimed_at != null ? String(row.claimed_at) : null,
    dueAt: row.due_at != null ? String(row.due_at) : null,
    status: String(row.status ?? 'open') as AssignmentStatus,
    priority: String(row.priority ?? 'medium') as AssignmentPriority,
    checklistProgress:
      row.checklist_progress && typeof row.checklist_progress === 'object'
        ? (row.checklist_progress as Record<string, unknown>)
        : {},
    completionNotes: row.completion_notes != null ? String(row.completion_notes) : null,
    declined: Boolean(row.declined),
    declineReason: row.decline_reason != null ? String(row.decline_reason) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    backupOfAssignmentId:
      row.backup_of_assignment_id != null ? String(row.backup_of_assignment_id) : null,
    checkedInAt: row.checked_in_at != null ? String(row.checked_in_at) : null,
    checkedOutAt: row.checked_out_at != null ? String(row.checked_out_at) : null,
    noShow: Boolean(row.no_show),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    escalationState: row.escalation_state != null ? String(row.escalation_state) : null,
  }
}

function mapShift(row: Record<string, unknown>): VolunteerShift {
  return {
    id: String(row.id ?? ''),
    campaignId: String(row.campaign_id ?? 'default'),
    title: String(row.title ?? ''),
    locationText: row.location_text != null ? String(row.location_text) : null,
    startsAt: String(row.starts_at ?? ''),
    endsAt: String(row.ends_at ?? ''),
    supervisorProfileId: row.supervisor_profile_id != null ? String(row.supervisor_profile_id) : null,
    eventId: row.event_id != null ? String(row.event_id) : null,
    notes: row.notes != null ? String(row.notes) : null,
    status: String(row.status ?? 'draft') as VolunteerShift['status'],
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapSlot(row: Record<string, unknown>): VolunteerShiftSlot {
  return {
    id: String(row.id ?? ''),
    shiftId: String(row.shift_id ?? ''),
    roleSlug: String(row.role_slug ?? ''),
    sortOrder: Number(row.sort_order ?? 0),
    slotsNeeded: Number(row.slots_needed ?? 1),
    backupSlots: Number(row.backup_slots ?? 0),
    createdAt: String(row.created_at ?? ''),
  }
}

function mapTraining(row: Record<string, unknown>): VolunteerTrainingRecord {
  return {
    id: String(row.id ?? ''),
    volunteerId: String(row.volunteer_id ?? ''),
    trainingKey: String(row.training_key ?? ''),
    status: String(row.status ?? 'not_started') as VolunteerTrainingRecord['status'],
    proofUrl: row.proof_url != null ? String(row.proof_url) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    expiresAt: row.expires_at != null ? String(row.expires_at) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapReliability(row: Record<string, unknown>): VolunteerReliabilitySummary {
  return {
    volunteerId: String(row.volunteer_id ?? ''),
    assignmentClaimRate:
      row.assignment_claim_rate != null ? Number(row.assignment_claim_rate) : null,
    assignmentCompletionRate:
      row.assignment_completion_rate != null ? Number(row.assignment_completion_rate) : null,
    noShowRate: row.no_show_rate != null ? Number(row.no_show_rate) : null,
    avgResponseHours: row.avg_response_hours != null ? Number(row.avg_response_hours) : null,
    retentionScore: row.retention_score != null ? Number(row.retention_score) : null,
    activityRecencyDays:
      row.activity_recency_days != null ? Number(row.activity_recency_days) : null,
    reliabilityCategory: row.reliability_category != null
      ? (String(row.reliability_category) as VolunteerReliabilitySummary['reliabilityCategory'])
      : null,
    pipelineStage: row.pipeline_stage != null ? String(row.pipeline_stage) : null,
    leadershipSignals: Array.isArray(row.leadership_signals)
      ? (row.leadership_signals as string[])
      : [],
    lastComputedAt: String(row.last_computed_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapOnboardingChecklistItem(row: Record<string, unknown>): VolunteerOnboardingChecklistItem {
  return {
    id: String(row.id ?? ''),
    volunteerId: String(row.volunteer_id ?? ''),
    checklistSlug: String(row.checklist_slug ?? ''),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'pending') as OnboardingChecklistItemStatus,
    dueAt: row.due_at != null ? String(row.due_at) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    metadataJson:
      row.metadata_json && typeof row.metadata_json === 'object'
        ? (row.metadata_json as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapAssignmentReminderRow(row: Record<string, unknown>): VolunteerAssignmentReminder {
  return {
    id: String(row.id ?? ''),
    assignmentId: String(row.assignment_id ?? ''),
    reminderType: String(row.reminder_type ?? ''),
    scheduledFor: String(row.scheduled_for ?? ''),
    sentAt: row.sent_at != null ? String(row.sent_at) : null,
    status: String(row.status ?? 'pending'),
    escalationTarget: row.escalation_target != null ? String(row.escalation_target) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapReminder(row: Record<string, unknown>): VolunteerReminderQueueItem {
  return {
    id: String(row.id ?? ''),
    entityType: String(row.entity_type ?? 'assignment') as VolunteerReminderQueueItem['entityType'],
    entityId: String(row.entity_id ?? ''),
    reminderKind: String(row.reminder_kind ?? ''),
    dueAt: String(row.due_at ?? ''),
    status: String(row.status ?? 'pending') as VolunteerReminderQueueItem['status'],
    escalatedAt: row.escalated_at != null ? String(row.escalated_at) : null,
    teamLeadNotifiedAt: row.team_lead_notified_at != null ? String(row.team_lead_notified_at) : null,
    coordinatorNotifiedAt:
      row.coordinator_notified_at != null ? String(row.coordinator_notified_at) : null,
    clearedAt: row.cleared_at != null ? String(row.cleared_at) : null,
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at ?? ''),
  }
}

export async function fetchVolunteerRoleDefinitions(): Promise<VolunteerRoleDefinition[]> {
  const { data, error } = await supabase
    .from('volunteer_roles')
    .select('*')
    .eq('is_active', true)
    .order('label')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapRole(r as Record<string, unknown>))
}

export async function fetchVolunteerById(
  volunteerId: string,
): Promise<{ volunteer: VolunteerProfile | null; error: Error | null }> {
  const { data, error } = await supabase.from('volunteers').select('*').eq('id', volunteerId).maybeSingle()

  if (error) return { volunteer: null, error: new Error(error.message) }
  if (!data) return { volunteer: null, error: null }
  return { volunteer: mapVolunteer(data as Record<string, unknown>), error: null }
}

export async function fetchVolunteerByProfileId(
  profileId: string,
): Promise<{ volunteer: VolunteerProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) return { volunteer: null, error: new Error(error.message) }
  if (!data) return { volunteer: null, error: null }
  return { volunteer: mapVolunteer(data as Record<string, unknown>), error: null }
}

export async function fetchVolunteersForCampaign(
  campaignId = 'default',
): Promise<{ volunteers: VolunteerProfile[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false })

  if (error) return { volunteers: [], error: new Error(error.message) }
  return { volunteers: (data ?? []).map((r) => mapVolunteer(r as Record<string, unknown>)), error: null }
}

export async function fetchVolunteerSkills(volunteerId: string): Promise<VolunteerSkill[]> {
  const { data, error } = await supabase
    .from('volunteer_skills')
    .select('*')
    .eq('volunteer_id', volunteerId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapSkill(r as Record<string, unknown>))
}

/** Batch-load skills for many volunteers (one query). */
export async function fetchVolunteerSkillsBatch(volunteerIds: string[]): Promise<Map<string, VolunteerSkill[]>> {
  const out = new Map<string, VolunteerSkill[]>()
  if (!volunteerIds.length) return out
  const { data, error } = await supabase
    .from('volunteer_skills')
    .select('*')
    .in('volunteer_id', volunteerIds)

  if (error) throw new Error(error.message)
  for (const r of data ?? []) {
    const skill = mapSkill(r as Record<string, unknown>)
    const list = out.get(skill.volunteerId) ?? []
    list.push(skill)
    out.set(skill.volunteerId, list)
  }
  return out
}

export async function fetchOnboardingChecklistItems(
  volunteerId: string,
): Promise<VolunteerOnboardingChecklistItem[]> {
  const { data, error } = await supabase
    .from('volunteer_onboarding_checklist_items')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapOnboardingChecklistItem(r as Record<string, unknown>))
}

export async function upsertOnboardingChecklistItem(input: {
  volunteerId: string
  checklistSlug: string
  title: string
  status?: OnboardingChecklistItemStatus
  dueAt?: string | null
  completedAt?: string | null
  metadataJson?: Record<string, unknown>
}): Promise<{ error: Error | null }> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('volunteer_onboarding_checklist_items').upsert(
    {
      volunteer_id: input.volunteerId,
      checklist_slug: input.checklistSlug,
      title: input.title,
      status: input.status ?? 'pending',
      due_at: input.dueAt ?? null,
      completed_at: input.completedAt ?? null,
      metadata_json: input.metadataJson ?? {},
      updated_at: now,
    },
    { onConflict: 'volunteer_id,checklist_slug' },
  )
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchVolunteerInterests(volunteerId: string): Promise<VolunteerInterest[]> {
  const { data, error } = await supabase
    .from('volunteer_interests')
    .select('*')
    .eq('volunteer_id', volunteerId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapInterest(r as Record<string, unknown>))
}

export async function upsertVolunteerForProfile(input: {
  profileId: string
  campaignId?: string
  displayName?: string | null
  email?: string | null
}): Promise<{ volunteer: VolunteerProfile | null; error: Error | null }> {
  const campaignId = input.campaignId ?? 'default'
  const { data, error } = await supabase
    .from('volunteers')
    .upsert(
      {
        profile_id: input.profileId,
        campaign_id: campaignId,
        display_name: input.displayName ?? null,
        email: input.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    )
    .select('*')
    .single()

  if (error) return { volunteer: null, error: new Error(error.message) }
  return { volunteer: mapVolunteer(data as Record<string, unknown>), error: null }
}

export async function updateVolunteerRecommendationPreferences(
  volunteerId: string,
  prefs: VolunteerOpportunityPreferenceProfile,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('volunteers')
    .update({
      recommendation_preferences: toPreferenceProfileJson(prefs),
      updated_at: new Date().toISOString(),
    })
    .eq('id', volunteerId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function updateVolunteerStatus(
  volunteerId: string,
  patch: Partial<{
    onboardingStatus: VolunteerProfile['onboardingStatus']
    activeStatus: VolunteerProfile['activeStatus']
    notesInternal: string | null
  }>,
): Promise<{ error: Error | null }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.onboardingStatus != null) row.onboarding_status = patch.onboardingStatus
  if (patch.activeStatus != null) row.active_status = patch.activeStatus
  if (patch.notesInternal !== undefined) row.notes_internal = patch.notesInternal

  const { error } = await supabase.from('volunteers').update(row).eq('id', volunteerId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchAssignmentsForCampaign(
  campaignId = 'default',
): Promise<VolunteerAssignment[]> {
  const { data, error } = await supabase
    .from('volunteer_assignments')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapAssignment(r as Record<string, unknown>))
}

export async function fetchAssignmentsForVolunteer(
  volunteerId: string,
): Promise<VolunteerAssignment[]> {
  const { data, error } = await supabase
    .from('volunteer_assignments')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapAssignment(r as Record<string, unknown>))
}

export async function fetchOpenAssignments(campaignId = 'default'): Promise<VolunteerAssignment[]> {
  const { data, error } = await supabase
    .from('volunteer_assignments')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'open')
    .order('priority', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapAssignment(r as Record<string, unknown>))
}

export async function createAssignment(input: {
  campaignId?: string
  roleSlug: string
  volunteerId?: string | null
  eventId?: string | null
  shiftId?: string | null
  shiftSlotId?: string | null
  taskId?: string | null
  dueAt?: string | null
  priority?: AssignmentPriority
  status?: AssignmentStatus
  assignedBy?: string | null
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteer_assignments')
    .insert({
      campaign_id: input.campaignId ?? 'default',
      role_slug: input.roleSlug,
      volunteer_id: input.volunteerId ?? null,
      event_id: input.eventId ?? null,
      shift_id: input.shiftId ?? null,
      shift_slot_id: input.shiftSlotId ?? null,
      task_id: input.taskId ?? null,
      due_at: input.dueAt ?? null,
      priority: input.priority ?? 'medium',
      status: input.status ?? (input.volunteerId ? 'assigned' : 'open'),
      assigned_by: input.assignedBy ?? null,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: new Error(error.message) }
  return { id: data ? String((data as { id: string }).id) : null, error: null }
}

export async function claimAssignment(
  assignmentId: string,
  volunteerId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('volunteer_assignments')
    .update({
      volunteer_id: volunteerId,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .eq('status', 'open')
    .is('volunteer_id', null)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function updateAssignmentStatus(
  assignmentId: string,
  patch: Partial<{
    status: AssignmentStatus
    checklistProgress: Record<string, unknown>
    completionNotes: string | null
    declined: boolean
    declineReason: string | null
    completedAt: string | null
    checkedInAt: string | null
    checkedOutAt: string | null
    noShow: boolean
    escalationState: string | null
  }>,
): Promise<{ error: Error | null }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status != null) row.status = patch.status
  if (patch.checklistProgress != null) row.checklist_progress = patch.checklistProgress
  if (patch.completionNotes !== undefined) row.completion_notes = patch.completionNotes
  if (patch.declined != null) row.declined = patch.declined
  if (patch.declineReason !== undefined) row.decline_reason = patch.declineReason
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt
  if (patch.checkedInAt !== undefined) row.checked_in_at = patch.checkedInAt
  if (patch.checkedOutAt !== undefined) row.checked_out_at = patch.checkedOutAt
  if (patch.noShow != null) row.no_show = patch.noShow
  if (patch.escalationState !== undefined) row.escalation_state = patch.escalationState

  const { error } = await supabase.from('volunteer_assignments').update(row).eq('id', assignmentId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function reassignAssignment(
  assignmentId: string,
  newVolunteerId: string,
  assignedBy?: string | null,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('volunteer_assignments')
    .update({
      volunteer_id: newVolunteerId,
      status: 'assigned',
      assigned_by: assignedBy ?? null,
      claimed_at: null,
      declined: false,
      decline_reason: null,
      escalation_state: 'none',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function cancelAssignment(assignmentId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('volunteer_assignments')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function createVolunteerShift(input: {
  campaignId?: string
  title: string
  locationText?: string | null
  startsAt: string
  endsAt: string
  supervisorProfileId?: string | null
  eventId?: string | null
  notes?: string | null
  status?: VolunteerShift['status']
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteer_shifts')
    .insert({
      campaign_id: input.campaignId ?? 'default',
      title: input.title,
      location_text: input.locationText ?? null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      supervisor_profile_id: input.supervisorProfileId ?? null,
      event_id: input.eventId ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'draft',
    })
    .select('id')
    .single()

  if (error) return { id: null, error: new Error(error.message) }
  return { id: data ? String((data as { id: string }).id) : null, error: null }
}

export async function insertVolunteerShiftSlot(input: {
  shiftId: string
  roleSlug: string
  sortOrder?: number
  slotsNeeded?: number
  backupSlots?: number
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('volunteer_shift_slots')
    .insert({
      shift_id: input.shiftId,
      role_slug: input.roleSlug,
      sort_order: input.sortOrder ?? 0,
      slots_needed: input.slotsNeeded ?? 1,
      backup_slots: input.backupSlots ?? 0,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: new Error(error.message) }
  return { id: data ? String((data as { id: string }).id) : null, error: null }
}

export async function scheduleAssignmentReminder(input: {
  assignmentId: string
  reminderType: string
  scheduledFor: string
  escalationTarget?: string | null
}): Promise<{ id: string | null; error: Error | null }> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('volunteer_assignment_reminders')
    .insert({
      assignment_id: input.assignmentId,
      reminder_type: input.reminderType,
      scheduled_for: input.scheduledFor,
      escalation_target: input.escalationTarget ?? null,
      status: 'pending',
      updated_at: now,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: new Error(error.message) }
  return { id: data ? String((data as { id: string }).id) : null, error: null }
}

/** Pending reminders for assignments in this campaign (filters client-side by assignment ids). */
export async function fetchPendingAssignmentRemindersForCampaign(
  campaignId = 'default',
): Promise<VolunteerAssignmentReminder[]> {
  const assignments = await fetchAssignmentsForCampaign(campaignId)
  const idSet = new Set(assignments.map((a) => a.id))
  if (!idSet.size) return []

  const { data, error } = await supabase
    .from('volunteer_assignment_reminders')
    .select('*')
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })
    .limit(500)

  if (error) throw new Error(error.message)
  return (data ?? [])
    .filter((r) => idSet.has(String((r as { assignment_id: string }).assignment_id)))
    .map((r) => mapAssignmentReminderRow(r as Record<string, unknown>))
}

export async function fetchShiftsForCampaign(campaignId = 'default'): Promise<VolunteerShift[]> {
  const { data, error } = await supabase
    .from('volunteer_shifts')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('starts_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapShift(r as Record<string, unknown>))
}

export async function fetchShiftSlots(shiftId: string): Promise<VolunteerShiftSlot[]> {
  const { data, error } = await supabase
    .from('volunteer_shift_slots')
    .select('*')
    .eq('shift_id', shiftId)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapSlot(r as Record<string, unknown>))
}

export async function fetchTrainingForVolunteer(volunteerId: string): Promise<VolunteerTrainingRecord[]> {
  const { data, error } = await supabase
    .from('volunteer_training_records')
    .select('*')
    .eq('volunteer_id', volunteerId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapTraining(r as Record<string, unknown>))
}

export async function fetchReliabilitySummaries(
  campaignId = 'default',
): Promise<VolunteerReliabilitySummary[]> {
  const { data: vols, error: vErr } = await supabase
    .from('volunteers')
    .select('id')
    .eq('campaign_id', campaignId)

  if (vErr) throw new Error(vErr.message)
  const ids = (vols ?? []).map((v) => String((v as { id: string }).id))
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('volunteer_reliability_summaries')
    .select('*')
    .in('volunteer_id', ids)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapReliability(r as Record<string, unknown>))
}

export async function fetchReminderQueuePending(): Promise<VolunteerReminderQueueItem[]> {
  const { data, error } = await supabase
    .from('volunteer_reminder_queue')
    .select('*')
    .in('status', ['pending', 'sent'])
    .order('due_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapReminder(r as Record<string, unknown>))
}

export async function logVolunteerActivity(
  volunteerId: string,
  actionType: string,
  payload: Record<string, unknown>,
  actorProfileId?: string | null,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('volunteer_activity_log').insert({
    volunteer_id: volunteerId,
    action_type: actionType,
    actor_profile_id: actorProfileId ?? null,
    payload,
  })
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function bulkCreateOpenAssignments(
  rows: Array<{
    roleSlug: string
    campaignId?: string
    dueAt?: string | null
    priority?: AssignmentPriority
    eventId?: string | null
    shiftId?: string | null
  }>,
): Promise<{ error: Error | null }> {
  const insert = rows.map((r) => ({
    campaign_id: r.campaignId ?? 'default',
    role_slug: r.roleSlug,
    status: 'open' as const,
    volunteer_id: null,
    due_at: r.dueAt ?? null,
    priority: r.priority ?? 'medium',
    event_id: r.eventId ?? null,
    shift_id: r.shiftId ?? null,
  }))
  const { error } = await supabase.from('volunteer_assignments').insert(insert)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export { mapVolunteer, mapAssignment, mapShift }
