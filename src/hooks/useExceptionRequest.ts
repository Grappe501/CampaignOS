import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useExceptionRequest(
  profileId: string | undefined,
  onSaved: () => void,
) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (note: string): Promise<boolean> => {
      const trimmed = note.trim()
      if (!profileId) {
        setError('No campaign profile.')
        return false
      }
      if (!trimmed) {
        setError('Add a short note so coordinators understand your situation.')
        return false
      }
      setSaving(true)
      setError(null)
      const { error: e } = await supabase
        .from('campaign_profiles')
        .update({
          exception_request_status: 'pending',
          exception_request_note: trimmed,
          exception_requested_at: new Date().toISOString(),
        })
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

  return { submit, saving, error }
}
