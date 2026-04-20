import { useEffect, useState } from 'react'
import type { MatchedVoterDisplayRow } from '../lib/voterMatch'
import {
  type PublicOfficialsResponse,
  fetchPublicOfficials,
} from '../lib/api/publicOfficials'

export function usePublicOfficials(matchedVoter: MatchedVoterDisplayRow | null) {
  const [state, setState] = useState<PublicOfficialsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      if (!matchedVoter) {
        setState(null)
        setLoading(false)
        return
      }

      const city = matchedVoter.res_city?.trim() ?? ''
      const st = matchedVoter.res_state?.trim() ?? ''
      const zip = matchedVoter.res_zip5?.trim() ?? ''
      if (!city && !st && !zip) {
        setState({
          ok: false,
          error: 'insufficient_address',
          officials: [],
          districtOfficials: {
            usHouse: null,
            stateSenate: null,
            stateHouse: null,
          },
          message:
            'Your voter record has no city/state/ZIP yet. Officials appear once address fields are present.',
        })
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const r = await fetchPublicOfficials(matchedVoter)
        if (!cancelled) setState(r)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    matchedVoter,
    matchedVoter?.voter_id,
    matchedVoter?.res_city,
    matchedVoter?.res_state,
    matchedVoter?.res_zip5,
  ])

  return { officialsState: state, officialsLoading: loading }
}
