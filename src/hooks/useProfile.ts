import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Row from `campaign_profiles`; fields depend on your schema. */
export type CampaignProfile = {
  id?: string
  primary_role?: string | null
  primary_team?: string | null
  voter_status?: string | null
  active_space?: string | null
  onboarding_status?: string | null
} & Record<string, unknown>

export function useProfile() {
  const [profile, setProfile] = useState<CampaignProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('Auth user error:', userError)
      }

      if (!user) {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('campaign_profiles')
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error)
      } else if (!cancelled) {
        setProfile(data as CampaignProfile | null)
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    void fetchProfile()

    return () => {
      cancelled = true
    }
  }, [])

  return { profile, loading }
}
