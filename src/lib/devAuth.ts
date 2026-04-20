import type { Session, User } from '@supabase/supabase-js'
import type { MatchedVoterDisplayRow } from './voterMatch'

const DEV_USER_ID = '00000000-0000-4000-8000-000000000001'

/**
 * Presets for dashboard progression when auth bypass is on (dev only).
 * `matched_no_branch` — `onboarding_branch` empty → select path first (voter matched optional).
 */
export type DevMockDashboardState =
  | 'unmatched'
  | 'matched_no_branch'
  | 'exception_pending'
  | 'matched_ready'

const MOCK_STATE_VALUES: readonly DevMockDashboardState[] = [
  'unmatched',
  'matched_no_branch',
  'exception_pending',
  'matched_ready',
] as const

/** Legacy env value maps to `matched_no_branch`. */
const LEGACY_ENV_ALIASES: Record<string, DevMockDashboardState> = {
  matched_incomplete: 'matched_no_branch',
}

/** Parse storage / manual input; returns null if invalid. */
export function parseDevMockDashboardStateString(
  raw: string,
): DevMockDashboardState | null {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (LEGACY_ENV_ALIASES[key]) return LEGACY_ENV_ALIASES[key]
  if ((MOCK_STATE_VALUES as readonly string[]).includes(key)) {
    return key as DevMockDashboardState
  }
  return null
}

/** Seed only (dev + bypass): env `VITE_DEV_MOCK_DASHBOARD_STATE`, else `unmatched`. */
export function parseDevMockDashboardStateFromEnv(): DevMockDashboardState {
  if (!isDevAuthBypassEnabled()) return 'unmatched'
  const raw = String(
    import.meta.env.VITE_DEV_MOCK_DASHBOARD_STATE ?? '',
  ).trim()
  return parseDevMockDashboardStateString(raw) ?? 'unmatched'
}

/** True only in Vite dev server with explicit env flag — never in production build. */
export function isDevAuthBypassEnabled(): boolean {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS === 'true'
  )
}

export function devBypassDisplayEmail(): string {
  return 'dev-bypass@localhost.invalid'
}

/**
 * Minimal session so route guards treat the user as signed in.
 * Not a valid Supabase JWT — hooks bypass Supabase when bypass is enabled.
 */
export function createDevBypassSession(): Session {
  const now = Math.floor(Date.now() / 1000)
  const user = {
    id: DEV_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: devBypassDisplayEmail(),
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { dev_bypass: true },
    created_at: new Date().toISOString(),
  } as User

  return {
    access_token: 'dev-bypass-not-a-real-jwt',
    refresh_token: 'dev-bypass-refresh',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  } as Session
}

/** Mock row when voter is matched in dev presets. */
export function getDevMockMatchedVoter(
  state: DevMockDashboardState,
): MatchedVoterDisplayRow | null {
  if (state === 'unmatched' || state === 'exception_pending') return null
  return {
    voter_id: 'dev-mock-voter-001',
    name_last: 'Demo',
    name_first: 'Voter',
    county: 'Pulaski',
    registrant_status: 'Active',
    precinct_name: 'DEV-01',
    res_city: 'Little Rock',
    res_state: 'AR',
    res_zip5: '72201',
    congressional_district: '02',
    state_senate_district: '31',
    state_representative_district: '72',
    match_status: 'self_matched',
  }
}

/**
 * Mock `campaign_profiles` row. Caller supplies `state` from dev mock context
 * (or `parseDevMockDashboardStateFromEnv()` for initial seed).
 */
export function getDevMockProfile(
  state: DevMockDashboardState,
): Record<string, unknown> {
  const base = {
    id: DEV_USER_ID,
    primary_role: 'volunteer',
    primary_team: 'Dev Pod',
    voter_status: null as string | null,
    active_space: null as string | null,
    onboarding_status: null as string | null,
    onboarding_branch: null as string | null,
    exception_request_status: 'none',
    exception_request_note: null,
    exception_requested_at: null,
  }

  if (state === 'unmatched') {
    return {
      ...base,
      voter_status: 'unmatched',
      onboarding_status: 'not_started',
      onboarding_branch: null,
      active_space: null,
    }
  }

  if (state === 'matched_no_branch') {
    return {
      ...base,
      voter_status: 'matched',
      onboarding_status: 'not_started',
      onboarding_branch: null,
      active_space: null,
    }
  }

  if (state === 'exception_pending') {
    return {
      ...base,
      voter_status: 'unmatched',
      onboarding_status: 'not_started',
      onboarding_branch: null,
      active_space: null,
      exception_request_status: 'pending',
      exception_request_note:
        'Dev mock: roster exception pending (cannot self-match in file).',
      exception_requested_at: new Date().toISOString(),
    }
  }

  return {
    ...base,
    voter_status: 'matched',
    onboarding_branch: 'registered_arkansas_voter',
    onboarding_status: 'complete',
    active_space: 'field',
  }
}

export function devMockStateDescription(state: DevMockDashboardState): string {
  switch (state) {
    case 'unmatched':
      return 'Unmatched voter'
    case 'matched_no_branch':
      return 'Matched voter · no branch'
    case 'exception_pending':
      return 'Exception pending'
    case 'matched_ready':
      return 'Ready'
    default:
      return state
  }
}
