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
import type {
  AgentJonesCoordinatorOpsContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesSurface,
} from './agentJonesContextV2'
import type { AgentJonesNormalizedRole } from './agentJonesRoleDesk'

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
  /** Defaults to volunteer_dashboard when omitted (backward compatible). */
  surface?: AgentJonesSurface
  coordinatorOps?: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot?: AgentJonesLeadershipSnapshotContext | null
  /** Deterministic command snapshot — visible client state only. */
  operating?: AgentJonesOperatingContext | null
}

function roleOperatingLeadIn(normalized: AgentJonesNormalizedRole): string {
  switch (normalized) {
    case 'admin':
    case 'campaign_manager':
      return 'Ops view: I stay grounded in desk health, exceptions, and KPIs we can actually see — no invented org-wide counts.'
    case 'candidate':
      return 'Principal view: I connect field signals to KPI health and where leadership attention earns the most.'
    case 'coordinator':
      return 'Coordination view: I prioritize blocked/overdue lanes and intern pipeline risk before optional work.'
    case 'assistant_campaign_manager':
      return 'HQ view: I mirror leadership summaries and coordination pressure without claiming tools we do not have.'
    case 'intern':
      return 'Team desk view: I keep first-contact windows and follow-ups tight.'
    case 'county_lead':
    case 'precinct_captain':
      return 'Field lead view: I emphasize roster readiness, follow-through, and captain-level clarity.'
    default:
      return 'Volunteer view: I keep your next step obvious and roster-safe.'
  }
}

function buildAdminDeskGuidanceBundle(
  operating: AgentJonesOperatingContext | null,
): AgentJonesGuidanceBundle {
  const attention = operating?.command_summary.attention_now ?? []
  const onTrack = operating?.command_summary.on_track ?? []
  const next = operating?.command_summary.next_steps ?? []
  const stateCore =
    attention.length > 0
      ? `Top attention from visible data: ${attention.slice(0, 4).join(' ')}`
      : 'No urgent attention rows from this session’s visible signals — still review desk rollups, exceptions, and calendar governance on the page.'
  const trackLine =
    onTrack.length > 0 ? ` On track: ${onTrack.slice(0, 2).join(' ')}` : ''
  const nextLine =
    next.length > 0 ? ` Suggested moves: ${next.slice(0, 3).join(' · ')}` : ''

  return {
    greeting: 'Admin command center.',
    stateExplanation: `${stateCore}${trackLine}${nextLine}`.trim(),
    prompts: [
      {
        id: 'adm-exceptions',
        label: 'Open exceptions & intervention',
        response: 'Scrolling to governance — exceptions are profile-scoped until org queues are wired.',
        scrollToId: 'admin-exceptions',
      },
      {
        id: 'adm-desks',
        label: 'Desk health rollup',
        response: 'Scrolling to desk health — summaries reflect your permitted reads, not full org telemetry.',
        scrollToId: 'admin-desks',
      },
      {
        id: 'adm-tasks',
        label: 'Task command center',
        response: 'Scrolling to task oversight for mission lanes visible with your role.',
        scrollToId: 'admin-tasks',
      },
      {
        id: 'adm-config',
        label: 'Config & integrations',
        response: 'Scrolling to integration status — read-only until service paths exist.',
        scrollToId: 'admin-config',
      },
    ],
  }
}

function decorateGuidanceWithOperating(
  bundle: AgentJonesGuidanceBundle,
  input: AgentJonesGuidanceInput,
): AgentJonesGuidanceBundle {
  const op = input.operating
  if (!op) return bundle
  const voice = roleOperatingLeadIn(op.normalized_role)
  const lines: string[] = []
  if (op.command_summary.attention_now.length) {
    lines.push(`Attention: ${op.command_summary.attention_now.slice(0, 2).join(' · ')}`)
  }
  if (op.command_summary.on_track.length) {
    lines.push(`On track: ${op.command_summary.on_track[0]}`)
  }
  if (op.command_summary.next_steps.length) {
    lines.push(`Next: ${op.command_summary.next_steps.slice(0, 3).join(' · ')}`)
  }
  if (op.readiness_summary && input.slice === 'matched_ready') {
    lines.push(op.readiness_summary)
  }
  const prefix = lines.length ? `${lines.join('\n')}\n\n` : ''
  return {
    ...bundle,
    greeting: `${bundle.greeting} (${voice})`,
    stateExplanation: `${prefix}${bundle.stateExplanation}`.trim(),
  }
}

function buildCoordinatorDeskGuidance(
  ops: AgentJonesCoordinatorOpsContext,
): AgentJonesGuidanceBundle {
  const parts: string[] = []
  if (ops.desk_loading) {
    parts.push('Coordinator desk data is still loading — mission counts may appear after refresh.')
  } else if (!ops.has_supervisor_scope) {
    parts.push(
      'No supervisor team scope on this profile — the mission board stays empty until HQ links volunteer_supervisor_teams.',
    )
  } else {
    parts.push(
      `Supervised teams: ${ops.supervised_team_count}. Open assignments: ${ops.open_assignments_total} (blocked ${ops.blocked_count}, overdue ${ops.overdue_count}, in progress ${ops.in_progress_count}, assigned not started ${ops.assigned_not_started_count}).`,
    )
  }
  if ((ops.intern_overdue_first_contact ?? 0) > 0) {
    parts.push(
      `${ops.intern_overdue_first_contact} intern pipeline first-contact row(s) are overdue on this team view.`,
    )
  }
  if ((ops.intern_pipelines_escalated ?? 0) > 0) {
    parts.push(`${ops.intern_pipelines_escalated} pipeline row(s) are escalated — triage with interns before counts grow.`)
  }
  if (
    (ops.intern_pipelines_active ?? 0) > 0 &&
    (ops.intern_overdue_first_contact ?? 0) === 0 &&
    (ops.intern_pipelines_escalated ?? 0) === 0
  ) {
    parts.push(`${ops.intern_pipelines_active} active pipeline row(s) — spot-check coverage.`)
  }

  return {
    greeting: 'Coordinator oversight mode.',
    stateExplanation:
      parts.join(' ') ||
      'Use mission operations for supervised assignments and the intern summary for pipeline risk.',
    prompts: [
      {
        id: 'coord-mission-board',
        label: 'Open mission operations',
        response:
          'Scrolling to the supervised mission board — clear blocked and overdue lanes before nudging volunteers on optional work.',
        scrollToId: 'coordinator-mission-ops',
      },
      {
        id: 'coord-pipeline',
        label: 'Where is intern pipeline detail?',
        response:
          'Pipeline aggregates are on this coordinator desk; interns execute contacts on /intern. Pair with them when escalations or overdue first contacts show up in your summary.',
      },
      {
        id: 'coord-kpis',
        label: 'Align on KPIs',
        response:
          'The KPI card here mirrors the active campaign window — use it to keep volunteer messaging aligned with measurable goals.',
        scrollToId: 'campaign-kpis',
      },
      {
        id: 'coord-volunteer-view',
        label: 'See volunteer workspace',
        response:
          'Open /dashboard from the header when you need the same voter and mission cards volunteers see day to day.',
      },
    ],
  }
}

function buildCandidateLeadershipGuidance(
  snap: AgentJonesLeadershipSnapshotContext,
): AgentJonesGuidanceBundle {
  const kpiLine =
    snap.active_kpi_count === 0
      ? 'No active KPI rows for today’s date window — confirm campaign_kpis in HQ tools before citing goals publicly.'
      : `${snap.active_kpi_count} active KPI(s). Mean progress vs target: ${snap.kpi_mean_progress_pct ?? 'n/a'}%. ${snap.kpis_below_half_target} below half of target.${
          snap.weakest_kpi_name
            ? ` Weakest lane: “${snap.weakest_kpi_name}” at ${snap.weakest_kpi_pct_of_target ?? '—'}%.`
            : ''
        } ${snap.missions_visible_count} mission scaffold row(s) visible with your role.`

  return {
    greeting: 'Leadership / principal mode.',
    stateExplanation: `${kpiLine} I will stay grounded in this desk’s KPI and health cards — not polling or fundraising systems we do not see.`,
    prompts: [
      {
        id: 'cand-health',
        label: 'Open campaign health snapshot',
        response: 'Scrolling to the health snapshot at the top of this desk.',
        scrollToId: 'candidate-health-snapshot',
      },
      {
        id: 'cand-coordinator',
        label: 'When to open coordinator desk',
        response:
          'Use /coordinator for supervised mission lanes and pipeline signals — keep legal and finance approvals in HQ workflows outside this app.',
      },
      {
        id: 'cand-field',
        label: 'Field truth',
        response:
          'Volunteer-facing execution lives on /dashboard — go there when you need the same tools the field uses.',
      },
      {
        id: 'cand-weakest',
        label: 'What metric needs air cover?',
        response:
          snap.weakest_kpi_name && snap.weakest_kpi_pct_of_target != null
            ? `On paper, “${snap.weakest_kpi_name}” is lowest at ${snap.weakest_kpi_pct_of_target}% of target — align coordinators and comms there before spinning new programs.`
            : 'With no clear weakest KPI in this window, lean on the election phase card and HQ before promising new numeric goals.',
      },
    ],
  }
}

function applyInternDeskOverlay(bundle: AgentJonesGuidanceBundle): AgentJonesGuidanceBundle {
  return {
    ...bundle,
    greeting: `Team desk — ${bundle.greeting}`,
    stateExplanation: `${bundle.stateExplanation} You are on /intern; the contact queue anchors at #intern-desk.`,
    prompts: [
      {
        id: 'intern-jump-queue',
        label: 'Jump to contact queue',
        response: 'Scrolling to the intern desk section on this page.',
        scrollToId: 'intern-desk',
      },
      ...bundle.prompts,
    ].slice(0, 8),
  }
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

function computeStandardGuidanceBundle(
  input: AgentJonesGuidanceInput,
): AgentJonesGuidanceBundle {
  const { slice, profile, voterLoading } = input
  const surface: AgentJonesSurface = input.surface ?? 'volunteer_dashboard'
  const allowMomentum =
    surface === 'volunteer_dashboard' || surface === 'intern_desk'

  if (voterLoading) {
    if (allowMomentum) {
      const momentumWhileLoading = buildMomentumOnboardingBundle(profile)
      if (momentumWhileLoading) return momentumWhileLoading
    }
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

  if (allowMomentum) {
    const momentumBundle = buildMomentumOnboardingBundle(profile)
    if (momentumBundle) return momentumBundle
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

  if (slice === 'matched_ready' && input.coordinatorOps && surface === 'coordinator_desk') {
    return buildCoordinatorDeskGuidance(input.coordinatorOps)
  }

  if (slice === 'matched_ready' && input.leadershipSnapshot && surface === 'candidate_desk') {
    return buildCandidateLeadershipGuidance(input.leadershipSnapshot)
  }

  const clearedVolunteerBundle: AgentJonesGuidanceBundle = {
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

  if (surface === 'intern_desk') {
    return applyInternDeskOverlay(clearedVolunteerBundle)
  }

  return clearedVolunteerBundle
}

export function getAgentJonesGuidanceBundle(
  input: AgentJonesGuidanceInput,
): AgentJonesGuidanceBundle {
  if ((input.surface ?? 'volunteer_dashboard') === 'admin_desk') {
    return buildAdminDeskGuidanceBundle(input.operating ?? null)
  }
  return decorateGuidanceWithOperating(computeStandardGuidanceBundle(input), input)
}

export function scrollToDashboardId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
