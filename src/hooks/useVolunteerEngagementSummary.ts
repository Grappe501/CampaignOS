import { useCallback, useEffect, useState } from 'react'
import { buildVolunteerEngagementSummary } from '../lib/volunteerEngagementSummary'
import type { VolunteerEngagementSummary } from '../lib/volunteerRecommendationSchemas'

export function useVolunteerEngagementSummary(volunteerId: string | undefined) {
  const [summary, setSummary] = useState<VolunteerEngagementSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!volunteerId) {
      setSummary(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await buildVolunteerEngagementSummary(volunteerId)
      setSummary(s)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Engagement summary failed'))
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [volunteerId])

  useEffect(() => {
    void load()
  }, [load])

  return { summary, loading, error, refetch: load }
}
