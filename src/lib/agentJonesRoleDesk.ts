/** Campaign-facing role bucket for tone, scope, and prioritization (not Supabase RLS). */
export type AgentJonesNormalizedRole =
  | 'admin'
  | 'campaign_manager'
  | 'candidate'
  | 'assistant_campaign_manager'
  | 'coordinator'
  | 'county_lead'
  | 'precinct_captain'
  | 'intern'
  | 'volunteer'
  | 'unknown'

export type AgentJonesDeskRoute =
  | '/dashboard'
  | '/intern'
  | '/coordinator'
  | '/candidate'
  | '/admin'
  | '/events'

export type AgentJonesLeadershipLevel =
  | 'volunteer'
  | 'intern'
  | 'field_lead'
  | 'coordinator'
  | 'leadership'
  | 'admin'

export type AgentJonesUserScope = 'self' | 'supervised_teams' | 'campaign_wide'

export function normalizeAgentJonesRole(
  primaryRole: string | null | undefined,
): AgentJonesNormalizedRole {
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return 'unknown'
  if (k === 'admin') return 'admin'
  if (k === 'staff') return 'campaign_manager'
  if (k === 'candidate') return 'candidate'
  if (k === 'intern') return 'intern'
  if (k === 'coordinator' || k === 'volunteer_coordinator') return 'coordinator'
  if (
    (k.includes('assistant') || k.includes('deputy')) &&
    (k.includes('manager') || k.includes('campaign') || k.includes('cm'))
  ) {
    return 'assistant_campaign_manager'
  }
  if (k.includes('county') && (k.includes('lead') || k.includes('captain'))) {
    return 'county_lead'
  }
  if (k.includes('precinct') || k === 'captain' || k.endsWith('_captain')) {
    return 'precinct_captain'
  }
  if (k === 'volunteer') return 'volunteer'
  return 'unknown'
}

export function deskRouteFromPathname(pathname: string): AgentJonesDeskRoute {
  const p = pathname.split('?')[0] ?? '/'
  if (p.startsWith('/admin')) return '/admin'
  if (p.startsWith('/intern')) return '/intern'
  if (p.startsWith('/events')) return '/events'
  if (p.startsWith('/coordinator')) return '/coordinator'
  if (p.startsWith('/candidate')) return '/candidate'
  return '/dashboard'
}

export function inferLeadershipLevel(
  normalized: AgentJonesNormalizedRole,
): AgentJonesLeadershipLevel {
  switch (normalized) {
    case 'admin':
    case 'campaign_manager':
      return 'admin'
    case 'candidate':
    case 'assistant_campaign_manager':
      return 'leadership'
    case 'coordinator':
      return 'coordinator'
    case 'county_lead':
    case 'precinct_captain':
      return 'field_lead'
    case 'intern':
      return 'intern'
    default:
      return 'volunteer'
  }
}

export function inferUserScope(
  normalized: AgentJonesNormalizedRole,
  coordinatorHasSupervisorScope: boolean,
): AgentJonesUserScope {
  if (normalized === 'admin' || normalized === 'campaign_manager') {
    return 'campaign_wide'
  }
  if (normalized === 'candidate' || normalized === 'assistant_campaign_manager') {
    return 'campaign_wide'
  }
  if (normalized === 'coordinator' && coordinatorHasSupervisorScope) {
    return 'supervised_teams'
  }
  return 'self'
}
