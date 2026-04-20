/**
 * Deterministic fit decomposition for recommendations (explainable sub-scores).
 */

import type {
  VolunteerProfile,
  VolunteerRoleDefinition,
  VolunteerSkill,
  VolunteerTrainingRecord,
} from './volunteerCommandDomain'
import type { VolunteerOpportunity } from './volunteerOpportunityDomain'
import type { VolunteerOpportunityPreferenceProfile } from './volunteerRecommendationSchemas'
import { scoreOpportunityForVolunteer } from './volunteerOpportunityMatching'
import { getVolunteerOpportunityBaseScore } from './volunteerEligibilityService'
import { canVolunteerClaimOpportunity } from './volunteerOpportunityEligibility'

function hasTraining(keys: string[], training: VolunteerTrainingRecord[]): boolean {
  const done = new Set(training.filter((t) => t.status === 'completed').map((t) => t.trainingKey))
  return keys.every((k) => done.has(k))
}

function activeLoad(assignments: { status: string }[]): number {
  return assignments.filter((a) => ['assigned', 'claimed', 'in_progress'].includes(a.status)).length
}

export type FitDecomposition = {
  roleFit: number
  skillFit: number
  trainingFit: number
  availabilityFit: number
  geographyFit: number
  reliabilityFit: number
  preferenceFit: number
  loadFit: number
  recencyFit: number
  urgencyFit: number
  baseScore: number
}

export function calculateVolunteerOpportunityFit(input: {
  volunteer: VolunteerProfile
  skills: VolunteerSkill[]
  training: VolunteerTrainingRecord[]
  assignments: { status: string; roleSlug: string; completedAt?: string | null }[]
  prefs: VolunteerOpportunityPreferenceProfile
  opportunity: VolunteerOpportunity
  role: VolunteerRoleDefinition | null
}): FitDecomposition {
  const { volunteer, skills, training, assignments, prefs, opportunity, role } = input
  const summary = scoreOpportunityForVolunteer(volunteer, skills, opportunity)
  const skillSet = new Set(skills.map((s) => s.skillSlug))

  let roleFit = opportunity.roleSlug && volunteer.preferredRoleSlugs.includes(opportunity.roleSlug) ? 1 : 0.45
  if (opportunity.roleSlug && prefs.preferredRolesJson.includes(opportunity.roleSlug)) {
    roleFit = Math.min(1, roleFit + 0.25)
  }

  let skillFit = 0.4
  if (opportunity.roleSlug && skillSet.has(opportunity.roleSlug)) skillFit = 0.85
  const req = (opportunity.requiredSkillsJson as unknown[]).filter((x): x is string => typeof x === 'string')
  if (req.length && req.some((k) => skillSet.has(k))) skillFit = Math.min(1, skillFit + 0.2)

  const trainingKeys = [
    ...((opportunity.requiredTrainingJson as unknown[]).filter((x): x is string => typeof x === 'string') ?? []),
    ...(role?.trainingRequirements ?? []),
  ]
  const uniqTraining = [...new Set(trainingKeys)]
  let trainingFit = uniqTraining.length === 0 ? 1 : hasTraining(uniqTraining, training) ? 1 : 0.35

  const availabilityFit =
    volunteer.availability && Object.keys(volunteer.availability).length > 0 ? 0.75 : 0.55

  let geographyFit = 0.5
  if (volunteer.locationText && opportunity.locationLabel) {
    const a = volunteer.locationText.toLowerCase()
    const b = opportunity.locationLabel.toLowerCase()
    if (a.length > 2 && b.length > 2 && (a.includes(b.slice(0, 5)) || b.includes(a.slice(0, 5)))) {
      geographyFit = 0.9
    }
  }
  if (
    opportunity.regionLabel &&
    prefs.preferredRegionsJson.some((r) => r.toLowerCase() === opportunity.regionLabel?.toLowerCase())
  ) {
    geographyFit = Math.min(1, geographyFit + 0.15)
  }

  const rel = volunteer.reliabilityScore
  const reliabilityFit =
    rel == null ? 0.65 : Math.max(0, Math.min(1, rel / 100))

  let preferenceFit = 0.55
  if (prefs.prefersSelfClaim && opportunity.selfClaimAllowed) preferenceFit += 0.2
  if (prefs.prefersDirectAssignment && !opportunity.selfClaimAllowed) preferenceFit += 0.15
  if (
    prefs.preferredCommitmentTypesJson.length &&
    prefs.preferredCommitmentTypesJson.includes(opportunity.commitmentType)
  ) {
    preferenceFit += 0.15
  }

  const load = activeLoad(assignments)
  const roleMax = role?.maxConcurrentAssignments ?? 5
  const prefMax = prefs.maxActiveAssignments
  const max = prefMax != null ? Math.min(roleMax, prefMax) : roleMax
  const loadFit = load >= max ? 0.2 : 1 - load / Math.max(1, max * 2)

  const recentSameRole = assignments.filter(
    (a) => a.roleSlug === (opportunity.roleSlug ?? '') && a.status === 'completed',
  ).length
  const recencyFit = recentSameRole > 0 ? 0.9 : 0.55

  const urgencyFit =
    opportunity.priority === 'urgent' ? 1 : opportunity.priority === 'high' ? 0.75 : 0.5

  const baseScore = getVolunteerOpportunityBaseScore({
    roleFit,
    skillFit,
    trainingFit,
    availabilityFit,
    geographyFit,
    reliabilityFit,
    preferenceFit,
    loadFit,
    recencyFit,
    urgencyFit,
  })

  // Blend with legacy recommendation scorer for continuity with marketplace
  const blended = Math.max(0, Math.min(1, baseScore * 0.85 + (summary.recommended ? 0.08 : 0)))

  return {
    roleFit,
    skillFit,
    trainingFit,
    availabilityFit,
    geographyFit,
    reliabilityFit,
    preferenceFit,
    loadFit,
    recencyFit,
    urgencyFit,
    baseScore: blended,
  }
}

export function calculateVolunteerOpportunityFitWithEligibility(input: {
  volunteer: VolunteerProfile
  skills: VolunteerSkill[]
  training: VolunteerTrainingRecord[]
  assignments: { status: string; roleSlug: string; completedAt?: string | null }[]
  prefs: VolunteerOpportunityPreferenceProfile
  opportunity: VolunteerOpportunity
  role: VolunteerRoleDefinition | null
}): FitDecomposition & { canClaim: boolean } {
  const fit = calculateVolunteerOpportunityFit(input)
  const claim = canVolunteerClaimOpportunity({
    opportunity: input.opportunity,
    volunteer: input.volunteer,
    training: input.training,
    assignmentsForVolunteer: input.assignments,
    role: input.role,
  })
  return { ...fit, canClaim: claim.canClaim }
}
