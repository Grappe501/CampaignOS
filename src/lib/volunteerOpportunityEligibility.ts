/**
 * Eligibility for claiming marketplace opportunities (explainable blockers).
 */

import type {
  VolunteerProfile,
  VolunteerRoleDefinition,
  VolunteerTrainingRecord,
} from './volunteerCommandDomain'
import type { VolunteerOpportunity, OpportunityEligibilitySummary } from './volunteerOpportunityDomain'

function hasTraining(keys: string[], training: VolunteerTrainingRecord[]): boolean {
  const done = new Set(training.filter((t) => t.status === 'completed').map((t) => t.trainingKey))
  return keys.every((k) => done.has(k))
}

function activeLoad(assignments: { status: string }[]): number {
  return assignments.filter((a) => ['assigned', 'claimed', 'in_progress'].includes(a.status)).length
}

export function canVolunteerClaimOpportunity(input: {
  opportunity: VolunteerOpportunity
  volunteer: VolunteerProfile | null
  training: VolunteerTrainingRecord[]
  assignmentsForVolunteer: { status: string }[]
  role: VolunteerRoleDefinition | null
}): OpportunityEligibilitySummary {
  const reasons: string[] = []
  const { opportunity, volunteer, training, assignmentsForVolunteer, role } = input

  if (!volunteer) {
    return {
      canClaim: false,
      claimState: 'blocked_other',
      reasons: ['Create your volunteer profile first.'],
    }
  }

  if (!opportunity.selfClaimAllowed) {
    return {
      canClaim: false,
      claimState: 'blocked_no_self_claim',
      reasons: ['This opportunity is coordinator-assigned only.'],
    }
  }

  if (opportunity.status !== 'open' && opportunity.status !== 'paused') {
    return { canClaim: false, claimState: 'blocked_other', reasons: ['This opportunity is not open.'] }
  }

  if (opportunity.quantityOpen <= 0) {
    return { canClaim: false, claimState: 'blocked_other', reasons: ['No openings left.'] }
  }

  if (opportunity.onboardingRequired) {
    const ok = ['ready', 'active'].includes(volunteer.onboardingStatus)
    if (!ok) {
      reasons.push('Finish onboarding to the “ready” stage for this role.')
      return { canClaim: false, claimState: 'blocked_onboarding', reasons }
    }
  } else {
    if (!['ready', 'active', 'onboarding'].includes(volunteer.onboardingStatus)) {
      reasons.push('Onboarding must be at least in progress.')
      return { canClaim: false, claimState: 'blocked_onboarding', reasons }
    }
  }

  const trainingKeys = (opportunity.requiredTrainingJson as string[]).filter(
    (x): x is string => typeof x === 'string',
  )
  if (role?.trainingRequirements?.length) {
    const merged = [...new Set([...trainingKeys, ...role.trainingRequirements])]
    if (!hasTraining(merged, training)) {
      reasons.push('Required training is not complete for this role.')
      return { canClaim: false, claimState: 'blocked_training', reasons }
    }
  } else if (trainingKeys.length && !hasTraining(trainingKeys, training)) {
    reasons.push('Complete required training modules first.')
    return { canClaim: false, claimState: 'blocked_training', reasons }
  }

  const max = role?.maxConcurrentAssignments ?? 5
  const load = activeLoad(assignmentsForVolunteer)
  if (load >= max) {
    reasons.push(`Active assignment limit reached (${max}). Complete or hand off work to claim more.`)
    return { canClaim: false, claimState: 'blocked_load', reasons }
  }

  return { canClaim: true, claimState: 'eligible', reasons: [] }
}
