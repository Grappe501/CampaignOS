import type { CampaignProfile } from '../hooks/useProfile'

export type NextStepKind =
  | 'loading'
  | 'verify_voter'
  | 'choose_onboarding'
  | 'ready'

export type NextStep = {
  kind: NextStepKind
  title: string
  description: string
  ctaLabel?: string
  ctaTargetId?: string
}

const ONBOARDING_DONE = new Set(['complete', 'completed', 'done', 'verified'])

function normalize(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

/** True when voter is linked but campaign onboarding path should still be chosen. */
export function needsOnboardingPath(profile: CampaignProfile | null): boolean {
  if (!profile) return false
  const status = normalize(profile.onboarding_status)
  if (!status) return true
  if (ONBOARDING_DONE.has(status)) return false
  if (status === 'in_progress') return false
  if (
    status === 'not_started' ||
    status === 'pending' ||
    status === 'unstarted'
  ) {
    return true
  }
  const space = normalize(profile.active_space)
  if (!space) return true
  return false
}

export function getNextStep(input: {
  profile: CampaignProfile | null
  voterMatched: boolean
  voterLoading: boolean
}): NextStep {
  const { profile, voterMatched, voterLoading } = input

  if (voterLoading) {
    return {
      kind: 'loading',
      title: 'Setting up your workspace',
      description: 'Checking your voter link and profile…',
    }
  }

  if (!voterMatched) {
    return {
      kind: 'verify_voter',
      title: 'Verify your voter registration',
      description:
        'Link your legal name and date of birth to the voter file so we can personalize precinct, districts, and turnout tools for you.',
      ctaLabel: 'Go to verification',
      ctaTargetId: 'voter-workspace',
    }
  }

  if (needsOnboardingPath(profile)) {
    return {
      kind: 'choose_onboarding',
      title: 'Choose your onboarding path',
      description:
        'Select how you want to plug in (training, team, tasks). This slice only surfaces cards — the full guided flow comes later.',
      ctaLabel: 'Review workspace cards',
      ctaTargetId: 'workspace-cards',
    }
  }

  return {
    kind: 'ready',
    title: 'You are set for this slice',
    description:
      'Voter link and onboarding snapshot look good. Use Agent Jones and the cards below while we finish email verification in the background.',
    ctaLabel: 'Jump to Agent Jones',
    ctaTargetId: 'agent-jones',
  }
}
