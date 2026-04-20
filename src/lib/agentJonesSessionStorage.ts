import type { AgentJonesResponse } from './api/agentJones'

const KEY = 'campaignos.agentJones.v1'

export type PersistedAgentJonesState = {
  activePromptId: string | null
  reply: AgentJonesResponse | null
  aiError: string | null
}

export function loadAgentJonesPersisted(): Partial<PersistedAgentJonesState> {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as PersistedAgentJonesState
  } catch {
    return {}
  }
}

export function saveAgentJonesPersisted(state: PersistedAgentJonesState): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota */
  }
}
