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
/** Optional summaries only (no raw rows or IDs beyond titles/status labels). */
export type AgentJonesTaskTrainingSummaries = {
  currentTaskTitle?: string
  currentTaskStatus?: string
  currentTrainingTitle?: string
  currentTrainingStatus?: string
}

export type AgentJonesSafeContext = {
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  profileHints?: AgentJonesSafeProfileHints
} & AgentJonesTaskTrainingSummaries

function trunc(s: unknown, max: number): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

function truncSummary(s: string | null | undefined, max: number): string | undefined {
  const t = trunc(s, max)
  return t ?? undefined
}

/** Build a server-safe snapshot: only progression slice, loading flag, whitelisted profile fields, and optional task/training summaries. */
export function buildAgentJonesSafeContext(input: {
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  profile: CampaignProfile | null
  summaries?: AgentJonesTaskTrainingSummaries | null
}): AgentJonesSafeContext {
  const { progressSlice, voterLoading, profile, summaries } = input

  const taskTraining: AgentJonesTaskTrainingSummaries = {}
  const ctt = truncSummary(summaries?.currentTaskTitle, 120)
  const cts = truncSummary(summaries?.currentTaskStatus, 64)
  const ctrt = truncSummary(summaries?.currentTrainingTitle, 120)
  const ctrs = truncSummary(summaries?.currentTrainingStatus, 64)
  if (ctt) taskTraining.currentTaskTitle = ctt
  if (cts) taskTraining.currentTaskStatus = cts
  if (ctrt) taskTraining.currentTrainingTitle = ctrt
  if (ctrs) taskTraining.currentTrainingStatus = ctrs

  if (!profile) {
    return {
      progressSlice,
      voterLoading,
      ...taskTraining,
    }
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
    ...taskTraining,
  }
}
