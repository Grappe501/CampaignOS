import { useCallback, useEffect, useState } from 'react'
import {
  type MatchedVoterDisplayRow,
  type VoterCandidateRow,
  confirmVoterSelfMatch,
  confidenceForSelection,
  fetchMatchedVoterDisplay,
  searchVoterCandidates,
} from '../lib/voterMatch'

export function useVoterMatch(campaignProfileId: string | undefined) {
  const [matched, setMatched] = useState<MatchedVoterDisplayRow | null>(null)
  const [matchedLoading, setMatchedLoading] = useState(true)
  const [candidates, setCandidates] = useState<VoterCandidateRow[]>([])
  const [searching, setSearching] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countyRefinement, setCountyRefinement] = useState('')
  const [usedCountyRefinement, setUsedCountyRefinement] = useState(false)

  const loadMatched = useCallback(async () => {
    if (!campaignProfileId) {
      setMatched(null)
      setMatchedLoading(false)
      return
    }

    setMatchedLoading(true)
    setError(null)
    try {
      const row = await fetchMatchedVoterDisplay(campaignProfileId)
      setMatched(row)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMatched(null)
    } finally {
      setMatchedLoading(false)
    }
  }, [campaignProfileId])

  useEffect(() => {
    void loadMatched()
  }, [loadMatched])

  const search = useCallback(
    async (input: {
      nameLast: string
      nameFirst: string
      dateOfBirth: string
      county?: string | null
    }) => {
      setSearching(true)
      setError(null)
      setCandidates([])
      const countyTrim = input.county?.trim()
      const hasCounty = Boolean(countyTrim)
      setUsedCountyRefinement(hasCounty)

      try {
        const rows = await searchVoterCandidates({
          nameLast: input.nameLast,
          nameFirst: input.nameFirst,
          dateOfBirth: input.dateOfBirth,
          county: countyTrim || null,
        })
        setCandidates(rows)
        return rows
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        return []
      } finally {
        setSearching(false)
      }
    },
    [],
  )

  const confirm = useCallback(
    async (params: {
      voterId: string
      nameLast: string
      nameFirst: string
      dateOfBirth: string
      county?: string | null
      candidateCountAtSearch: number
    }) => {
      if (!campaignProfileId) {
        setError('No campaign profile.')
        return
      }

      setConfirming(true)
      setError(null)
      try {
        const confidence = confidenceForSelection(params.candidateCountAtSearch)
        await confirmVoterSelfMatch({
          campaignProfileId,
          voterId: params.voterId,
          nameLast: params.nameLast,
          nameFirst: params.nameFirst,
          dateOfBirth: params.dateOfBirth,
          county: params.county?.trim() || null,
          confidenceScore: confidence,
        })
        await loadMatched()
        setCandidates([])
        setCountyRefinement('')
        setUsedCountyRefinement(false)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      } finally {
        setConfirming(false)
      }
    },
    [campaignProfileId, loadMatched],
  )

  return {
    matched,
    matchedLoading,
    candidates,
    searching,
    confirming,
    error,
    countyRefinement,
    setCountyRefinement,
    usedCountyRefinement,
    search,
    confirm,
    reloadMatched: loadMatched,
  }
}

export type UseVoterMatchResult = ReturnType<typeof useVoterMatch>
