/**
 * Explainable volunteer ↔ role matching (pure logic over loaded rows).
 */

import type {
  VolunteerAssignment,
  VolunteerProfile,
  VolunteerRecommendation,
  VolunteerRoleDefinition,
  VolunteerSkill,
  VolunteerTrainingRecord,
} from './volunteerCommandDomain'

function skillSet(skills: VolunteerSkill[]): Set<string> {
  return new Set(skills.map((s) => s.skillSlug))
}

function hasTraining(keys: string[], training: VolunteerTrainingRecord[]): boolean {
  const done = new Set(
    training.filter((t) => t.status === 'completed').map((t) => t.trainingKey),
  )
  return keys.every((k) => done.has(k))
}

function activeLoad(assignments: VolunteerAssignment[], volunteerId: string): number {
  return assignments.filter(
    (a) =>
      a.volunteerId === volunteerId &&
      ['assigned', 'claimed', 'in_progress'].includes(a.status),
  ).length
}

function recencyScore(lastActivityIso: string | null): number {
  if (!lastActivityIso) return 0.4
  const days = (Date.now() - new Date(lastActivityIso).getTime()) / 86400000
  if (days <= 7) return 1
  if (days <= 30) return 0.85
  if (days <= 90) return 0.65
  return 0.45
}

export type RecommendationContext = {
  roles: VolunteerRoleDefinition[]
  volunteers: VolunteerProfile[]
  skillsByVolunteerId: Map<string, VolunteerSkill[]>
  trainingByVolunteerId: Map<string, VolunteerTrainingRecord[]>
  assignments: VolunteerAssignment[]
  /** optional ISO timestamps for last activity per volunteer */
  lastActivityAtByVolunteerId?: Map<string, string | null>
}

export function recommendVolunteersForRole(
  roleSlug: string,
  ctx: RecommendationContext,
  limit = 12,
): VolunteerRecommendation[] {
  const role = ctx.roles.find((r) => r.roleSlug === roleSlug)
  if (!role) return []

  const out: VolunteerRecommendation[] = []

  for (const v of ctx.volunteers) {
    if (v.activeStatus === 'inactive' || v.onboardingStatus === 'inactive') continue
    const skills = ctx.skillsByVolunteerId.get(v.id) ?? []
    const training = ctx.trainingByVolunteerId.get(v.id) ?? []
    const ss = skillSet(skills)
    const reasons: VolunteerRecommendation['reasons'] = []
    let score = 0.5

    const required = role.requiredSkillSlugs
    const missingRequired = required.filter((s) => !ss.has(s))
    if (missingRequired.length) {
      reasons.push({
        code: 'missing_required_skill',
        detail: `Missing required skills: ${missingRequired.join(', ')}`,
        scoreImpact: -0.35,
      })
      score -= 0.35
    } else if (required.length) {
      reasons.push({
        code: 'required_skills_met',
        detail: 'Required skills present',
        scoreImpact: 0.15,
      })
      score += 0.15
    }

    const preferredHits = role.preferredSkillSlugs.filter((s) => ss.has(s)).length
    if (preferredHits > 0) {
      const bump = Math.min(0.2, preferredHits * 0.05)
      score += bump
      reasons.push({
        code: 'preferred_skills',
        detail: `${preferredHits} preferred skill match(es)`,
        scoreImpact: bump,
      })
    }

    if (role.trainingRequirements.length && !hasTraining(role.trainingRequirements, training)) {
      reasons.push({
        code: 'training_incomplete',
        detail: `Training required: ${role.trainingRequirements.join(', ')}`,
        scoreImpact: -0.2,
      })
      score -= 0.2
    } else if (role.trainingRequirements.length) {
      reasons.push({ code: 'training_ok', detail: 'Training requirements satisfied', scoreImpact: 0.1 })
      score += 0.1
    }

    const load = activeLoad(ctx.assignments, v.id)
    const max = Math.max(1, role.maxConcurrentAssignments)
    const loadRatio = load / max
    if (loadRatio >= 1) {
      reasons.push({
        code: 'at_capacity',
        detail: `At or over typical concurrent load (${load}/${max})`,
        scoreImpact: -0.25,
      })
      score -= 0.25
    } else {
      reasons.push({
        code: 'load_ok',
        detail: `Current assignment load ${load}/${max}`,
        scoreImpact: 0.05,
      })
      score += 0.05
    }

    const rel = v.reliabilityScore
    if (rel != null && !Number.isNaN(rel)) {
      const bump = (rel / 100) * 0.15
      score += bump
      reasons.push({
        code: 'reliability',
        detail: `Reliability score ${rel.toFixed(0)}`,
        scoreImpact: bump,
      })
    }

    const last = ctx.lastActivityAtByVolunteerId?.get(v.id) ?? v.updatedAt
    const rec = recencyScore(last)
    score += (rec - 0.5) * 0.2
    reasons.push({
      code: 'activity_recency',
      detail: 'Recent participation (heuristic)',
      scoreImpact: (rec - 0.5) * 0.2,
    })

    score = Math.max(0, Math.min(1, score))
    out.push({
      volunteerId: v.id,
      profileId: v.profileId,
      displayLabel: v.displayName?.trim() || v.email?.trim() || 'Volunteer',
      score,
      reasons,
    })
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function recommendRolesForVolunteer(
  volunteerId: string,
  ctx: RecommendationContext,
  limit = 8,
): { role: VolunteerRoleDefinition; score: number; reasons: VolunteerRecommendation['reasons'] }[] {
  const v = ctx.volunteers.find((x) => x.id === volunteerId)
  if (!v) return []
  const skills = ctx.skillsByVolunteerId.get(volunteerId) ?? []
  const training = ctx.trainingByVolunteerId.get(volunteerId) ?? []
  const ss = skillSet(skills)
  const out: { role: VolunteerRoleDefinition; score: number; reasons: VolunteerRecommendation['reasons'] }[] =
    []

  for (const role of ctx.roles) {
    if (role.isActive === false) continue
    const reasons: VolunteerRecommendation['reasons'] = []
    let score = 0.4
    const missing = role.requiredSkillSlugs.filter((s) => !ss.has(s))
    if (missing.length) {
      score -= 0.3
      reasons.push({
        code: 'gap',
        detail: `Need skills: ${missing.join(', ')}`,
        scoreImpact: -0.3,
      })
    } else {
      score += 0.25
      reasons.push({ code: 'fit', detail: 'Required skills covered', scoreImpact: 0.25 })
    }
    const pref = role.preferredSkillSlugs.filter((s) => ss.has(s)).length
    if (pref > 0) {
      score += Math.min(0.2, pref * 0.04)
      reasons.push({
        code: 'preferred',
        detail: `${pref} preferred skill overlaps`,
        scoreImpact: Math.min(0.2, pref * 0.04),
      })
    }
    if (role.trainingRequirements.length && !hasTraining(role.trainingRequirements, training)) {
      score -= 0.15
      reasons.push({
        code: 'train',
        detail: 'Complete training to unlock',
        scoreImpact: -0.15,
      })
    }
    if (v.preferredRoleSlugs.includes(role.roleSlug)) {
      score += 0.12
      reasons.push({ code: 'preference', detail: 'Volunteer prefers this role', scoreImpact: 0.12 })
    }
    score = Math.max(0, Math.min(1, score))
    out.push({ role, score, reasons })
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function recommendBackupsForAssignment(
  assignment: VolunteerAssignment,
  ctx: RecommendationContext,
  limit = 5,
): VolunteerRecommendation[] {
  return recommendVolunteersForRole(assignment.roleSlug, ctx, limit + 3).filter(
    (r) => r.volunteerId !== assignment.volunteerId,
  ).slice(0, limit)
}
