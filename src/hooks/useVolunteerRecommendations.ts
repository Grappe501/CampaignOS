import { useCallback, useEffect, useState } from 'react'
import type { VolunteerProfile } from '../lib/volunteerCommandDomain'
import { generateVolunteerOpportunityRecommendations } from '../lib/volunteerRecommendationEngine'
import type { VolunteerRecommendationResult } from '../lib/volunteerRecommendationSchemas'

export function useVolunteerRecommendations(volunteer: VolunteerProfile | null, isCoordinator = false) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [results, setResults] = useState<VolunteerRecommendationResult[]>([])
  const [usedAi, setUsedAi] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string | undefined>()
  const [modelName, setModelName] = useState<string | null>(null)

  const load = useCallback(
    async (opts?: { forceRefresh?: boolean }) => {
      if (!volunteer) {
        setResults([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const r = await generateVolunteerOpportunityRecommendations(volunteer, {
          isCoordinator,
          forceRefresh: opts?.forceRefresh,
        })
        setResults(r.results)
        setUsedAi(r.usedAi)
        setFallbackReason(r.fallbackReason)
        setModelName(r.modelName)
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Recommendations failed'))
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [volunteer, isCoordinator],
  )

  useEffect(() => {
    void load()
  }, [load])

  return {
    loading,
    error,
    results,
    usedAi,
    fallbackReason,
    modelName,
    refetch: load,
  }
}
