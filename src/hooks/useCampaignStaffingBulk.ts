import { useEffect, useState } from 'react'
import { fetchStaffingAssignmentsForEvents } from '../lib/campaignEventStaffingBulk'
import type { StaffingAssignmentLike } from '../lib/eventStaffingMatrix'

export function useCampaignStaffingBulk(eventIds: readonly string[], refreshToken = 0) {
  const [map, setMap] = useState<Map<string, StaffingAssignmentLike[]>>(new Map())
  const [loading, setLoading] = useState(false)

  const stableKey = JSON.stringify([...new Set(eventIds)].filter(Boolean).sort())
  const fetchKey = `${stableKey}::${refreshToken}`

  useEffect(() => {
    const normalized = [...new Set(eventIds)].filter(Boolean).sort()
    if (!normalized.length) {
      setMap(new Map())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchStaffingAssignmentsForEvents(normalized).then((m) => {
      if (!cancelled) {
        setMap(m)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // stableKey serializes eventIds; fetchKey adds refreshToken.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see stableKey/fetchKey above
  }, [fetchKey, stableKey])

  return { assignmentMap: map, loading }
}
