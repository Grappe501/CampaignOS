import { isDevAuthBypassEnabled } from './devAuth'
import type { MomentumAction } from './onboardingMomentum'

const KEY = 'campaignos-dev-onboarding-momentum'

type Stored = {
  onboarding_momentum_state?: string
  onboarding_direction_key?: string | null
  onboarding_micro_commitment_key?: string | null
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

export function applyDevOnboardingMomentumAction(action: MomentumAction): void {
  if (!isDevAuthBypassEnabled()) return
  const prev = readRaw()
  if (action.type === 'set_direction') {
    const next: Stored = {
      ...prev,
      onboarding_momentum_state: 'exploring',
      onboarding_direction_key: action.key,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  if (action.type === 'set_micro') {
    const next: Stored = {
      ...prev,
      onboarding_momentum_state: 'committed',
      onboarding_micro_commitment_key: action.key,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  if (action.mode === 'from_direction_skip') {
    const next: Stored = {
      ...prev,
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
      onboarding_momentum_state: 'engaged',
      onboarding_micro_commitment_key: null,
    }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return
  }
  const next: Stored = {
    ...prev,
    onboarding_momentum_state: 'engaged',
  }
  sessionStorage.setItem(KEY, JSON.stringify(next))
}
