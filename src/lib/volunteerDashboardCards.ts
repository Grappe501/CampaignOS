import type { CampaignProfile } from '../hooks/useProfile'
import {
  normalizeKey,
  ONBOARDING_BRANCH_OPTIONS,
  type OnboardingBranchValue,
  hasProgressIdentity,
  isExceptionPending,
  isRegisteredArkansasVoterBranch,
  needsOnboardingPath,
} from './dashboardState'

export type VolunteerPathCardAction = {
  label: string
  /** `DashboardPanelFrame` `scrollId` / anchor id */
  scrollId: string
}

export type VolunteerPathCard = {
  id: string
  title: string
  whyItMatters: string
  statusLine?: string
  nextMove?: string
  action?: VolunteerPathCardAction
}

export type VolunteerPathCardsContext = {
  profile: CampaignProfile | null
  voterLoading: boolean
  voterMatched: boolean
  hasActiveMissionTasks: boolean
  missionTasksLoading: boolean
  hasPendingDailyTask: boolean
  dailyMissionLoading: boolean
  power5HasNodes: boolean
  power5Loading: boolean
}

function branchDisplayLabel(profile: CampaignProfile | null): string {
  const k = normalizeKey(profile?.onboarding_branch)
  const opt = ONBOARDING_BRANCH_OPTIONS.find((o) => o.value === k)
  return opt?.label ?? 'Your path'
}

function resolveOnboardingBranch(
  raw: string | null | undefined,
): OnboardingBranchValue | null {
  const k = normalizeKey(raw)
  const opt = ONBOARDING_BRANCH_OPTIONS.find((o) => o.value === k)
  return opt ? opt.value : null
}

export function getVolunteerGlobalCards(
  ctx: VolunteerPathCardsContext,
): VolunteerPathCard[] {
  if (ctx.voterLoading) {
    return [
      {
        id: 'global-loading',
        title: 'Syncing your workspace',
        whyItMatters:
          'These cards stay tied to your roster state, orientation, and assignments — nothing here is decorative.',
        statusLine: 'Loading roster and profile signals…',
        nextMove:
          'When the header finishes loading, guidance below will match your real state.',
      },
    ]
  }

  const profile = ctx.profile
  const branchSet = Boolean(normalizeKey(profile?.onboarding_branch))
  const pending = isExceptionPending(profile?.exception_request_status)
  const identity = hasProgressIdentity(ctx.voterMatched, profile?.exception_request_status)
  const ra = isRegisteredArkansasVoterBranch(profile)
  const orientNeed = needsOnboardingPath(profile)

  const cards: VolunteerPathCard[] = []

  cards.push({
    id: 'global-volunteer-path',
    title: 'Choose and keep your volunteer path accurate',
    whyItMatters:
      'One path choice routes you to voter self-match or coordinator clearance — everything downstream keys off it.',
    statusLine: branchSet
      ? `Path: ${branchDisplayLabel(profile)}`
      : 'Path not saved yet.',
    nextMove: branchSet
      ? 'If your situation changed (moved, new role), update this with your captain so tools stay aligned.'
      : 'Select the option that matches how you are joining the campaign.',
    action: branchSet
      ? {
          label: 'See path in workspace snapshot',
          scrollId: 'workspace-summary',
        }
      : { label: 'Open path selector', scrollId: 'onboarding-branch' },
  })

  if (branchSet) {
    if (pending) {
      cards.push({
        id: 'global-roster-pending',
        title: 'Roster exception in review',
        whyItMatters:
          'Coordinators match your account to the right queue before voter-gated assignments flow.',
        statusLine: 'Submitted — review in progress.',
        nextMove:
          'Skim training and orientation cards while you wait; mission routing opens after approval or a successful self-match.',
        action: { label: 'View exception status', scrollId: 'exception-request' },
      })
    } else if (!identity) {
      cards.push({
        id: 'global-roster-clearance',
        title: ra ? 'Confirm your voter record' : 'Request roster clearance',
        whyItMatters: ra
          ? 'Linking your Arkansas voter file record unlocks turf, tasks, and training meant for matched volunteers.'
          : 'Paths outside the state voter file still need coordinator approval so assignments stay compliant.',
        statusLine: ra
          ? 'Self-match in the voter workspace when you are ready.'
          : 'Submit a short roster exception with context for HQ.',
        nextMove: ra
          ? 'Use name, date of birth, and county as printed on your registration.'
          : 'Note your role and how you will help so coordinators can approve quickly.',
        action: ra
          ? { label: 'Go to voter lookup', scrollId: 'voter-workspace' }
          : { label: 'Open roster exception', scrollId: 'exception-request' },
      })
    } else {
      cards.push({
        id: 'global-roster-ready',
        title: 'Roster and voter link on file',
        whyItMatters:
          'Matched or approved volunteers move faster because captains can assign without extra paperwork.',
        statusLine: 'Cleared for this workspace.',
        nextMove:
          'Expand the voter workspace if you need to refresh details after a move or name change.',
        action: { label: 'Open voter status', scrollId: 'voter-status-card' },
      })
    }
  }

  cards.push({
    id: 'global-profile-readiness',
    title: 'Profile and workspace readiness',
    whyItMatters:
      'Orientation captures your active space and check-ins so tasks land in the correct pod.',
    statusLine: !identity
      ? 'Waiting on roster clearance.'
      : orientNeed
        ? 'Orientation still in progress.'
        : 'Orientation looks complete from saved fields.',
    nextMove: !identity
      ? 'Finish voter match or roster approval first — then knock out orientation with your captain.'
      : orientNeed
        ? 'Work through the activation card and snapshot so your team sees the same picture you do.'
        : 'Keep the workspace snapshot updated when your role or space changes.',
    action: !identity
      ? ra
        ? { label: 'Go to voter lookup', scrollId: 'voter-workspace' }
        : { label: 'Open roster exception', scrollId: 'exception-request' }
      : orientNeed
        ? { label: 'Open get started', scrollId: 'onboarding-activation' }
        : { label: 'Review workspace snapshot', scrollId: 'workspace-summary' },
  })

  const missionBlocked = !identity || pending
  cards.push({
    id: 'global-mission-tasks',
    title: 'Mission tasks',
    whyItMatters:
      'Claimable assignments are how the campaign moves measurable work without losing context.',
    statusLine: missionBlocked
      ? 'Locked until roster clearance completes.'
      : orientNeed
        ? 'Unblocks after orientation is finished.'
        : ctx.missionTasksLoading
          ? 'Loading assignments…'
          : ctx.hasActiveMissionTasks
            ? 'Work is waiting on your board.'
            : 'No open assignments — check back or ask your captain.',
    nextMove: missionBlocked
      ? ra
        ? 'Complete voter self-match or wait for exception approval.'
        : 'Submit or monitor your roster exception.'
      : orientNeed
        ? 'Finish orientation, then return here for the next claim.'
        : ctx.hasActiveMissionTasks
          ? 'Claim the top item and move it to done when the checklist is satisfied.'
          : 'Scan the board daily; new drops often follow turf or phone shifts.',
    action: missionBlocked
      ? ra
        ? { label: 'Go to voter lookup', scrollId: 'voter-workspace' }
        : { label: 'Open roster exception', scrollId: 'exception-request' }
      : orientNeed
        ? { label: 'Open get started', scrollId: 'onboarding-activation' }
        : { label: 'Open mission board', scrollId: 'mission-tasks' },
  })

  cards.push({
    id: 'global-daily-activation',
    title: 'Daily activation',
    whyItMatters:
      'Short daily commitments build streaks and keep you sharp across lanes without burning you out.',
    statusLine: missionBlocked
      ? 'Starts after roster clearance.'
      : orientNeed
        ? 'Starts after orientation.'
        : ctx.dailyMissionLoading
          ? 'Loading today’s lanes…'
          : ctx.hasPendingDailyTask
            ? 'You still have an open daily task.'
            : 'All set for today’s checklist — come back tomorrow.',
    nextMove: missionBlocked || orientNeed
      ? 'Clear the gates above first.'
      : ctx.hasPendingDailyTask
        ? 'Finish the pending item to protect your streak.'
        : 'Preview tomorrow’s plan or skim campaign goals while you wait.',
    action:
      missionBlocked || orientNeed
        ? orientNeed
          ? { label: 'Open get started', scrollId: 'onboarding-activation' }
          : ra
            ? { label: 'Go to voter lookup', scrollId: 'voter-workspace' }
            : { label: 'Open roster exception', scrollId: 'exception-request' }
        : { label: 'Open daily activation', scrollId: 'daily-activation' },
  })

  cards.push({
    id: 'global-power5',
    title: 'Build your Power of 5',
    whyItMatters:
      'Relational organizing turns your trusted contacts into a accountable ladder — the campaign’s multiplier.',
    statusLine: missionBlocked
      ? 'Unlocks after roster clearance.'
      : ctx.power5Loading
        ? 'Loading network workspace…'
        : ctx.power5HasNodes
          ? 'Network workspace is active — keep stages honest.'
          : 'You have not started your first five yet.',
    nextMove: missionBlocked
      ? 'Finish identity steps first so saves sync to the right profile.'
      : ctx.power5HasNodes
        ? 'Advance each relationship with honest notes and next steps.'
        : 'Add your first contacts and mark where each person stands.',
    action: missionBlocked
      ? ra
        ? { label: 'Go to voter lookup', scrollId: 'voter-workspace' }
        : { label: 'Open roster exception', scrollId: 'exception-request' }
      : { label: 'Open Power of 5', scrollId: 'power5-workspace' },
  })

  cards.push({
    id: 'global-training-field',
    title: 'Training and first field moves',
    whyItMatters:
      'Structured training and the first-task card stay aligned with your roster state so you do not skip compliance steps.',
    statusLine: missionBlocked
      ? 'Preview-only until roster clearance.'
      : orientNeed
        ? 'Deepen training while you finish orientation checkpoints.'
        : 'Ready for full tracks and practice prompts.',
    nextMove:
      'Use the training and first-task cards together — they share the same scroll area for quick jumps.',
    action: { label: 'Open training & tasks', scrollId: 'workspace-cards' },
  })

  return cards
}

export function getBranchSpecialtyCards(
  onboardingBranch: string | null | undefined,
  ctx: VolunteerPathCardsContext,
): VolunteerPathCard[] {
  const branch = resolveOnboardingBranch(onboardingBranch)
  if (!branch) return []

  if (ctx.voterLoading) {
    return []
  }

  const profile = ctx.profile
  const pending = isExceptionPending(profile?.exception_request_status)
  const identity = hasProgressIdentity(ctx.voterMatched, profile?.exception_request_status)

  const builders: Record<
    OnboardingBranchValue,
    () => VolunteerPathCard[]
  > = {
    registered_arkansas_voter: () => [
      {
        id: 'branch-ra-file',
        title: 'Stay aligned with your voter file record',
        whyItMatters:
          'Canvass and turf assignments assume your registration data matches what the county has on file.',
        statusLine: identity
          ? ctx.voterMatched
            ? 'Linked — keep details current if you move or update registration.'
            : 'Approved exception on file — confirm details with your captain if anything shifts.'
          : pending
            ? 'Waiting on coordinator review before voter tools fully unlock.'
            : 'Link your record to light up voter-specific tasks.',
        nextMove: ctx.voterMatched
          ? 'Skim your voter snapshot and expand the workspace if something looks off.'
          : 'Use voter lookup when you are ready to self-match.',
        action: ctx.voterMatched
          ? { label: 'Open voter workspace', scrollId: 'voter-workspace' }
          : { label: 'Go to voter lookup', scrollId: 'voter-workspace' },
      },
      {
        id: 'branch-ra-officials',
        title: 'Know who represents you',
        whyItMatters:
          'Accountability starts with knowing which offices appear on your ballot and how to reach them.',
        statusLine: ctx.voterMatched
          ? 'Officials list is available after your record is linked.'
          : 'Appears once your voter record is linked.',
        nextMove: ctx.voterMatched
          ? 'Use the public officials card for district context before you knock doors or make calls.'
          : 'Finish voter lookup first so district data can load.',
        action: ctx.voterMatched
          ? { label: 'Open public officials', scrollId: 'public-officials-card' }
          : { label: 'Go to voter lookup', scrollId: 'voter-workspace' },
      },
    ],
    eligible_not_registered: () => [
      {
        id: 'branch-enr-register',
        title: 'Plan your registration window',
        whyItMatters:
          'Arkansas deadlines decide whether you can vote in this cycle — the campaign can help you navigate the steps.',
        statusLine:
          'You selected the eligible, not-yet-registered path — HQ will steer you through compliance-friendly actions.',
        nextMove:
          'Coordinate with your captain on registration drives; keep your roster exception updated if plans change.',
        action: identity
          ? { label: 'Open mission board', scrollId: 'mission-tasks' }
          : { label: 'Submit roster details', scrollId: 'exception-request' },
      },
      {
        id: 'branch-enr-assignments',
        title: 'Assignments follow roster clearance',
        whyItMatters:
          'Until coordinators understand your registration plan, voter-gated tasks stay paused to protect you and the data.',
        statusLine: identity
          ? 'Cleared — mission board and daily activation behave like any other volunteer once orientation finishes.'
          : pending
            ? 'Review in progress.'
            : 'Submit your exception with context about when you intend to register.',
        nextMove: identity
          ? 'Jump to missions after orientation; ask your captain for registration-specific turf if offered.'
          : 'Complete the roster exception flow before expecting field tasks.',
        action: { label: 'Open mission board', scrollId: 'mission-tasks' },
      },
    ],
    under_18_youth: () => [
      {
        id: 'branch-youth-leadership',
        title: 'Leadership without a ballot — yet',
        whyItMatters:
          'You can still move real metrics through relays, events, and digital organizing while building skills for future cycles.',
        statusLine: 'Youth path selected — focus on coachable, safe assignments.',
        nextMove:
          'Pair with a captain or parent sponsor for field shifts; keep your roster note current.',
        action: { label: 'Open get started', scrollId: 'onboarding-activation' },
      },
      {
        id: 'branch-youth-roster',
        title: 'Roster clearance protects you and the data',
        whyItMatters:
          'Campaigns must know who is eligible for which tools — youth volunteers use coordinator approval instead of voter-file match.',
        statusLine: identity
          ? 'Exception approved or on file — follow the same mission rhythm as other cleared volunteers.'
          : pending
            ? 'Exception submitted.'
            : 'Submit a short roster exception describing guardian or school partner context.',
        nextMove: identity
          ? 'Pick up mission tasks once orientation is done.'
          : 'Finish the exception request with enough detail for a fast yes.',
        action: identity
          ? { label: 'Open mission board', scrollId: 'mission-tasks' }
          : { label: 'Open roster exception', scrollId: 'exception-request' },
      },
    ],
    out_of_state_supporter: () => [
      {
        id: 'branch-oss-remote',
        title: 'Remote help still moves Arkansas numbers',
        whyItMatters:
          'Relational calls, creative, and research win margins even when you are not physically in the district.',
        statusLine: 'Out-of-state supporter path — prioritize digital and phone relays.',
        nextMove:
          'Lean on mission tasks labeled for remote work; use Power of 5 to map your own network’s reach into the state.',
        action: { label: 'Open mission board', scrollId: 'mission-tasks' },
      },
      {
        id: 'branch-oss-roster',
        title: 'No Arkansas voter ID on file',
        whyItMatters:
          'That is expected for this path — coordinators use roster exceptions instead of voter self-match.',
        statusLine: identity
          ? 'Cleared for remote assignments pending orientation.'
          : pending
            ? 'Exception in review.'
            : 'Tell HQ which states or time zones you operate from.',
        nextMove: identity
          ? 'Pick training oriented to phone and digital lanes first.'
          : 'Submit roster details so tasks can route without voter-file friction.',
        action: identity
          ? { label: 'Open training & tasks', scrollId: 'workspace-cards' }
          : { label: 'Open roster exception', scrollId: 'exception-request' },
      },
    ],
    staff_admin_direct_placement: () => [
      {
        id: 'branch-staff-placement',
        title: 'HQ placement sets your default tools',
        whyItMatters:
          'Staff and partner placements often ship with elevated roles — orientation keeps your workspace aligned with HQ.',
        statusLine: 'Staff / admin path — expect tighter coordination with the central team.',
        nextMove:
          'Confirm your active space and role with your director, then pull mission tasks from the leadership queue when assigned.',
        action: { label: 'Open workspace snapshot', scrollId: 'workspace-summary' },
      },
      {
        id: 'branch-staff-gates',
        title: 'If something still looks locked',
        whyItMatters:
          'Elevated permissions still respect voter-file or exception rules for certain surfaces — that is intentional, not a bug.',
        statusLine:
          'Check the snapshot for exception status and voter link before escalating.',
        nextMove:
          'Use Agent Jones for quick orientation nudges; escalate to ops only after snapshot review.',
        action: { label: 'Jump to Agent Jones', scrollId: 'agent-jones' },
      },
    ],
  }

  return builders[branch]()
}
