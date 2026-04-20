import type { AgentJonesResponse } from './api/agentJones'

const KEY = 'campaignos.agentJones.v1'
const SHELL_KEY = 'campaignos.agentJones.shell.v1'

export type AgentJonesTranscriptEntry = {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
  insight?: AgentJonesResponse['insight']
}

export type PersistedAgentJonesState = {
  activePromptId: string | null
  reply: AgentJonesResponse | null
  aiError: string | null
  draftInput: string
  transcript: AgentJonesTranscriptEntry[]
  /** Last operating signal_epoch when we stored coaching phrases (Pass 3). */
  coachingEpoch?: string | null
  /** Phrases to avoid repeating for that epoch. */
  lastAvoidPhrases?: string[]
}

export type AgentJonesShellPersisted = {
  progressionEpoch: string | null
}

export function loadAgentJonesShell(): AgentJonesShellPersisted {
  if (typeof sessionStorage === 'undefined') return { progressionEpoch: null }
  try {
    const raw = sessionStorage.getItem(SHELL_KEY)
    if (!raw) return { progressionEpoch: null }
    const o = JSON.parse(raw) as Partial<AgentJonesShellPersisted>
    return {
      progressionEpoch:
        typeof o.progressionEpoch === 'string' ? o.progressionEpoch : null,
    }
  } catch {
    return { progressionEpoch: null }
  }
}

export function saveAgentJonesShell(state: AgentJonesShellPersisted): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SHELL_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
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

export function clearAgentJonesConversationStorage(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** When onboarding/progression epoch changes, drop chat + shell pointer so stale advice is not shown. */
export function resetAgentJonesIfProgressionChanged(
  currentEpoch: string,
): void {
  const shell = loadAgentJonesShell()
  if (shell.progressionEpoch === currentEpoch) return
  clearAgentJonesConversationStorage()
  saveAgentJonesShell({ progressionEpoch: currentEpoch })
}
