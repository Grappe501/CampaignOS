import { useCallback, useEffect, useState } from 'react'
import { useDevMockDashboard } from './useDevMockDashboard'
import {
  getDevMockMatchedVoter,
  isDevAuthBypassEnabled,
} from '../lib/devAuth'
import {
  type MatchedVoterDisplayRow,
  type VoterCandidateRow,
  confirmVoterSelfMatch,
  confidenceForSelection,
  fetchMatchedVoterDisplay,
  searchVoterCandidates,
} from '../lib/voterMatch'

type UseVoterMatchOptions = {
  /** Called after a successful self-match so profile (linked_voter_id, etc.) can refresh. */
  onAfterMatch?: () => void | Promise<void>
}

export function useVoterMatch(
  campaignProfileId: string | undefined,
  options?: UseVoterMatchOptions,
) {
  const onAfterMatch = options?.onAfterMatch
  const { mockState } = useDevMockDashboard()
  const [matched, setMatched] = useState<MatchedVoterDisplayRow | null>(null)
  const [matchedLoading, setMatchedLoading] = useState(true)
  const [candidates, setCandidates] = useState<VoterCandidateRow[]>([])
  const [searching, setSearching] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countyRefinement, setCountyRefinement] = useState('')
  const [usedCountyRefinement, setUsedCountyRefinement] = useState(false)

  const loadMatched = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setMatched(getDevMockMatchedVoter(mockState))
      setMatchedLoading(false)
      return
    }

    if (!campaignProfileId) {
      setMatched(null)
      setMatchedLoading(false)
      return
    }

    setMatchedLoading(true)
    setError(null)
    try {
      let row = await fetchMatchedVoterDisplay(campaignProfileId)
      if (!row) {
        await new Promise((r) => setTimeout(r, 280))
        row = await fetchMatchedVoterDisplay(campaignProfileId)
      }
      setMatched(row)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMatched(null)
    } finally {
      setMatchedLoading(false)
    }
  }, [campaignProfileId, mockState])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadMatched()
    }, 0)
    return () => window.clearTimeout(id)
  }, [loadMatched])

  const search = useCallback(
    async (input: {
      nameLast: string
      nameFirst: string
      dateOfBirth: string
      county?: string | null
    }) => {
      if (isDevAuthBypassEnabled()) {
        setCandidates([])
        setError('Voter search is disabled while dev auth bypass is on.')
        return []
      }

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

      if (isDevAuthBypassEnabled()) {
        setError('Confirm match is disabled while dev auth bypass is on.')
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
        await onAfterMatch?.()
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
    [campaignProfileId, loadMatched, onAfterMatch],
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
