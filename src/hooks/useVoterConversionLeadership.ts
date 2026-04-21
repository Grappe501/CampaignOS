import { useCallback, useEffect, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  fetchVoterConversionLeadershipRollups,
  type VoterConversionCountyRollupRow,
} from '../lib/voterConversionDb'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'

export function useVoterConversionLeadership(primaryRole: string | null | undefined) {
  const [rollups, setRollups] = useState<VoterConversionCountyRollupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const enabled = canAccessEventCoordinatorDesk(primaryRole)

  const refresh = useCallback(async () => {
    if (!enabled || isDevAuthBypassEnabled()) {
      setRollups([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchVoterConversionLeadershipRollups()
      setRollups(rows)
    } catch (e) {
      setRollups([])
      setError(e instanceof Error ? e.message : 'Voter conversion rollups failed')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { rollups, loading, error, refresh, enabled }
}
