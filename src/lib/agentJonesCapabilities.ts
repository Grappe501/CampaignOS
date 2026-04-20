/**
 * Agent Jones capability / policy layer (UI + context).
 * Standard users: internal campaign context only — no reserved outside-internet tools.
 * Elevated: candidate, campaign manager (coordinator), admin — reserved for future web-connected modes.
 */

function normalizeRoleKey(role: string | null | undefined): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export type AgentJonesCapabilities = {
  /** Policy: whether outside-internet / open-web tooling may ever be used for this user. */
  allowOutsideInternet: boolean
  /** Serializable tier for API / audit. */
  internetAccessTier: AgentJonesInternetTier
  /** Human-readable mode for UI badges. */
  accessModeLabel: string
  /** Short helper line under the badge. */
  accessModeDescription: string
}

export type AgentJonesInternetTier = 'standard' | 'elevated'

const ELEVATED_ROLE_KEYS = new Set([
  'candidate',
  'admin',
  'campaign_manager',
  'coordinator',
  'volunteer_coordinator',
])

export function isElevatedAgentJonesRole(
  primaryRole: string | null | undefined,
): boolean {
  const k = normalizeRoleKey(primaryRole)
  return ELEVATED_ROLE_KEYS.has(k)
}

export function getAgentJonesCapabilities(
  primaryRole: string | null | undefined,
): AgentJonesCapabilities {
  const elevated = isElevatedAgentJonesRole(primaryRole)
  if (elevated) {
    return {
      allowOutsideInternet: true,
      internetAccessTier: 'elevated',
      accessModeLabel: 'Leadership workspace',
      accessModeDescription:
        'External web tools are reserved for this role and are not active in this release.',
    }
  }
  return {
    allowOutsideInternet: false,
    internetAccessTier: 'standard',
    accessModeLabel: 'Internal-only',
    accessModeDescription:
      'Answers use campaign workspace data only — no open-web browsing.',
  }
}

/** Shape embedded in Agent Jones API context (policy only; no browsing in this pass). */
export function agentJonesPolicyPayload(
  caps: AgentJonesCapabilities,
): {
  outside_internet: 'denied' | 'elevated_reserved'
} {
  return {
    outside_internet: caps.allowOutsideInternet
      ? 'elevated_reserved'
      : 'denied',
  }
}
