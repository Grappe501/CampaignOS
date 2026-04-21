/* eslint-disable react-refresh/only-export-components -- context + provider pair */
import { createContext, useMemo, useState, type ReactNode } from 'react'
import type { LeadershipBriefingSnapshot } from '../lib/leadershipBriefingSchemas'
import { buildAgentJonesEventOperationsExecutive } from '../lib/leadershipBriefingAgentBridge'
import type { LeadershipExecutiveBriefingContextValue } from './leadershipExecutiveBriefingContextTypes'

export const LeadershipExecutiveBriefingContext =
  createContext<LeadershipExecutiveBriefingContextValue | null>(null)

export function LeadershipExecutiveBriefingProvider({ children }: { children: ReactNode }) {
  const [briefing, setBriefing] = useState<LeadershipBriefingSnapshot | null>(null)
  const agentPayload = useMemo(
    () => (briefing ? buildAgentJonesEventOperationsExecutive(briefing) : null),
    [briefing],
  )
  const v = useMemo(
    (): LeadershipExecutiveBriefingContextValue => ({ briefing, setBriefing, agentPayload }),
    [briefing, agentPayload],
  )
  return (
    <LeadershipExecutiveBriefingContext.Provider value={v}>{children}</LeadershipExecutiveBriefingContext.Provider>
  )
}
