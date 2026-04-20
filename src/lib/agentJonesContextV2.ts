import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { needsOnboardingPath } from './dashboardState'
import type { MatchedVoterDisplayRow } from './voterMatch'

export type AgentJonesContextV2 = {
  user: {
    role?: string | null
    onboarding_status?: string | null
    onboarding_branch?: string | null
    onboarding_momentum_state?: string | null
    onboarding_direction_key?: string | null
    onboarding_micro_commitment_key?: string | null
    voterMatched: boolean
    precinct?: string | null
    county?: string | null
    congressional_district?: string | null
    state_senate_district?: string | null
    state_representative_district?: string | null
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    /** Welcome Kit + org outline model (server-safe excerpts). */
    onboardingBrief?: {
      flowSteps?: string[]
      welcomePurpose?: string
      howWeWork?: string
      howWeGrow?: string
      pickLane?: string
      firstActions?: string
      messaging?: string
      escalation?: string
      valueTitles?: string[]
      laneOptions?: {
        key: string
        title: string
        summary?: string
        firstAction?: string
      }[]
      talkTrackTitles?: string[]
    }
  }
  operational: {
    progressSlice: DashboardProgressSlice
    voterLoading: boolean
    needsOnboardingPath: boolean
  }
}

function trunc(s: unknown, max: number): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

function safeBool(x: unknown): boolean {
  return Boolean(x)
}

export function buildAgentJonesContextV2(input: {
  profile: CampaignProfile | null
  matchedVoter: MatchedVoterDisplayRow | null
  voterMatched: boolean
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  campaign?: AgentJonesContextV2['campaign'] | null
}): AgentJonesContextV2 {
  const {
    profile,
    matchedVoter,
    voterMatched,
    progressSlice,
    voterLoading,
    campaign,
  } = input

  return {
    user: {
      role: trunc(profile?.primary_role, 120),
      onboarding_status: trunc(profile?.onboarding_status, 120),
      onboarding_branch: trunc(profile?.onboarding_branch, 120),
      onboarding_momentum_state: trunc(profile?.onboarding_momentum_state, 32),
      onboarding_direction_key: trunc(profile?.onboarding_direction_key, 64),
      onboarding_micro_commitment_key: trunc(
        profile?.onboarding_micro_commitment_key,
        64,
      ),
      voterMatched: safeBool(voterMatched),
      precinct: trunc(matchedVoter?.precinct_name, 140),
      county: trunc(matchedVoter?.county, 120),
      congressional_district: trunc(matchedVoter?.congressional_district, 32),
      state_senate_district: trunc(matchedVoter?.state_senate_district, 32),
      state_representative_district: trunc(
        matchedVoter?.state_representative_district,
        32,
      ),
    },
    ...(campaign ? { campaign } : {}),
    operational: {
      progressSlice,
      voterLoading,
      needsOnboardingPath: needsOnboardingPath(profile),
    },
  }
}

