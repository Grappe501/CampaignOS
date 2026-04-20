import { useCallback, useEffect, useState } from 'react'
import { useDevMockDashboard } from './useDevMockDashboard'
import { getDevMockProfile, isDevAuthBypassEnabled } from '../lib/devAuth'
import { ensureCampaignProfile } from '../lib/ensureCampaignProfile'
import { supabase } from '../lib/supabaseClient'

/** Row from `campaign_profiles`; fields depend on your schema. */
export type CampaignProfile = {
  id?: string
  primary_role?: string | null
  primary_team?: string | null
  voter_status?: string | null
  active_space?: string | null
  onboarding_status?: string | null
  onboarding_branch?: string | null
  exception_request_status?: string | null
  exception_request_note?: string | null
  exception_requested_at?: string | null
} & Record<string, unknown>

export function useProfile() {
  const bypass = isDevAuthBypassEnabled()
  const { mockState } = useDevMockDashboard()
  const [profile, setProfile] = useState<CampaignProfile | null>(() =>
    bypass ? (getDevMockProfile(mockState) as CampaignProfile) : null,
  )
  const [loading, setLoading] = useState(() => !bypass)

  const refetch = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setProfile(getDevMockProfile(mockState) as CampaignProfile)
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
        setProfile(getDevMockProfile(mockState) as CampaignProfile)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mockState])

  return { profile, loading, refetch }
}
