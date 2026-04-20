import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from './dashboardState'
import { needsOnboardingPath } from './dashboardState'

export type AgentJonesPrompt = {
  id: string
  label: string
  response: string
  /** Smooth-scroll to a dashboard section after the user picks this prompt */
  scrollToId?: string
  /** When set, this chip came from a prior AI reply (not the static roster bundle). */
  followUpSourceId?: string
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

export function getAgentJonesGuidanceBundle(
  input: AgentJonesGuidanceInput,
): AgentJonesGuidanceBundle {
  const { slice, profile, voterLoading } = input

  if (voterLoading) {
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
    return {
      greeting: 'Let us anchor your identity before we route real tasks.',
      stateExplanation:
        'You do not yet have a voter file match or an approved roster exception, so the workspace keeps you in verification-first mode.',
      prompts: [
        {
          id: 'un-how-verify',
          label: 'How do I verify?',
          response:
            'Use the voter workspace below: enter the details the form asks for so we can attempt a self-match against the public voter file.',
          scrollToId: 'voter-workspace',
        },
        {
          id: 'un-not-in-file',
          label: 'I am not in the voter file',
          response:
            'Use the roster exception card. Short, honest context (youth, out-of-state supporter, staff placement, etc.) helps coordinators approve faster.',
          scrollToId: 'exception-request',
        },
        {
          id: 'un-why-matter',
          label: 'Why does this matter?',
          response:
            'Campaigns must keep elevated tools tied to real people. Self-match or an approved exception proves you belong in the roster before sensitive queues open.',
        },
        {
          id: 'un-go-verify',
          label: 'Take me to verification',
          response:
            'Scrolling you to the voter workspace block so you can start or resume self-match.',
          scrollToId: 'voter-workspace',
        },
      ],
    }
  }

  if (slice === 'matched_no_branch') {
    return {
      greeting: 'Great — you are matched. One more fork before routing deepens.',
      stateExplanation:
        'Your voter identity is on file, but onboarding branch is still empty. Captains use that branch to pick playbooks, training tracks, and pod defaults.',
      prompts: [
        {
          id: 'mb-why-branch',
          label: 'Why pick a branch?',
          response:
            'It tells HQ whether you are Arkansas-registered, remote support, youth, staff-placed, etc. Each path unlocks different cards and future task types.',
        },
        {
          id: 'mb-how-choose',
          label: 'How do I choose?',
          response:
            'Read each row, tap the option that fits, then save once. You can discuss with your captain if you are unsure — honesty beats guessing.',
          scrollToId: 'onboarding-branch',
        },
        {
          id: 'mb-wrong',
          label: 'What if I pick the wrong one?',
          response:
            'Tell your captain early. They can help you correct it before assignments harden — better now than after canvass lists are cut.',
        },
        {
          id: 'mb-open-selector',
          label: 'Open the branch selector',
          response:
            'Scrolling you to the onboarding branch card so you can finish the selection.',
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
