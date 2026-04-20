/**
 * Centralized primary_role → workspace home path and nav labels.
 * Avoid ad-hoc string checks in route components.
 */

function normalizePrimaryRoleKey(role: string | null | undefined): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export type RoleHomeBucket = 'intern' | 'candidate' | 'coordinator' | 'default'

export function getPrimaryRoleHomeBucket(
  primaryRole: string | null | undefined,
): RoleHomeBucket {
  const k = normalizePrimaryRoleKey(primaryRole)
  if (k === 'intern') return 'intern'
  if (k === 'candidate') return 'candidate'
  if (k === 'coordinator' || k === 'volunteer_coordinator') return 'coordinator'
  return 'default'
}

export function getRoleHomePath(primaryRole: string | null | undefined): string {
  const bucket = getPrimaryRoleHomeBucket(primaryRole)
  switch (bucket) {
    case 'intern':
      return '/intern'
    case 'candidate':
      return '/candidate'
    case 'coordinator':
      return '/coordinator'
    default:
      return '/dashboard'
  }
}

/** Primary workspace link label (first nav item when profile is known). */
export function getWorkspacePrimaryNavLabel(
  primaryRole: string | null | undefined,
): string {
  const bucket = getPrimaryRoleHomeBucket(primaryRole)
  switch (bucket) {
    case 'intern':
      return 'Team desk'
    case 'candidate':
      return 'Campaign desk'
    case 'coordinator':
      return 'Coordination'
    default:
      return 'Dashboard'
  }
}

/** Intern landing is /intern — omit duplicate Team desk row. */
export function shouldOmitTeamDeskNavLink(
  primaryRole: string | null | undefined,
): boolean {
  return getPrimaryRoleHomeBucket(primaryRole) === 'intern'
}
