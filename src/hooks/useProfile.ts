import { useCallback, useEffect, useState } from 'react'
import { useDevMockDashboard } from './useDevMockDashboard'
import { getDevMockProfile, isDevAuthBypassEnabled } from '../lib/devAuth'
import { readDevOnboardingMomentumPatch } from '../lib/devOnboardingMomentum'
import { readDevProfilePhotoPatch } from '../lib/devProfilePhoto'
import { ensureCampaignProfile } from '../lib/ensureCampaignProfile'
import { supabase } from '../lib/supabaseClient'

/** Row from `campaign_profiles`; fields depend on your schema. */
export type CampaignProfile = {
  id?: string
  primary_role?: string | null
  primary_team?: string | null
  /** Arkansas voter file id when linked (mirrors voter_match_links). */
  linked_voter_id?: string | null
  voter_registration_verified_at?: string | null
  voter_status?: string | null
  active_space?: string | null
  onboarding_status?: string | null
  onboarding_branch?: string | null
  onboarding_momentum_state?: string | null
  onboarding_direction_key?: string | null
  onboarding_micro_commitment_key?: string | null
  onboarding_last_prompt?: string | null
  onboarding_last_action_at?: string | null
  exception_request_status?: string | null
  exception_request_note?: string | null
  exception_requested_at?: string | null
  /** Public URL or data URL (dev) for dashboard avatar. */
  profile_photo_url?: string | null
  power5_recruiter_profile_id?: string | null
  power5_home_team_id?: string | null
  power5_first_five_hint?: Record<string, unknown> | null
} & Record<string, unknown>

export function useProfile() {
  const bypass = isDevAuthBypassEnabled()
  const { mockState } = useDevMockDashboard()
  const [profile, setProfile] = useState<CampaignProfile | null>(() =>
    bypass
      ? ({
          ...(getDevMockProfile(mockState) as CampaignProfile),
          ...readDevOnboardingMomentumPatch(),
          ...readDevProfilePhotoPatch(),
        } as CampaignProfile)
      : null,
  )
  const [loading, setLoading] = useState(() => !bypass)

  const refetch = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setProfile({
        ...(getDevMockProfile(mockState) as CampaignProfile),
        ...readDevOnboardingMomentumPatch(),
        ...readDevProfilePhotoPatch(),
      } as CampaignProfile)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Auth user error:', userError)
    }

    if (!user) {
      setProfile(null)
      return
    }

    await ensureCampaignProfile()

    const { data, error } = await supabase
      .from('campaign_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Profile fetch error:', error)
    } else {
      setProfile(data as CampaignProfile | null)
    }
  }, [mockState])

  useEffect(() => {
    let cancelled = false

    async function initial() {
      if (isDevAuthBypassEnabled()) {
        return
      }
      setLoading(true)
      await refetch()
      if (!cancelled) setLoading(false)
    }

    void initial()

    return () => {
      cancelled = true
    }
  }, [refetch])

  useEffect(() => {
    if (!isDevAuthBypassEnabled()) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setProfile({
          ...(getDevMockProfile(mockState) as CampaignProfile),
          ...readDevOnboardingMomentumPatch(),
          ...readDevProfilePhotoPatch(),
        } as CampaignProfile)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mockState])

  return { profile, loading, refetch }
}
