import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { OnboardingBranchValue } from '../lib/dashboardState'

export function useOnboardingBranch(
  profileId: string | undefined,
  onSaved: () => void,
) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (branch: OnboardingBranchValue) => {
      if (!profileId) {
        setError('No campaign profile.')
        return
      }
      setSaving(true)
      setError(null)
      const { error: e } = await supabase
        .from('campaign_profiles')
        .update({ onboarding_branch: branch })
        .eq('id', profileId)

      setSaving(false)
      if (e) {
        setError(e.message)
        return
      }
      onSaved()
    },
    [profileId, onSaved],
  )

  return { save, saving, error }
}
