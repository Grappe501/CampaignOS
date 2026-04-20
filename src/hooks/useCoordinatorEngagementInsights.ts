import { useCallback, useEffect, useState } from 'react'
import type { VolunteerProfile } from '../lib/volunteerCommandDomain'
import {
  buildVolunteerEngagementSummary,
  detectVolunteerDriftRisk,
  detectVolunteerReadinessForMoreResponsibility,
} from '../lib/volunteerEngagementSummary'
import type { VolunteerEngagementSummary } from '../lib/volunteerRecommendationSchemas'

export function useCoordinatorEngagementInsights(volunteers: VolunteerProfile[]) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [rows, setRows] = useState<VolunteerEngagementSummary[]>([])

  const load = useCallback(async () => {
    if (volunteers.length === 0) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const limited = volunteers.slice(0, 48)
      const summaries = await Promise.all(limited.map((v) => buildVolunteerEngagementSummary(v.id)))
      setRows(summaries)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Engagement insights failed'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [volunteers])

  useEffect(() => {
    void load()
  }, [load])

  const highlyActive = rows.filter((r) => r.engagementCategory === 'highly_active')
  const drifting = rows.filter((r) => detectVolunteerDriftRisk(r))
  const readyMore = rows.filter((r) => detectVolunteerReadinessForMoreResponsibility(r))

  return {
    loading,
    error,
    refetch: load,
    summaries: rows,
    highlyActive,
    drifting,
    readyForMore: readyMore,
  }
}
