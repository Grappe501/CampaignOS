import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import {
  isRegisteredArkansasVoterBranch,
  needsOnboardingPath,
} from './dashboardState'
import type { MomentumAction } from './onboardingEngine'
import {
  findMicroCommitment,
  getMicroCommitmentsForDirection,
  getMomentumGuidancePhase,
} from './onboardingEngine'

export type AgentJonesPrompt = {
  id: string
  label: string
  response: string
  /** Smooth-scroll to a dashboard section after the user picks this prompt */
  scrollToId?: string
  /** When set, this chip came from a prior AI reply (not the static roster bundle). */
  followUpSourceId?: string
  /** Persist guided momentum (no wizard; optional onboarding). */
  momentumAction?: MomentumAction
}

export type AgentJonesGuidanceBundle = {
  /** Short headline above the state explanation */
  greeting: string
  /** What the roster / workspace machinery thinks is going on */
  stateExplanation: string
  prompts: AgentJonesPrompt[]
}

export type AgentJonesGuidanceInput = {
  slice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
}

function orientationLeft(profile: CampaignProfile | null): boolean {
  return needsOnboardingPath(profile)
}

function buildMomentumOnboardingBundle(
  profile: CampaignProfile | null,
): AgentJonesGuidanceBundle | null {
  const phase = getMomentumGuidancePhase(profile)
  if (!phase) return null

  if (phase === 'direction') {
    return {
      greeting: 'Hey — I am Agent Jones. No forms, no homework.',
      stateExplanation:
        'Tap what sounds like you today. Everything is optional; the dashboard stays open either way. This just gives us direction.',
      prompts: [
        {
          id: 'mom-dir-talk',
          label: 'Talk to people',
          response:
            'Love it. Relationship organizing is our edge — small circles, honest asks, follow-up you actually do.',
          momentumAction: { type: 'set_direction', key: 'talk_to_people' },
        },
        {
          id: 'mom-dir-show',
          label: 'Show up locally',
          response:
            'Visibility matters — shifts, tables, office nights. We will get you one credible date on the calendar.',
          momentumAction: { type: 'set_direction', key: 'show_up_locally' },
        },
        {
          id: 'mom-dir-behind',
          label: 'Help behind the scenes',
          response:
            'Quiet work keeps the field loud — data, calls, finance, event prep. Reliability beats heroics.',
          momentumAction: { type: 'set_direction', key: 'help_behind_the_scenes' },
        },
        {
          id: 'mom-dir-spread',
          label: 'Spread the word',
          response:
            'Amplify truthfully — your voice plus HQ-approved content reaches people who already trust you.',
          momentumAction: { type: 'set_direction', key: 'spread_the_word' },
        },
        {
          id: 'mom-dir-browse',
          label: 'I will just look around first',
          response:
            'Perfect. Explore at your pace — voter path, training cards, whatever you need. Tap me anytime.',
          momentumAction: { type: 'advance_engaged', mode: 'from_direction_skip' },
        },
      ],
    }
  }

  if (phase === 'micro') {
    const dir = String(profile?.onboarding_direction_key ?? '').trim()
    const micros = getMicroCommitmentsForDirection(dir)
    const prompts: AgentJonesPrompt[] = micros.map((m) => ({
      id: `mom-micro-${m.id}`,
      label: m.title,
      response: m.response,
      scrollToId: m.targetSectionId,
      momentumAction: { type: 'set_micro', key: m.id },
    }))
    prompts.push({
      id: 'mom-micro-skip',
      label: 'Not today — keep it light',
      response:
        'No guilt. Momentum can wait. When you are ready, open this panel again and we will pick a smaller step.',
      momentumAction: { type: 'advance_engaged', mode: 'from_micro_skip' },
    })
    return {
      greeting: 'Quick next beat — pick one tiny commitment.',
      stateExplanation:
        'Micro-steps build trust. Choose one you can finish this week, or skip — nothing is gated.',
      prompts,
    }
  }

  const dir = String(profile?.onboarding_direction_key ?? '').trim()
  const microKey = String(profile?.onboarding_micro_commitment_key ?? '').trim()
  const picked = findMicroCommitment(dir, microKey)
  const reinforce =
    picked?.followUpReinforcementCopy ??
    `${picked?.title ?? 'Your step'} — keep it human, keep it honest.`

  return {
    greeting: 'You chose a real-world step — that is the whole game.',
    stateExplanation: `${reinforce} Small promises kept beat big promises broken.`,
    prompts: [
      {
        id: 'mom-ref-why',
        label: 'Why tiny steps win',
        response:
          'Campaigns are marathons dressed as sprints. One kept commitment builds the habit that scales your pod.',
      },
      {
        id: 'mom-ref-captain',
        label: 'Who do I tell when I am done?',
        response:
          'Your county captain or HQ contact — quick note is enough so we can celebrate and route the next ask.',
      },
      {
        id: 'mom-ref-got',
        label: 'On it — thanks',
        response:
          'That is momentum. I will stay out of your way — dashboard stays yours; tap me when you want the next nudge.',
        momentumAction: { type: 'advance_engaged', mode: 'from_reinforce_done' },
      },
    ],
  }
}

export function getAgentJonesGuidanceBundle(
  input: AgentJonesGuidanceInput,
): AgentJonesGuidanceBundle {
  const { slice, profile, voterLoading } = input

  if (voterLoading) {
    const momentumWhileLoading = buildMomentumOnboardingBundle(profile)
    if (momentumWhileLoading) return momentumWhileLoading
    return {
      greeting: 'Hang tight — I am syncing your roster link.',
      stateExplanation:
        'Your voter match status is still loading, so the dashboard temporarily treats you like an unmatched volunteer until we know more.',
      prompts: [
        {
          id: 'loading-what-checking',
          label: 'What are you checking right now?',
          response:
            'I am asking Supabase whether your account is linked to a row in the voter file (or an approved exception). Until that call finishes, cards stay in a safe default.',
        },
        {
          id: 'loading-can-read',
          label: 'Can I still read the page?',
          response:
            'Yes — scroll through verification, exceptions, and branch cards if they are visible. Avoid submitting duplicate forms until loading clears.',
        },
        {
          id: 'loading-stuck',
          label: 'If this stays on “loading”…',
          response:
            'Refresh once, confirm you are online, and retry. If it persists, ping a coordinator — the profile or voter edge function may need a look.',
        },
      ],
    }
  }

  const momentumBundle = buildMomentumOnboardingBundle(profile)
  if (momentumBundle) return momentumBundle

  if (slice === 'exception_pending') {
    return {
      greeting: 'Thanks for flagging it — your exception is in the queue.',
      stateExplanation:
        'A coordinator is reviewing your roster exception. Training previews stay open, but voter-gated tools remain locked until you are approved or you self-match.',
      prompts: [
        {
          id: 'ex-what-next',
          label: 'What happens next?',
          response:
            'A human reads your note, checks policy, then marks the request approved or denied. You will see the status field change on this dashboard when they act.',
          scrollToId: 'exception-request',
        },
        {
          id: 'ex-while-wait',
          label: 'What should I do while I wait?',
          response:
            'Skim evergreen training cards, read the next-step banner, and line up your captain conversation. Avoid starting gated canvass or data work until approval lands.',
        },
        {
          id: 'ex-self-match',
          label: 'Can I still self-match instead?',
          response:
            'Yes. If you find yourself in the voter file, complete self-match — that path can clear the gate without waiting on an exception.',
          scrollToId: 'voter-workspace',
        },
        {
          id: 'ex-view-status',
          label: 'Jump to my request',
          response:
            'Scrolling you to the exception card so you can re-read your note and watch for status updates.',
          scrollToId: 'exception-request',
        },
      ],
    }
  }

  if (slice === 'unmatched') {
    const reg = isRegisteredArkansasVoterBranch(profile)
    return {
      greeting: 'Almost there — finish roster clearance for your path.',
      stateExplanation: reg
        ? 'You chose the Arkansas voter path. Complete self-match in the voter workspace, or switch paths if that is no longer right.'
        : 'You chose a path that skips voter-file lookup. Coordinators clear you via the roster exception card.',
      prompts: [
        {
          id: 'un-how-verify',
          label: reg ? 'How do I verify?' : 'What goes in the exception?',
          response: reg
            ? 'Use the voter workspace: enter the details the form asks for so we can self-match against the public voter file.'
            : 'Short, honest context (youth, out-of-state supporter, staff placement, etc.) — nothing sensitive. Submit once and wait for review.',
          scrollToId: reg ? 'voter-workspace' : 'exception-request',
        },
        {
          id: 'un-not-in-file',
          label: reg ? 'I am not in the voter file' : 'Can I self-match instead?',
          response: reg
            ? 'Go back to the path selector, pick the option that fits (youth, remote, etc.), then use the roster exception flow.'
            : 'If you are actually in the Arkansas file, change your path to Registered Arkansas voter and use voter lookup.',
          scrollToId: reg ? 'onboarding-branch' : 'onboarding-branch',
        },
        {
          id: 'un-why-matter',
          label: 'Why does this matter?',
          response:
            'Campaigns keep elevated tools tied to real people. Self-match or an approved exception proves you belong in the roster before sensitive queues open.',
        },
        {
          id: 'un-go-verify',
          label: reg ? 'Take me to voter lookup' : 'Take me to roster exception',
          response: reg
            ? 'Scrolling you to the voter workspace so you can start or resume self-match.'
            : 'Scrolling you to the roster exception card.',
          scrollToId: reg ? 'voter-workspace' : 'exception-request',
        },
      ],
    }
  }

  if (slice === 'matched_no_branch') {
    return {
      greeting: 'Start with one choice — it sets up everything below.',
      stateExplanation:
        'Pick the volunteer path that fits you first. Arkansas-registered volunteers go to voter lookup next; everyone else starts roster exception instead.',
      prompts: [
        {
          id: 'mb-why-branch',
          label: 'Why is this first?',
          response:
            'It routes you to the right clearance step immediately so you are not asked to verify twice or in the wrong order.',
        },
        {
          id: 'mb-how-choose',
          label: 'How do I choose?',
          response:
            'Read each row, tap the option that fits, then save. You can discuss with your captain if you are unsure.',
          scrollToId: 'onboarding-branch',
        },
        {
          id: 'mb-wrong',
          label: 'What if I pick the wrong one?',
          response:
            'Tell your captain early. They can help you correct it before assignments harden.',
        },
        {
          id: 'mb-open-selector',
          label: 'Open the path selector',
          response: 'Scrolling you to the path card to finish the selection.',
          scrollToId: 'onboarding-branch',
        },
      ],
    }
  }

  // matched_ready
  if (orientationLeft(profile)) {
    return {
      greeting: 'Identity and branch are set — finish orientation next.',
      stateExplanation:
        'You are in the “ready” bucket for roster math, but workspace orientation (active space / onboarding status) still needs attention before we treat you as fully routed.',
      prompts: [
        {
          id: 'rd-orient-what',
          label: 'What is “orientation” here?',
          response:
            'It is the card stack under Training, tasks & team: confirm your active space and onboarding checkpoints with your captain so tasks land in the right pod.',
          scrollToId: 'workspace-cards',
        },
        {
          id: 'rd-orient-captain',
          label: 'Do I need my captain first?',
          response:
            'Usually yes — they confirm the space and status values you should enter. If you are solo for the moment, capture the best-known values and update later.',
        },
        {
          id: 'rd-orient-after',
          label: 'What unlocks after?',
          response:
            'Once orientation looks complete, first-task and training cards shift from “finish setup” copy into field-ready messaging — same deterministic rules, next chapter.',
        },
        {
          id: 'rd-orient-cards',
          label: 'Show the workspace cards',
          response:
            'Scrolling you to the training, tasks & team section.',
          scrollToId: 'workspace-cards',
        },
      ],
    }
  }

  return {
    greeting: 'You are cleared — I will keep the rails visible while work ramps.',
    stateExplanation:
      'Roster checks, branch, and orientation all look good for this slice. Future live routing will drop canvass or phone tasks here; for now I stay deterministic.',
    prompts: [
      {
        id: 'rd-ready-next',
        label: 'What should I do next?',
        response:
          'Stay in touch with your captain, watch for task drops, and run through Volunteer Basics when modules wire in. Use the next-step banner whenever you forget the order.',
      },
      {
        id: 'rd-ready-practice',
        label: 'How do I practice scripts?',
        response:
          'Use training placeholders and talk with your pod lead. Full script libraries will plug in later — I will keep answers grounded in what the dashboard already exposes.',
      },
      {
        id: 'rd-ready-jones',
        label: 'What can you do today?',
        response:
          'I mirror the same progression rules as the cards: greetings, explanations, and these buttons. Later, a server model can take over this slot without redesigning the shell.',
      },
      {
        id: 'rd-ready-workspace',
        label: 'Jump to workspace cards',
        response:
          'Scrolling you back to training, tasks & team for a quick status loop.',
        scrollToId: 'workspace-cards',
      },
    ],
  }
}

export function scrollToDashboardId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
