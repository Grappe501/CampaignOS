import { isDevAuthBypassEnabled } from './devAuth'
import type { MomentumAction } from './onboardingMomentum'

const KEY = 'campaignos-dev-onboarding-momentum'

type Stored = {
  onboarding_momentum_state?: string
  onboarding_direction_key?: string | null
  onboarding_micro_commitment_key?: string | null
  onboarding_last_prompt?: string | null
  onboarding_last_action_at?: string | null
}

function readRaw(): Stored {
  if (!isDevAuthBypassEnabled()) return {}
  try {
    const t = sessionStorage.getItem(KEY)
    if (!t) return {}
    const o = JSON.parse(t) as unknown
    if (!o || typeof o !== 'object') return {}
    return o as Stored
  } catch {
    return {}
  }
}

/** Merges into dev mock profile in `useProfile` when bypass is on. */
export function readDevOnboardingMomentumPatch(): Stored {
  return readRaw()
}

function stamp(
  prev: Stored,
  meta?: { lastPrompt?: string },
): Pick<Stored, 'onboarding_last_prompt' | 'onboarding_last_action_at'> {
  return {
    onboarding_last_prompt:
      meta?.lastPrompt != null && String(meta.lastPrompt).trim() !== ''
        ? String(meta.lastPrompt).slice(0, 160)
        : prev.onboarding_last_prompt ?? null,
    onboarding_last_action_at: new Date().toISOString(),
  }
}

export function applyDevOnboardingMomentumAction(
  action: MomentumAction,
  meta?: { lastPrompt?: string },
): void {
  if (!isDevAuthBypassEnabled()) return
  const prev = readRaw()
  const ts = stamp(prev, meta)
  if (action.type === 'set_direction') {
    const next: Stored = {
      ...prev,
      ...ts,
      onboarding_momentum_state: 'exploring',
      onboarding_direction_key: action.key,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  if (action.type === 'set_micro') {
    const next: Stored = {
      ...prev,
      ...ts,
      onboarding_momentum_state: 'committed',
      onboarding_micro_commitment_key: action.key,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  if (action.mode === 'from_direction_skip') {
    const next: Stored = {
      ...prev,
      ...ts,
      onboarding_momentum_state: 'engaged',
      onboarding_direction_key: null,
      onboarding_micro_commitment_key: null,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  if (action.mode === 'from_micro_skip') {
    const next: Stored = {
      ...prev,
      ...ts,
      onboarding_momentum_state: 'engaged',
      onboarding_micro_commitment_key: null,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  const next: Stored = {
    ...prev,
    ...ts,
    onboarding_momentum_state: 'engaged',
  }
  sessionStorage.setItem(KEY, JSON.stringify(next))
}
