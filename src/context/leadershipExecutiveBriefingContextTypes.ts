import type { LeadershipBriefingSnapshot } from '../lib/leadershipBriefingSchemas'
import type { AgentJonesEventOperationsExecutive } from '../lib/leadershipBriefingAgentBridge'

export type LeadershipExecutiveBriefingContextValue = {
  briefing: LeadershipBriefingSnapshot | null
  setBriefing: (b: LeadershipBriefingSnapshot | null) => void
  agentPayload: AgentJonesEventOperationsExecutive | null
}
