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
    async (branch: OnboardingBranchValue): Promise<boolean> => {
      if (!profileId) {
        setError('No campaign profile.')
        return false
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
        return false
      }
      onSaved()
      return true
    },
    [profileId, onSaved],
  )

  return { save, saving, error }
}
