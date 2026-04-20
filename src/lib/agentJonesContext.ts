import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'

/** Dashboard sections the model may suggest scrolling to — keep in sync with `netlify/functions/agent-jones.ts` SCROLL_IDS. */
export const AGENT_JONES_SCROLL_TARGET_IDS = [
  'voter-workspace',
  'power5-workspace',
  'exception-request',
  'onboarding-branch',
  'onboarding-activation',
  'workspace-cards',
  'mission-tasks',
  'daily-activation',
  'intern-desk',
  'campaign-kpis',
  'agent-jones',
  'dash-profile-photo',
  'coordinator-mission-ops',
  'candidate-health-snapshot',
  'admin-overview',
  'admin-exceptions',
  'admin-desks',
  'admin-tasks',
  'admin-config',
] as const

/** Paths the model may suggest via navigate actions (client + Netlify must stay aligned). */
export const AGENT_JONES_NAVIGATE_PATHS = [
  '/',
  '/dashboard',
  '/intern',
  '/coordinator',
  '/candidate',
  '/admin',
] as const

export type AgentJonesNavigatePath = (typeof AGENT_JONES_NAVIGATE_PATHS)[number]

export function isAgentJonesNavigatePath(id: string): id is AgentJonesNavigatePath {
  return (AGENT_JONES_NAVIGATE_PATHS as readonly string[]).includes(id)
}

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
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    contact?: { addressLabel?: string; addressUrl?: string }
    social?: { platform: string; label: string; url: string }[]
  }
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

  const campaign: NonNullable<AgentJonesSafeContext['campaign']> = {
    slogan: trunc(CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan, 120) ?? undefined,
    shortBio: trunc(CHRIS_JONES_FOR_CONGRESS_PUBLIC.shortBio, 420) ?? undefined,
    issuePillars: CHRIS_JONES_FOR_CONGRESS_PUBLIC.issuePillars.slice(0, 6).map((p) => ({
      title: p.title,
      summary: p.summary,
    })),
    ctas: CHRIS_JONES_FOR_CONGRESS_PUBLIC.ctas.slice(0, 6).map((c) => ({
      label: c.label,
      url: c.url,
    })),
    contact: {
      addressLabel: trunc(CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressLabel, 160) ?? undefined,
      addressUrl: trunc(CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressUrl, 240) ?? undefined,
    },
    social: CHRIS_JONES_FOR_CONGRESS_PUBLIC.social.slice(0, 8).map((s) => ({
      platform: s.platform,
      label: s.label,
      url: s.url,
    })),
  }

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
      campaign,
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
    campaign,
    ...(Object.keys(hints).length > 0 ? { profileHints: hints } : {}),
    ...taskTraining,
  }
}
