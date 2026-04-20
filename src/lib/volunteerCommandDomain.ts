/**
 * Volunteer Command System — shared domain types (maps to Supabase tables).
 */

import type { VolunteerOpportunityPreferenceProfile } from './volunteerRecommendationSchemas'

export type VolunteerOnboardingStatus =
  | 'new'
  | 'contacted'
  | 'onboarding'
  | 'ready'
  | 'active'
  | 'paused'
  | 'inactive'

export type VolunteerActiveStatus = 'active' | 'paused' | 'inactive'

export type SkillProficiency = 'novice' | 'intermediate' | 'advanced' | 'expert'

export type VolunteerSkill = {
  id: string
  volunteerId: string
  skillSlug: string
  proficiency: SkillProficiency
  createdAt: string
}

export type VolunteerInterest = {
  id: string
  volunteerId: string
  interestSlug: string
  weight: number
  createdAt: string
}

export type VolunteerRoleSupervisorType = 'coordinator' | 'team_lead' | 'self' | 'none'

export type VolunteerRoleDefinition = {
  roleSlug: string
  label: string
  description: string | null
  requiredSkillSlugs: string[]
  preferredSkillSlugs: string[]
  trainingRequirements: string[]
  defaultChecklist: unknown[]
  maxConcurrentAssignments: number
  supervisorType: VolunteerRoleSupervisorType
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type VolunteerProfile = {
  id: string
  campaignId: string
  profileId: string
  displayName: string | null
  email: string | null
  phone: string | null
  locationText: string | null
  timezone: string | null
  languages: string[]
  transportation: Record<string, unknown>
  availability: Record<string, unknown>
  preferredRoleSlugs: string[]
  onboardingStatus: VolunteerOnboardingStatus
  activeStatus: VolunteerActiveStatus
  reliabilityScore: number | null
  leadershipPotential: number | null
  notesInternal: string | null
  onboardingChecklist: unknown[]
  createdAt: string
  updatedAt: string
  onboardingStartedAt?: string | null
  onboardingCompletedAt?: string | null
  /** Joined for UI */
  skills?: VolunteerSkill[]
  interests?: VolunteerInterest[]
  /** Step 2.6 — marketplace / recommendation preferences (JSON on volunteers.recommendation_preferences). */
  recommendationPreferences?: VolunteerOpportunityPreferenceProfile
}

export type OnboardingChecklistItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export type VolunteerOnboardingChecklistItem = {
  id: string
  volunteerId: string
  checklistSlug: string
  title: string
  status: OnboardingChecklistItemStatus
  dueAt: string | null
  completedAt: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type AssignmentStatus =
  | 'open'
  | 'assigned'
  | 'claimed'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'missed'
  | 'canceled'

export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent'

export type VolunteerAssignment = {
  id: string
  campaignId: string
  volunteerId: string | null
  roleSlug: string
  taskId: string | null
  eventId: string | null
  shiftId: string | null
  shiftSlotId: string | null
  assignedBy: string | null
  assignedAt: string
  claimedAt: string | null
  dueAt: string | null
  status: AssignmentStatus
  priority: AssignmentPriority
  checklistProgress: Record<string, unknown>
  completionNotes: string | null
  declined: boolean
  declineReason: string | null
  completedAt: string | null
  backupOfAssignmentId: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  noShow: boolean
  createdAt: string
  updatedAt: string
  escalationState?: string | null
}

export type VolunteerShiftStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'canceled'

export type VolunteerShift = {
  id: string
  campaignId: string
  title: string
  locationText: string | null
  startsAt: string
  endsAt: string
  supervisorProfileId: string | null
  eventId: string | null
  notes: string | null
  status: VolunteerShiftStatus
  createdAt: string
  updatedAt: string
}

export type VolunteerShiftSlot = {
  id: string
  shiftId: string
  roleSlug: string
  sortOrder: number
  slotsNeeded: number
  backupSlots: number
  createdAt: string
}

export type VolunteerTrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'expired' | 'waived'

export type VolunteerTrainingRecord = {
  id: string
  volunteerId: string
  trainingKey: string
  status: VolunteerTrainingStatus
  proofUrl: string | null
  completedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type VolunteerActivityLog = {
  id: string
  volunteerId: string
  actionType: string
  actorProfileId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

export type ReliabilityCategory =
  | 'high_reliability'
  | 'steady'
  | 'developing'
  | 'at_risk'
  | 'inactive'

export type VolunteerReliabilitySummary = {
  volunteerId: string
  assignmentClaimRate: number | null
  assignmentCompletionRate: number | null
  noShowRate: number | null
  avgResponseHours: number | null
  retentionScore: number | null
  activityRecencyDays: number | null
  reliabilityCategory: ReliabilityCategory | null
  pipelineStage: string | null
  leadershipSignals: string[]
  lastComputedAt: string
  updatedAt: string
}

export type VolunteerAssignmentReminder = {
  id: string
  assignmentId: string
  reminderType: string
  scheduledFor: string
  sentAt: string | null
  status: string
  escalationTarget: string | null
  createdAt: string
  updatedAt: string
}

export type ReminderEntityType = 'assignment' | 'shift' | 'volunteer'

export type ReminderStatus = 'pending' | 'sent' | 'escalated' | 'cleared' | 'skipped'

export type VolunteerReminderQueueItem = {
  id: string
  entityType: ReminderEntityType
  entityId: string
  reminderKind: string
  dueAt: string
  status: ReminderStatus
  escalatedAt: string | null
  teamLeadNotifiedAt: string | null
  coordinatorNotifiedAt: string | null
  clearedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type VolunteerRecommendationReason = {
  code: string
  detail: string
  scoreImpact: number
}

export type VolunteerRecommendation = {
  volunteerId: string
  profileId: string
  displayLabel: string
  score: number
  reasons: VolunteerRecommendationReason[]
}
