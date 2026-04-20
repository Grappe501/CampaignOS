import type { CampaignProfile } from '../hooks/useProfile'
import type { DevMockDashboardState } from './devAuth'
import type { StructuredWorkspaceRecord } from './workspaceStructured'

/** Same four buckets as dev mock dashboard presets — derived from live profile + voter match. */
export type DashboardProgressSlice = DevMockDashboardState

export type WorkspaceCardModel = {
  title: string
  explanation: string
  primaryCta?: { label: string; targetId: string }
  statusLabel?: string
  /** Optional line under title (e.g. structured workspace record status). */
  metaLine?: string
}

function mergeStructuredWorkspaceCard(
  base: WorkspaceCardModel,
  structured: StructuredWorkspaceRecord | null | undefined,
): WorkspaceCardModel {
  if (!structured?.title?.trim()) return base
  const title = structured.title.trim()
  const metaLine = `Record: ${structured.status}`
  const parts = [structured.description?.trim() || null, base.explanation.trim()].filter(
    Boolean,
  ) as string[]
  return {
    title,
    metaLine,
    explanation: parts.join('\n\n'),
    ...(base.primaryCta ? { primaryCta: base.primaryCta } : {}),
    ...(base.statusLabel ? { statusLabel: base.statusLabel } : {}),
  }
}

export const ONBOARDING_BRANCH_OPTIONS = [
  {
    value: 'registered_arkansas_voter',
    label: 'Registered Arkansas voter',
    hint: 'I appear in the state voter file and can self-verify.',
  },
  {
    value: 'eligible_not_registered',
    label: 'Eligible, not registered yet',
    hint: 'I live / organize here but need to register before Election Day.',
  },
  {
    value: 'under_18_youth',
    label: 'Under-18 youth',
    hint: 'Student or youth volunteer building skills before voting age.',
  },
  {
    value: 'out_of_state_supporter',
    label: 'Out-of-state supporter',
    hint: 'Remote help (calls, data, design) without an Arkansas voter ID.',
  },
  {
    value: 'staff_admin_direct_placement',
    label: 'Staff / admin placement',
    hint: 'Campaign HQ or partner org placed my account directly.',
  },
] as const

export type OnboardingBranchValue =
  (typeof ONBOARDING_BRANCH_OPTIONS)[number]['value']

export type NextStepKind =
  | 'loading'
  | 'exception_pending'
  | 'verify_voter'
  | 'roster_exception'
  | 'select_branch'
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

export function normalizeKey(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

/** Stored in `campaign_profiles.onboarding_branch` — voter self-match path. */
export const REGISTERED_ARKANSAS_VOTER_BRANCH = 'registered_arkansas_voter' as const

export function needsOnboardingBranchSelection(profile: CampaignProfile | null): boolean {
  return !normalizeKey(profile?.onboarding_branch)
}

export function isRegisteredArkansasVoterBranch(profile: CampaignProfile | null): boolean {
  return normalizeKey(profile?.onboarding_branch) === REGISTERED_ARKANSAS_VOTER_BRANCH
}

export function hasProgressIdentity(
  voterMatched: boolean,
  exceptionStatus: unknown,
): boolean {
  return voterMatched || normalizeKey(exceptionStatus) === 'approved'
}

export function isExceptionPending(exceptionStatus: unknown): boolean {
  return normalizeKey(exceptionStatus) === 'pending'
}

/** Volunteer tier is always allowed to participate at base level. */
export function parsePrimaryTier(
  role: unknown,
): 'volunteer' | 'elevated' {
  const r = normalizeKey(role)
  if (!r || r.includes('volunteer') || r === 'member' || r === 'supporter') {
    return 'volunteer'
  }
  return 'elevated'
}

/**
 * Elevated campaign actions (beyond base volunteer) require voter match or approved exception.
 */
export function isElevatedProgressionAllowed(
  voterMatched: boolean,
  exceptionStatus: unknown,
): boolean {
  return hasProgressIdentity(voterMatched, exceptionStatus)
}

export function progressionGateMessage(
  voterMatched: boolean,
  exceptionStatus: unknown,
  role: unknown,
): string | null {
  if (parsePrimaryTier(role) === 'volunteer') return null
  if (isElevatedProgressionAllowed(voterMatched, exceptionStatus)) return null
  return 'Elevated roles need a verified voter match or an approved roster exception before certain tools unlock.'
}

/** Workspace / orientation card path (separate from branch selection). */
export function needsOnboardingPath(profile: CampaignProfile | null): boolean {
  if (!profile) return false
  const status = normalizeKey(profile.onboarding_status)
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
  const space = normalizeKey(profile.active_space)
  if (!space) return true
  return false
}

export function getNextStep(input: {
  profile: CampaignProfile | null
  voterMatched: boolean
  voterLoading: boolean
}): NextStep {
  const { profile, voterMatched, voterLoading } = input
  const ex = profile?.exception_request_status

  if (voterLoading) {
    return {
      kind: 'loading',
      title: 'Setting up your workspace',
      description: 'Checking your voter link and profile…',
    }
  }

  if (isExceptionPending(ex)) {
    return {
      kind: 'exception_pending',
      title: 'Roster exception in review',
      description:
        'A coordinator will review your request. You can still explore training cards, but voter-gated tools stay locked until you are approved or you complete self-match.',
      ctaLabel: 'View request status',
      ctaTargetId: 'exception-request',
    }
  }

  if (needsOnboardingBranchSelection(profile)) {
    return {
      kind: 'select_branch',
      title: 'Start here: choose your volunteer path',
      description:
        'Registered Arkansas voters continue to voter ID self-match. Other paths use a short roster exception instead — same page, clearer order.',
      ctaLabel: 'Open path selector',
      ctaTargetId: 'onboarding-branch',
    }
  }

  const identity = hasProgressIdentity(voterMatched, ex)

  if (!identity && isRegisteredArkansasVoterBranch(profile)) {
    return {
      kind: 'verify_voter',
      title: 'Find your record in the voter file',
      description:
        'Use the voter lookup below with your name, date of birth, and county so we can link your registration.',
      ctaLabel: 'Go to voter lookup',
      ctaTargetId: 'voter-workspace',
    }
  }

  if (!identity) {
    return {
      kind: 'roster_exception',
      title: 'Request roster clearance for your path',
      description:
        'Your path does not use voter-file self-match. Add a short note for coordinators — they will approve or follow up.',
      ctaLabel: 'Open roster exception',
      ctaTargetId: 'exception-request',
    }
  }

  if (needsOnboardingPath(profile)) {
    return {
      kind: 'choose_onboarding',
      title: 'Finish workspace orientation',
      description:
        'Confirm your active space and onboarding status with your captain, then work through the training and first-task cards below.',
      ctaLabel: 'Open training & tasks',
      ctaTargetId: 'workspace-cards',
    }
  }

  return {
    kind: 'ready',
    title: 'You are clear to move forward',
    description:
      'Branch saved, identity on file, and orientation looks good. Use Agent Jones for quick help and the sections below for missions, daily work, and goals.',
    ctaLabel: 'Open Agent Jones',
    ctaTargetId: 'agent-jones',
  }
}

/**
 * Progression slice for workspace cards — aligns with dev mock states when bypass presets are used.
 * Order: loading is handled by callers; then exception, identity, branch, then "ready" bucket.
 */
export function getDashboardProgressSlice(input: {
  profile: CampaignProfile | null
  voterMatched: boolean
  voterLoading: boolean
}): DashboardProgressSlice {
  const { profile, voterMatched, voterLoading } = input
  const ex = profile?.exception_request_status

  if (voterLoading) {
    return 'unmatched'
  }
  if (isExceptionPending(ex)) {
    return 'exception_pending'
  }
  if (needsOnboardingBranchSelection(profile)) {
    return 'matched_no_branch'
  }
  if (!hasProgressIdentity(voterMatched, ex)) {
    return 'unmatched'
  }
  return 'matched_ready'
}

export function getFirstTaskCardModel(input: {
  slice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  /** When set (non-null object), title/body prefer DB-backed task; CTAs stay from deterministic slice. */
  structured?: StructuredWorkspaceRecord | null
}): WorkspaceCardModel {
  const { slice, profile, voterLoading, structured } = input

  if (voterLoading) {
    return {
      title: 'Pulling your workspace tasks',
      explanation:
        'We are confirming your voter link and roster state before showing the next assignment.',
      statusLabel: 'Loading',
    }
  }

  if (slice === 'exception_pending') {
    return mergeStructuredWorkspaceCard(
      {
        title: 'First task after roster clearance',
        explanation:
          'While your exception is reviewed, task routing stays paused so assignments are not sent to the wrong queue.',
        primaryCta: {
          label: 'View exception status',
          targetId: 'exception-request',
        },
      },
      structured,
    )
  }

  if (slice === 'unmatched') {
    const reg = isRegisteredArkansasVoterBranch(profile)
    return mergeStructuredWorkspaceCard(
      {
        title: reg
          ? 'Verify identity to receive tasks'
          : 'Roster clearance for your path',
        explanation: reg
          ? 'Complete voter self-match below, or switch your path if you need a coordinator exception instead.'
          : 'Submit a short roster exception. Coordinators approve paths that do not use the Arkansas voter file.',
        primaryCta: {
          label: reg ? 'Go to voter lookup' : 'Open roster exception',
          targetId: reg ? 'voter-workspace' : 'exception-request',
        },
      },
      structured,
    )
  }

  if (slice === 'matched_no_branch') {
    return mergeStructuredWorkspaceCard(
      {
        title: 'Pick your path first',
        explanation:
          'One choice routes you to voter lookup or to a coordinator exception — then tasks and training align with how you are joining the campaign.',
        primaryCta: {
          label: 'Open path selector',
          targetId: 'onboarding-branch',
        },
      },
      structured,
    )
  }

  const orientationLeft = needsOnboardingPath(profile)
  if (orientationLeft) {
    return mergeStructuredWorkspaceCard(
      {
        title: 'Finish orientation — then your first assignment',
        explanation:
          'Confirm your active space and onboarding check-ins with your captain so tasks land in the correct pod.',
        primaryCta: {
          label: 'Open workspace orientation',
          targetId: 'workspace-cards',
        },
      },
      structured,
    )
  }

  const ready: WorkspaceCardModel = {
    title: 'Stand-by: first field task',
    explanation:
      'You are cleared. When routing goes live, your captain will drop canvass or phone tasks here — for now, use Agent Jones for practice.',
    primaryCta: {
      label: 'Open Agent Jones',
      targetId: 'agent-jones',
    },
  }
  return mergeStructuredWorkspaceCard(ready, structured)
}

export function getTrainingCardModel(input: {
  slice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  structured?: StructuredWorkspaceRecord | null
}): WorkspaceCardModel {
  const { slice, profile, voterLoading, structured } = input

  if (voterLoading) {
    return {
      title: 'Loading your learning path',
      explanation:
        'Training modules are tied to your roster state so we only surface what you are allowed to see.',
      statusLabel: 'Loading',
    }
  }

  if (slice === 'exception_pending') {
    return mergeStructuredWorkspaceCard(
      {
        title: 'Training preview while you wait',
        explanation:
          'You can skim evergreen content now; role-specific tracks and attestations unlock after match or approved exception.',
        statusLabel: 'Partial access — verification pending',
      },
      structured,
    )
  }

  if (slice === 'unmatched') {
    const reg = isRegisteredArkansasVoterBranch(profile)
    return mergeStructuredWorkspaceCard(
      {
        title: 'Training unlocks with roster clearance',
        explanation: reg
          ? 'Finish voter self-match (or an approved exception if you change paths) to open Volunteer Basics and tool walkthroughs.'
          : 'After coordinators approve your exception, training tracks unlock for your volunteer path.',
        primaryCta: {
          label: reg ? 'Go to voter lookup' : 'Open roster exception',
          targetId: reg ? 'voter-workspace' : 'exception-request',
        },
      },
      structured,
    )
  }

  if (slice === 'matched_no_branch') {
    return mergeStructuredWorkspaceCard(
      {
        title: 'Choose your path for tailored training',
        explanation:
          'Canvass, remote, and youth tracks differ — pick the option that fits you first, then verification or roster clearance.',
        primaryCta: {
          label: 'Select your path',
          targetId: 'onboarding-branch',
        },
      },
      structured,
    )
  }

  const orientationLeft = needsOnboardingPath(profile)
  if (orientationLeft) {
    return mergeStructuredWorkspaceCard(
      {
        title: 'Core modules after orientation',
        explanation:
          'Finish the workspace orientation cards below — then Volunteer Basics and tool walkthroughs will show as your assigned path.',
        primaryCta: {
          label: 'Go to orientation cards',
          targetId: 'workspace-cards',
        },
      },
      structured,
    )
  }

  return mergeStructuredWorkspaceCard(
    {
      title: 'Volunteer Basics — start here',
      explanation:
        'Complete the intro track, then branch into canvass or phone scripts. Articulate embeds wire up in a later slice.',
      primaryCta: {
        label: 'Jump to Agent Jones',
        targetId: 'agent-jones',
      },
    },
    structured,
  )
}
