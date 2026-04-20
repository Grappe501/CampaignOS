/**
 * Reliability categories and recompute helpers (client-side; coordinators can persist summaries).
 */

import type {
  ReliabilityCategory,
  VolunteerAssignment,
  VolunteerProfile,
} from './volunteerCommandDomain'

export type ReliabilityInputs = {
  volunteer: VolunteerProfile
  assignments: VolunteerAssignment[]
}

function rate(statuses: string[], pred: (s: string) => boolean): number {
  if (!statuses.length) return 0
  return statuses.filter(pred).length / statuses.length
}

/**
 * Deterministic category from rates + activity + onboarding.
 */
export function categorizeVolunteerReliability(input: ReliabilityInputs): ReliabilityCategory {
  const { volunteer, assignments } = input
  const mine = assignments.filter((a) => a.volunteerId === volunteer.id)
  const statuses = mine.map((a) => a.status)

  if (
    volunteer.activeStatus === 'inactive' ||
    volunteer.onboardingStatus === 'inactive' ||
    volunteer.onboardingStatus === 'new'
  ) {
    return 'inactive'
  }

  const completed = rate(statuses, (s) => s === 'completed')
  const missed = rate(statuses, (s) => s === 'missed' || s === 'declined')
  const claimed = rate(
    statuses,
    (s) => s === 'claimed' || s === 'in_progress' || s === 'completed',
  )

  if (mine.length === 0) {
    return volunteer.onboardingStatus === 'ready' || volunteer.onboardingStatus === 'active'
      ? 'developing'
      : 'inactive'
  }

  if (missed > 0.25) return 'at_risk'
  if (completed >= 0.65 && missed < 0.1 && (volunteer.reliabilityScore ?? 0) >= 70) {
    return 'high_reliability'
  }
  if (completed >= 0.4 && claimed >= 0.5) return 'steady'
  if (completed < 0.3 && mine.length >= 3) return 'at_risk'
  return 'developing'
}

export function volunteerToLeaderPipelineStage(volunteer: VolunteerProfile): string {
  const lp = volunteer.leadershipPotential ?? 0
  const rel = volunteer.reliabilityScore ?? 0
  if (volunteer.onboardingStatus !== 'active' && volunteer.onboardingStatus !== 'ready') {
    return 'onboarding'
  }
  if (lp >= 70 && rel >= 65) return 'ready_for_team_lead'
  if (lp >= 45 && rel >= 50) return 'stretch_assignments'
  return 'individual_contributor'
}
