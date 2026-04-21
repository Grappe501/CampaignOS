import { useContext } from 'react'
import { LeadershipExecutiveBriefingContext } from '../context/LeadershipExecutiveBriefingContext'
import type { LeadershipExecutiveBriefingContextValue } from '../context/leadershipExecutiveBriefingContextTypes'

const empty: LeadershipExecutiveBriefingContextValue = {
  briefing: null,
  setBriefing: () => {},
  agentPayload: null,
}

export function useLeadershipExecutiveBriefing(): LeadershipExecutiveBriefingContextValue {
  return useContext(LeadershipExecutiveBriefingContext) ?? empty
}
