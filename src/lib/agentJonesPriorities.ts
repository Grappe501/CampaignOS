import { normalizeKey, type DashboardProgressSlice } from './dashboardState'
import type { CampaignProfile } from '../hooks/useProfile'
import type {
  AgentJonesCampaignGoalsContext,
  AgentJonesCoordinatorOpsContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesOperatingMode,
  AgentJonesRelationalPower5Context,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'
import {
  deskRouteFromPathname,
  inferLeadershipLevel,
  inferUserScope,
  normalizeAgentJonesRole,
  type AgentJonesDeskRoute,
  type AgentJonesNormalizedRole,
} from './agentJonesRoleDesk'
import { operatingFingerprintDeltaLines } from './agentJonesWhatChanged'

const FP_KEY = 'campaignos:agent-jones-operating-fp'

function nextAssignmentDueDateKey(iso: string | null | undefined): string {
  if (!iso || typeof iso !== 'string') return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toISOString().slice(0, 10)
}

function bumpRecentChangeNote(fingerprint: string): string[] {
  try {
    const prev = sessionStorage.getItem(FP_KEY)
    sessionStorage.setItem(FP_KEY, fingerprint)
    if (prev && prev !== fingerprint) {
      return operatingFingerprintDeltaLines(prev, fingerprint)
    }
  } catch {
    /* ignore */
  }
  return []
}

function buildReadinessSummary(
  desk: AgentJonesDeskRoute,
  readinessParts: string[],
): string {
  if (readinessParts.length === 0) {
    switch (desk) {
      case '/admin':
        return 'Admin: visible governance signals look steady — still verify exceptions and desk rollups on-page.'
      case '/candidate':
        return 'Leadership: KPI snapshot for this session is aligned — use weakest lanes to choose where principals spend time.'
      case '/coordinator':
        return 'Coordinator: supervised board and intern aggregates are in view — keep blocked/overdue honest before new asks.'
      case '/intern':
        return 'Intern: queue signals are visible — keep first-contact windows human and escalate after three honest tries.'
      default:
        return 'Volunteer: roster slice looks ready for field routing — confirm the next mission or daily beat with your captain if unsure.'
    }
  }
  const gap = `Readiness gaps: ${readinessParts.join('; ')}.`
  switch (desk) {
    case '/admin':
      return `Admin — ${gap} Stay within client-visible reads; no invented org-wide queues.`
    case '/candidate':
      return `Leadership — ${gap} Ground narrative in the KPI cards you can see here.`
    case '/coordinator':
      return `Coordinator — ${gap} Clear supervised lanes before optional volunteer nudges.`
    case '/intern':
      return `Intern desk — ${gap} Prioritize overdue first contacts with a short human touch.`
    default:
      return `Volunteer — ${gap} Finish roster/branch steps before voter-gated execution.`
  }
}

function laneStatus(
  urgent: boolean,
  watch: boolean,
): 'healthy' | 'watch' | 'urgent' | 'na' {
  if (urgent) return 'urgent'
  if (watch) return 'watch'
  return 'healthy'
}

function inferRecommendedMode(input: {
  desk: AgentJonesDeskRoute
  normalizedRole: AgentJonesNormalizedRole
  hasCoordinatorPressure: boolean
}): AgentJonesOperatingMode {
  if (input.desk === '/admin') return 'leadership'
  if (input.desk === '/candidate') return 'leadership'
  if (input.desk === '/coordinator' || input.hasCoordinatorPressure) return 'ops'
  if (input.desk === '/intern') return 'task'
  if (input.normalizedRole === 'intern') return 'task'
  return 'command'
}

export function buildAgentJonesOperatingContext(input: {
  pathname: string
  profile: CampaignProfile | null
  primaryRole: string | null | undefined
  progressSlice: DashboardProgressSlice
  voterLoading: boolean
  voterMatched: boolean
  coordinatorHasSupervisorScope: boolean
  relationalPower5: AgentJonesRelationalPower5Context | null
  volunteerMission: AgentJonesVolunteerMissionContext | null
  dailyActivation: AgentJonesDailyActivationContext | null
  internLayer: AgentJonesInternLayerContext | null
  campaignGoals: AgentJonesCampaignGoalsContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
}): AgentJonesOperatingContext {
  const desk = deskRouteFromPathname(input.pathname)
  const normalized_role = normalizeAgentJonesRole(input.primaryRole)
  const leadership_level = inferLeadershipLevel(normalized_role)
  const user_scope = inferUserScope(
    normalized_role,
    input.coordinatorHasSupervisorScope,
  )

  const exRaw = normalizeKey(input.profile?.exception_request_status)
  const exception_summary = {
    status_key: exRaw || 'none',
    has_open_exception: exRaw !== '' && exRaw !== 'none',
    pending_review: exRaw === 'pending',
  }

  const ops = input.coordinatorOps
  const hasCoordScope = Boolean(ops?.has_supervisor_scope)
  const blocked = ops?.blocked_count ?? 0
  const overdue = ops?.overdue_count ?? 0
  const openAssignments = ops?.open_assignments_total ?? 0
  const internOd = ops?.intern_overdue_first_contact ?? 0
  const internEsc = ops?.intern_pipelines_escalated ?? 0
  const hasCoordinatorPressure =
    (hasCoordScope && openAssignments > 0) || internOd > 0 || internEsc > 0

  const mission = input.volunteerMission
  const stalled = mission?.stalled_titles?.length ?? 0
  const activeM = mission?.active_summaries?.length ?? 0

  const daily = input.dailyActivation
  const dailyGap =
    daily &&
    daily.total_today > 0 &&
    daily.completed_today < daily.total_today

  const intern = input.internLayer
  const internOdLocal = intern?.overdue_first_contact_count ?? 0

  const goals = input.campaignGoals
  const belowHalf =
    goals?.kpis?.filter((k) => k.pct < 50).length ?? 0

  const snap = input.leadershipSnapshot
  const kpi_telemetry = {
    active_kpi_count: snap?.active_kpi_count ?? goals?.kpis?.length ?? null,
    mean_pct: snap?.kpi_mean_progress_pct ?? null,
    below_half: snap?.kpis_below_half_target ?? (belowHalf > 0 ? belowHalf : null),
    weakest_name: snap?.weakest_kpi_name ?? null,
    weakest_pct_of_target: snap?.weakest_kpi_pct_of_target ?? null,
  }

  const p5 = input.relationalPower5
  const p5Attention =
    (p5?.open_manual_relays ?? 0) > 0 || (p5?.early_stage_count ?? 0) > 3

  const attention_now: string[] = []
  const on_track: string[] = []
  const next_steps: string[] = []

  if (input.voterLoading) {
    attention_now.push('Roster link is still loading — wait for clearance before assuming voter-gated tools.')
  }
  if (exception_summary.pending_review) {
    attention_now.push(
      'Roster exception is pending coordinator review — voter-gated work stays paused until status changes.',
    )
  }
  if (input.progressSlice === 'unmatched') {
    attention_now.push('Roster clearance is not complete — finish self-match or the exception path your branch requires.')
  }
  if (input.progressSlice === 'matched_no_branch') {
    attention_now.push('Pick your volunteer path (branch) so downstream cards route correctly.')
  }
  if (hasCoordScope && (blocked > 0 || overdue > 0)) {
    attention_now.push(
      `Supervised mission board: ${blocked} blocked, ${overdue} overdue — clear lanes before adding new asks.`,
    )
  }
  if (internOd > 0 || internOdLocal > 0) {
    attention_now.push(
      `Intern pipeline: overdue first-contact window(s) (${Math.max(internOd, internOdLocal)}) — human reach-out first.`,
    )
  }
  if (internEsc > 0) {
    attention_now.push(`${internEsc} intern pipeline row(s) escalated — triage with the intern before counts grow.`)
  }
  if (stalled > 0) {
    attention_now.push(
      stalled === 1
        ? 'One mission task looks stalled — reopen it or close it so the queue stays honest.'
        : `${stalled} mission tasks look stalled — knock down the oldest first.`,
    )
  }
  if (snap && snap.active_kpi_count > 0 && snap.kpis_below_half_target >= 3) {
    attention_now.push(
      `${snap.kpis_below_half_target} KPI lanes are under half of target — leadership air cover likely needed.`,
    )
  }
  if (snap && snap.weakest_kpi_pct_of_target != null && snap.weakest_kpi_pct_of_target < 35) {
    attention_now.push(
      `Weakest KPI (“${snap.weakest_kpi_name ?? 'goal'}”) is under ~35% of target — align field narrative before adding programs.`,
    )
  }

  if (dailyGap && daily) {
    attention_now.push(
      `Daily activation: ${daily.completed_today}/${daily.total_today} complete today — close the checklist when you can.`,
    )
  }

  if (p5Attention && p5) {
    attention_now.push(
      'Power of 5: open manual relays or early-stage volume suggests a quick relationship pass.',
    )
  }

  if (
    !input.voterLoading &&
    input.progressSlice === 'matched_ready' &&
    input.voterMatched &&
    activeM > 0 &&
    stalled === 0 &&
    !exception_summary.pending_review
  ) {
    on_track.push('Roster and branch look cleared — mission queue has active work without stalled items.')
  }
  if (daily && daily.total_today > 0 && daily.completed_today >= daily.total_today) {
    on_track.push('Daily activation checklist is complete for today.')
  }
  if (hasCoordScope && openAssignments === 0 && !ops?.desk_loading) {
    on_track.push('Supervised mission board shows no open assignment rows right now.')
  }
  if (goals && goals.kpis.length && belowHalf === 0) {
    on_track.push('Visible KPI lanes are at or above half of target — hold the line on execution.')
  }

  if (mission?.next_best_title) {
    next_steps.push(`Next mission move: “${mission.next_best_title}” (scroll: mission-tasks).`)
  } else if (daily?.next_task_title && daily.total_today > 0) {
    next_steps.push(`Next daily activation item: “${daily.next_task_title}” (scroll: daily-activation).`)
  }
  if (hasCoordScope && openAssignments > 0) {
    next_steps.push('Open coordinator mission operations and clear blocked/overdue before optional work.')
  }
  if (exception_summary.pending_review && desk === '/dashboard') {
    next_steps.push('Re-read your exception note and watch for coordinator updates (scroll: exception-request).')
  }
  if (desk === '/admin') {
    next_steps.push('Review admin governance: exceptions and desk health (scroll: admin-exceptions, admin-desks).')
  }
  if (snap && snap.active_kpi_count > 0) {
    next_steps.push('Scan the campaign health snapshot and weakest KPI before messaging the field.')
  }

  const urgent_signals: AgentJonesOperatingContext['urgent_signals'] = []
  let id = 0
  const addSig = (
    label: string,
    explanation: string,
    severity: 'info' | 'watch' | 'urgent',
    owner_hint: string | null,
    route_hint: string | null,
  ) => {
    urgent_signals.push({
      id: `sig-${++id}`,
      label: label.slice(0, 220),
      explanation: explanation.slice(0, 320),
      severity,
      owner_hint,
      route_hint,
    })
  }
  if (exception_summary.pending_review) {
    addSig(
      'Roster exception pending review',
      'Voter-gated tools stay off until a coordinator changes exception status — nudge HQ instead of forcing gated work.',
      'urgent',
      'Coordinator',
      '/coordinator',
    )
  }
  if (hasCoordScope && overdue > 0) {
    addSig(
      `${overdue} supervised assignment(s) overdue`,
      'Overdue supervised rows usually mean a volunteer is blocked or waiting — clear or reassign before adding new asks.',
      'urgent',
      'Coordinator',
      '/coordinator',
    )
  }
  if (hasCoordScope && blocked > 0) {
    addSig(
      `${blocked} supervised assignment(s) blocked`,
      'Blocked lanes need a human decision — dependency, policy, or capacity — before the board looks healthy again.',
      'watch',
      'Coordinator',
      '/coordinator',
    )
  }
  if (stalled > 0) {
    addSig(
      `${stalled} stalled mission task(s)`,
      'Stalled tasks inflate perceived workload — close, reopen, or delete honestly so captains see real demand.',
      'watch',
      'Volunteer / captain',
      '/dashboard',
    )
  }
  if (internOd > 0 || internOdLocal > 0) {
    addSig(
      'Intern first-contact overdue',
      'First-contact windows are time-bound — a short call or text beats another internal note.',
      'urgent',
      'Intern lead',
      '/intern',
    )
  }

  const hasVolunteerSignal =
    desk === '/dashboard' || desk === '/intern' || activeM > 0 || stalled > 0 || daily != null
  const hasInternSignal =
    desk === '/intern' || normalized_role === 'intern' || intern != null
  const hasCoordSignal = ops != null && hasCoordScope
  const kpiBelow = snap?.kpis_below_half_target ?? belowHalf
  const hasLeadershipSignal =
    Boolean(snap && snap.active_kpi_count > 0) || (goals?.kpis?.length ?? 0) > 0

  const desk_health = {
    volunteer_lane: hasVolunteerSignal
      ? laneStatus(stalled > 0, dailyGap === true || activeM > 8)
      : 'na',
    intern_lane: hasInternSignal
      ? laneStatus(internOdLocal > 0, (intern?.assigned_pipeline_count ?? 0) > 5)
      : 'na',
    coordinator_lane: hasCoordSignal
      ? laneStatus(blocked + overdue > 0, openAssignments > 6)
      : 'na',
    leadership_lane: hasLeadershipSignal
      ? laneStatus(kpiBelow >= 3, kpiBelow === 2)
      : 'na',
  }

  const readinessParts: string[] = []
  if (!input.voterMatched && !input.voterLoading) readinessParts.push('roster not linked')
  if (exception_summary.pending_review) readinessParts.push('exception pending')
  if (input.progressSlice !== 'matched_ready') {
    readinessParts.push(`progress: ${input.progressSlice}`)
  }
  const readiness_summary = buildReadinessSummary(desk, readinessParts)

  const recommended_mode = inferRecommendedMode({
    desk,
    normalizedRole: normalized_role,
    hasCoordinatorPressure,
  })

  const signal_epoch = [
    desk,
    normalized_role,
    input.progressSlice,
    exception_summary.status_key,
    String(blocked),
    String(overdue),
    String(stalled),
    String(snap?.kpis_below_half_target ?? ''),
    String(internOdLocal),
    String(internEsc),
    String(activeM),
    String(daily?.completed_today ?? ''),
    String(daily?.total_today ?? ''),
    desk_health.volunteer_lane,
    desk_health.intern_lane,
    desk_health.coordinator_lane,
    desk_health.leadership_lane,
    String(mission?.assignments_due_within_7d_count ?? ''),
    nextAssignmentDueDateKey(mission?.next_assignment_due_at ?? null),
  ].join('|')

  const recent_changes = bumpRecentChangeNote(signal_epoch)

  const leadPackRole =
    normalized_role === 'admin' ||
    normalized_role === 'campaign_manager' ||
    normalized_role === 'assistant_campaign_manager' ||
    normalized_role === 'candidate' ||
    normalized_role === 'coordinator'

  const nextStepsLeadership: string[] = []
  if (leadPackRole) {
    if (recent_changes.length) {
      nextStepsLeadership.push(
        'Use recent_changes in this summary as the honest “what moved” signal before outbound comms.',
      )
    }
    if (desk === '/admin') {
      nextStepsLeadership.push(
        'Look first on-page: exceptions and desk rollups (scroll targets admin-exceptions, admin-desks).',
      )
    }
    if (desk === '/candidate' && snap && snap.active_kpi_count > 0) {
      nextStepsLeadership.push(
        'Look first on-page: campaign health snapshot and weakest KPI (candidate-health-snapshot).',
      )
    }
    if (desk === '/coordinator' && hasCoordScope) {
      nextStepsLeadership.push(
        'Look first on-page: supervised mission ops and intern aggregates (coordinator-mission-ops).',
      )
    }
  }

  const nextStepsMerged = [...nextStepsLeadership, ...next_steps]
  const nextStepsCap = leadPackRole ? 6 : 5

  return {
    normalized_role,
    desk_route: desk,
    leadership_level,
    user_scope,
    recommended_mode,
    command_summary: {
      attention_now: attention_now.slice(0, 8),
      on_track: on_track.slice(0, 6),
      next_steps: nextStepsMerged.slice(0, nextStepsCap),
      recent_changes: recent_changes.slice(0, 4),
    },
    urgent_signals: urgent_signals.slice(0, 8),
    exception_summary,
    desk_health,
    kpi_telemetry,
    readiness_summary: readiness_summary.slice(0, 360),
    signal_epoch,
  }
}
