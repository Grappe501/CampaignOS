import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'

/** Dashboard sections the model may suggest scrolling to — keep in sync with `netlify/functions/agent-jones.ts` SCROLL_IDS. */
export const AGENT_JONES_SCROLL_TARGET_IDS = [
  'voter-workspace',
  'exception-request',
  'onboarding-branch',
  'workspace-cards',
  'agent-jones',
] as const

export type AgentJonesScrollTargetId =
  (typeof AGENT_JONES_SCROLL_TARGET_IDS)[number]

export function isAgentJonesScrollTargetId(
  id: string,
): id is AgentJonesScrollTargetId {
  return (AGENT_JONES_SCROLL_TARGET_IDS as readonly string[]).includes(id)
}

export type AgentJonesSafeProfileHints = {
  onboarding_branch?: string | null
  onboarding_status?: string | null
  active_space?: string | null
  exception_request_status?: string | null
  voter_status?: string | null
}

/**
 * Explicit, bounded context the Netlify function is allowed to use — no DB reads there.
 */
export type AgentJonesSafeContext = {
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  profileHints?: AgentJonesSafeProfileHints
}

function trunc(s: unknown, max: number): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

/** Build a server-safe snapshot: only progression slice, loading flag, and whitelisted profile fields. */
export function buildAgentJonesSafeContext(input: {
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  profile: CampaignProfile | null
}): AgentJonesSafeContext {
  const { progressSlice, voterLoading, profile } = input

  if (!profile) {
    return { progressSlice, voterLoading }
  }

  const hints: AgentJonesSafeProfileHints = {}
  const b = trunc(profile.onboarding_branch, 120)
  const st = trunc(profile.onboarding_status, 120)
  const sp = trunc(profile.active_space, 120)
  const ex = trunc(profile.exception_request_status, 64)
  const vs = trunc(profile.voter_status, 64)
  if (b) hints.onboarding_branch = b
  if (st) hints.onboarding_status = st
  if (sp) hints.active_space = sp
  if (ex) hints.exception_request_status = ex
  if (vs) hints.voter_status = vs

  return {
    progressSlice,
    voterLoading,
    ...(Object.keys(hints).length > 0 ? { profileHints: hints } : {}),
  }
}
