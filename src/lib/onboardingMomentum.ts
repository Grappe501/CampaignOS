import type { CampaignProfile } from '../hooks/useProfile'

export const MOMENTUM_STATES = ['new', 'exploring', 'committed', 'engaged'] as const
export type OnboardingMomentumState = (typeof MOMENTUM_STATES)[number]

export type OnboardingDirectionKey =
  | 'talk_to_people'
  | 'show_up_locally'
  | 'help_behind_scenes'
  | 'spread_the_word'

/** Internal map to volunteer_lanes.lane_key for HQ / Agent Jones context. */
export const DIRECTION_LANE_HINTS: Record<
  OnboardingDirectionKey,
  readonly string[]
> = {
  talk_to_people: ['power_of_five_evangelist', 'campaign_ambassador'],
  show_up_locally: ['voter_registration_county_captain', 'event_management'],
  help_behind_scenes: ['fundraising_hero', 'event_management'],
  spread_the_word: ['power_of_five_evangelist', 'campaign_ambassador'],
}

export type MomentumAction =
  | { type: 'set_direction'; key: OnboardingDirectionKey }
  | { type: 'set_micro'; key: string }
  | { type: 'advance_engaged'; mode: 'from_direction_skip' | 'from_micro_skip' | 'from_reinforce_done' }

export function normalizeMomentumState(raw: unknown): OnboardingMomentumState {
  const s = String(raw ?? 'new')
    .trim()
    .toLowerCase()
  if (s === 'exploring' || s === 'committed' || s === 'engaged') return s
  return 'new'
}

export type MicroCommitment = {
  key: string
  label: string
  response: string
}

const MICRO: Record<OnboardingDirectionKey, MicroCommitment[]> = {
  talk_to_people: [
    {
      key: 'text_two_people',
      label: 'Text 2 people you trust about why this race matters',
      response:
        'Small circle beats a blast. Two honest texts this week — your words, one HQ-approved link. That is enough to start momentum.',
    },
    {
      key: 'one_real_conversation',
      label: 'One real conversation (10 min) before Friday',
      response:
        'Listen first, then connect Chris’s priorities to what they care about locally. No debate homework — just human.',
    },
  ],
  show_up_locally: [
    {
      key: 'one_shift',
      label: 'Sign up for one shift (canvass, table, or office night)',
      response:
        'Pick one date you will not cancel. Showing up once builds rhythm; your captain can place you.',
    },
    {
      key: 'bring_buddy',
      label: 'Bring one friend to your first shift',
      response:
        'Pairing cuts nerves and doubles reach. Text them when/where — keep it light.',
    },
  ],
  help_behind_scenes: [
    {
      key: 'one_hour_admin',
      label: 'Offer 1 hour this week (data, calls, or event prep)',
      response:
        'Behind-the-scenes wins are about reliability. Name the hour and the skill — HQ matches you.',
    },
    {
      key: 'small_dollar_ask',
      label: 'One thoughtful small-dollar ask (your network only)',
      response:
        'Use finance-approved language only. One sincere ask beats ten awkward blasts.',
    },
  ],
  spread_the_word: [
    {
      key: 'share_story',
      label: 'Share one approved story + tag 2 locals',
      response:
        'Amplify HQ content; add one sentence in your voice about why it matters where you live.',
    },
    {
      key: 'invite_circle',
      label: 'Invite 3 people into a Power-of-5 loop',
      response:
        'Ask three people for one concrete step — not vague “support” — with a clear follow-up date.',
    },
  ],
}

export function getMicroCommitmentsForDirection(
  direction: string | null | undefined,
): MicroCommitment[] {
  const d = direction as OnboardingDirectionKey
  if (d && d in MICRO) return [...MICRO[d]]
  return []
}

export function findMicroCommitment(
  direction: string | null | undefined,
  microKey: string | null | undefined,
): MicroCommitment | null {
  if (!microKey) return null
  return getMicroCommitmentsForDirection(direction).find((m) => m.key === microKey) ?? null
}

export type MomentumGuidancePhase = 'direction' | 'micro' | 'reinforce' | null

export function getMomentumGuidancePhase(
  profile: CampaignProfile | null,
): MomentumGuidancePhase {
  if (!profile) return null
  const st = normalizeMomentumState(profile.onboarding_momentum_state)
  const dir = profile.onboarding_direction_key
    ? String(profile.onboarding_direction_key).trim()
    : ''
  const micro = profile.onboarding_micro_commitment_key
    ? String(profile.onboarding_micro_commitment_key).trim()
    : ''

  if (st === 'engaged') return null

  if (st === 'committed') return 'reinforce'

  if (st === 'new' || (st === 'exploring' && !dir)) return 'direction'

  if (st === 'exploring' && dir && !micro) return 'micro'

  return null
}
