import type { CampaignProfile } from '../hooks/useProfile'
import type { AgentJonesScrollTargetId } from './agentJonesContext'

export { POWER5_ONBOARDING_HINT_KEYS } from './power5Model'

/** Lightweight engine states (additive to roster onboarding fields). */
export const ONBOARDING_ENGINE_STATES = [
  'new',
  'exploring',
  'committed',
  'engaged',
] as const
export type OnboardingEngineState = (typeof ONBOARDING_ENGINE_STATES)[number]

/** User-facing directional entry keys (canonical). */
export type OnboardingDirectionKey =
  | 'talk_to_people'
  | 'show_up_locally'
  | 'help_behind_the_scenes'
  | 'spread_the_word'

export type EngineDirectionConfig = {
  key: OnboardingDirectionKey
  label: string
  shortDescription: string
  /** Maps to volunteer_lanes.lane_key and future task paths. */
  laneKeys: readonly string[]
}

export const ENGINE_DIRECTIONS: readonly EngineDirectionConfig[] = [
  {
    key: 'talk_to_people',
    label: 'Talk to people',
    shortDescription:
      'Small circles, honest asks — relationship organizing is our edge.',
    laneKeys: ['power_of_five_evangelist', 'campaign_ambassador'],
  },
  {
    key: 'show_up_locally',
    label: 'Show up locally',
    shortDescription: 'Shifts, tables, office nights — visible, credible presence.',
    laneKeys: ['voter_registration_county_captain', 'event_management'],
  },
  {
    key: 'help_behind_the_scenes',
    label: 'Help behind the scenes',
    shortDescription: 'Data, calls, finance, prep — reliability beats heroics.',
    laneKeys: ['fundraising_hero', 'event_management'],
  },
  {
    key: 'spread_the_word',
    label: 'Spread the word',
    shortDescription: 'Your voice plus HQ-approved reach to people who trust you.',
    laneKeys: ['power_of_five_evangelist', 'campaign_ambassador'],
  },
] as const

export const ONBOARDING_DIRECTION_SLUGS: readonly OnboardingDirectionKey[] =
  ENGINE_DIRECTIONS.map((d) => d.key)

export const DIRECTION_LANE_HINTS: Record<
  OnboardingDirectionKey,
  readonly string[]
> = ENGINE_DIRECTIONS.reduce(
  (acc, d) => {
    acc[d.key] = d.laneKeys
    return acc
  },
  {} as Record<OnboardingDirectionKey, readonly string[]>,
)

export type MicroCommitment = {
  id: string
  title: string
  shortDescription: string
  suggestedDirection: OnboardingDirectionKey
  targetSectionId?: AgentJonesScrollTargetId
  followUpReinforcementCopy?: string
  /** Deterministic reply when the user taps this chip. */
  response: string
}

const MICRO_BY_DIRECTION: Record<OnboardingDirectionKey, MicroCommitment[]> = {
  talk_to_people: [
    {
      id: 'text_two_people',
      title: 'Text two people',
      shortDescription: 'Two honest texts this week — your words, one HQ link.',
      suggestedDirection: 'talk_to_people',
      targetSectionId: 'workspace-cards',
      followUpReinforcementCopy:
        'Small circle beats a blast. Two kept texts build the habit.',
      response:
        'Small circle beats a blast. Two honest texts this week — your words, one HQ-approved link. That is enough to start momentum.',
    },
    {
      id: 'invite_one_person',
      title: 'Invite one person',
      shortDescription: 'Ask one trusted person for a short real conversation.',
      suggestedDirection: 'talk_to_people',
      followUpReinforcementCopy:
        'One sincere invite beats a group blast — follow up with a time-bound ask.',
      response:
        'Pick one person who will actually pick up. Invite them to a short call or coffee — listen first, then connect the race to what they care about locally.',
    },
  ],
  show_up_locally: [
    {
      id: 'attend_one_event',
      title: 'Attend one event',
      shortDescription: 'One shift you will not cancel — canvass, table, or office night.',
      suggestedDirection: 'show_up_locally',
      targetSectionId: 'voter-workspace',
      followUpReinforcementCopy:
        'Showing up once builds rhythm; your captain can place you on the next one.',
      response:
        'Pick one date you will not cancel. Showing up once builds rhythm; your captain can place you.',
    },
    {
      id: 'help_at_one_table',
      title: 'Help at one table',
      shortDescription: 'Hold space at a single table or visibility shift.',
      suggestedDirection: 'show_up_locally',
      targetSectionId: 'workspace-cards',
      followUpReinforcementCopy:
        'Tables are practice — smile, scripts, and one clear ask per voter.',
      response:
        'One table shift is enough to learn the flow — arrive on time, stay curious, debrief with your captain after.',
    },
  ],
  help_behind_the_scenes: [
    {
      id: 'check_one_registration',
      title: 'Check one registration',
      shortDescription: 'Pair with HQ to verify or clean one registration row.',
      suggestedDirection: 'help_behind_the_scenes',
      targetSectionId: 'workspace-cards',
      followUpReinforcementCopy:
        'Clean data protects voters and saves field time — note what you verified.',
      response:
        'Offer one focused hour with HQ to verify a registration or data row. Reliability matters more than speed.',
    },
    {
      id: 'one_hour_admin',
      title: 'One hour behind the scenes',
      shortDescription: 'Data, calls, or event prep — name the hour and skill.',
      suggestedDirection: 'help_behind_the_scenes',
      targetSectionId: 'workspace-cards',
      followUpReinforcementCopy:
        'Behind-the-scenes wins are about showing up when you said you would.',
      response:
        'Behind-the-scenes wins are about reliability. Name the hour and the skill — HQ matches you.',
    },
  ],
  spread_the_word: [
    {
      id: 'share_one_post',
      title: 'Share one post',
      shortDescription: 'One HQ-approved story plus a line in your voice.',
      suggestedDirection: 'spread_the_word',
      targetSectionId: 'workspace-cards',
      followUpReinforcementCopy:
        'Amplify truthfully — your sentence localizes the message.',
      response:
        'Amplify HQ content; add one sentence in your voice about why it matters where you live.',
    },
    {
      id: 'invite_circle',
      title: 'Invite three for Power-of-Five',
      shortDescription: 'Three people, one concrete step each, with a follow-up date.',
      suggestedDirection: 'spread_the_word',
      followUpReinforcementCopy:
        'Loops compound — clear asks and dates keep the chain alive.',
      response:
        'Ask three people for one concrete step — not vague “support” — with a clear follow-up date.',
    },
  ],
}

const MICRO_LIST: MicroCommitment[] = []
for (const d of ENGINE_DIRECTIONS) {
  MICRO_LIST.push(...MICRO_BY_DIRECTION[d.key])
}

export function listAllMicroCommitments(): readonly MicroCommitment[] {
  return MICRO_LIST
}

/** Normalize DB / legacy direction strings to canonical keys. */
export function normalizeDirectionKey(
  raw: string | null | undefined,
): OnboardingDirectionKey | '' {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'help_behind_scenes') return 'help_behind_the_scenes'
  if (
    s === 'talk_to_people' ||
    s === 'show_up_locally' ||
    s === 'help_behind_the_scenes' ||
    s === 'spread_the_word'
  ) {
    return s
  }
  return ''
}

export function normalizeEngineState(raw: unknown): OnboardingEngineState {
  const s = String(raw ?? 'new')
    .trim()
    .toLowerCase()
  if (s === 'exploring' || s === 'committed' || s === 'engaged') return s
  return 'new'
}

export type EngineMomentumAction =
  | { type: 'set_direction'; key: OnboardingDirectionKey }
  | { type: 'set_micro'; key: string }
  | {
      type: 'advance_engaged'
      mode: 'from_direction_skip' | 'from_micro_skip' | 'from_reinforce_done'
    }

/** @deprecated Use EngineMomentumAction — kept for import stability. */
export type MomentumAction = EngineMomentumAction

export function getDirectionConfig(
  key: string | null | undefined,
): EngineDirectionConfig | null {
  const k = normalizeDirectionKey(key)
  if (!k) return null
  return ENGINE_DIRECTIONS.find((d) => d.key === k) ?? null
}

export function getMicroCommitmentsForDirection(
  direction: string | null | undefined,
): MicroCommitment[] {
  const k = normalizeDirectionKey(direction)
  if (!k) return []
  return [...MICRO_BY_DIRECTION[k]]
}

export function findMicroCommitment(
  direction: string | null | undefined,
  microId: string | null | undefined,
): MicroCommitment | null {
  if (!microId) return null
  const id = String(microId).trim()
  return (
    getMicroCommitmentsForDirection(direction).find((m) => m.id === id) ?? null
  )
}

export type OnboardingEnginePhase = 'direction' | 'micro' | 'reinforce' | null

export function getOnboardingEnginePhase(
  profile: CampaignProfile | null,
): OnboardingEnginePhase {
  if (!profile) return null
  const st = normalizeEngineState(profile.onboarding_momentum_state)
  const dir = normalizeDirectionKey(
    profile.onboarding_direction_key
      ? String(profile.onboarding_direction_key)
      : '',
  )
  const micro = profile.onboarding_micro_commitment_key
    ? String(profile.onboarding_micro_commitment_key).trim()
    : ''

  if (st === 'engaged') return null

  if (st === 'committed') return 'reinforce'

  if (st === 'new' || (st === 'exploring' && !dir)) return 'direction'

  if (st === 'exploring' && dir && !micro) return 'micro'

  return null
}

/** @deprecated Use getOnboardingEnginePhase */
export function getMomentumGuidancePhase(
  profile: CampaignProfile | null,
): OnboardingEnginePhase {
  return getOnboardingEnginePhase(profile)
}

export type OnboardingActivationCardModel = {
  phase: OnboardingEnginePhase | null
  headline: string
  body: string
  ctaLabel: string
  detail?: string
}

export function getOnboardingActivationCardModel(
  profile: CampaignProfile | null,
): OnboardingActivationCardModel {
  const phase = getOnboardingEnginePhase(profile)
  if (!phase) {
    return {
      phase: null,
      headline: 'You are rolling',
      body: 'Agent Jones stays one tap away if you want the next nudge.',
      ctaLabel: 'Open Agent Jones',
    }
  }
  if (phase === 'direction') {
    return {
      phase,
      headline: 'How do you want to start?',
      body: 'Pick a direction — no forms, no gate. Agent Jones will offer the next tiny step.',
      ctaLabel: 'Start with Agent Jones',
    }
  }
  if (phase === 'micro') {
    const dir = normalizeDirectionKey(
      profile?.onboarding_direction_key
        ? String(profile.onboarding_direction_key)
        : '',
    )
    const cfg = dir ? getDirectionConfig(dir) : null
    const first = dir ? getMicroCommitmentsForDirection(dir)[0] : null
    return {
      phase,
      headline: 'One small commitment',
      body: cfg
        ? `${cfg.label}: ${cfg.shortDescription}`
        : 'Pick one micro-step you can finish this week.',
      detail: first ? `Suggested: ${first.title} — ${first.shortDescription}` : undefined,
      ctaLabel: 'Choose in Agent Jones',
    }
  }
  const dir = normalizeDirectionKey(
    profile?.onboarding_direction_key
      ? String(profile.onboarding_direction_key)
      : '',
  )
  const microKey = profile?.onboarding_micro_commitment_key
    ? String(profile.onboarding_micro_commitment_key).trim()
    : ''
  const picked = findMicroCommitment(dir, microKey)
  return {
    phase,
    headline: 'Nice — you named a real step',
    body:
      picked?.followUpReinforcementCopy ??
      picked?.shortDescription ??
      'Keep it human. Tap Agent Jones when you are ready for the next nudge.',
    detail: picked ? picked.title : undefined,
    ctaLabel: 'Open Agent Jones',
  }
}

export type OnboardingAiExtras = {
  onboardingPrompt?: string
  selectedDirection?: string
  suggestedMicroCommitment?: { id: string; title: string }
  reinforcementMessage?: string
}

export function getOnboardingEngineAiExtras(
  profile: CampaignProfile | null,
): OnboardingAiExtras | undefined {
  const phase = getOnboardingEnginePhase(profile)
  if (!phase) return undefined
  const dirRaw = profile?.onboarding_direction_key
    ? String(profile.onboarding_direction_key)
    : ''
  const dir = normalizeDirectionKey(dirRaw)
  const microKey = profile?.onboarding_micro_commitment_key
    ? String(profile.onboarding_micro_commitment_key).trim()
    : ''

  if (phase === 'direction') {
    return {
      onboardingPrompt: 'direction_choice',
      reinforcementMessage:
        'Everything is optional — the dashboard stays open either way.',
    }
  }
  if (phase === 'micro') {
    const first = dir ? getMicroCommitmentsForDirection(dir)[0] : null
    return {
      onboardingPrompt: 'micro_suggestion',
      selectedDirection: dir || undefined,
      suggestedMicroCommitment: first
        ? { id: first.id, title: first.title }
        : undefined,
    }
  }
  const picked = findMicroCommitment(dir, microKey)
  return {
    onboardingPrompt: 'reinforcement',
    selectedDirection: dir || undefined,
    suggestedMicroCommitment: picked
      ? { id: picked.id, title: picked.title }
      : undefined,
    reinforcementMessage:
      picked?.followUpReinforcementCopy ?? picked?.shortDescription,
  }
}
