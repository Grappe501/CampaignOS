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

const FP_KEY = 'campaignos:agent-jones-operating-fp'

function bumpRecentChangeNote(fingerprint: string): string[] {
  try {
    const prev = sessionStorage.getItem(FP_KEY)
    sessionStorage.setItem(FP_KEY, fingerprint)
    if (prev && prev !== fingerprint) {
      return [
        'Desk signals changed since your last Agent Jones check — the priority list below is refreshed from current data.',
      ]
    }
  } catch {
    /* ignore */
  }
  return []
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
    severity: 'info' | 'watch' | 'urgent',
    owner_hint: string | null,
    route_hint: string | null,
  ) => {
    urgent_signals.push({
      id: `sig-${++id}`,
      label: label.slice(0, 220),
      severity,
      owner_hint,
      route_hint,
    })
  }
  if (exception_summary.pending_review) {
    addSig('Roster exception pending review', 'urgent', 'Coordinator', '/coordinator')
  }
  if (hasCoordScope && overdue > 0) {
    addSig(`${overdue} supervised assignment(s) overdue`, 'urgent', 'Coordinator', '/coordinator')
  }
  if (hasCoordScope && blocked > 0) {
    addSig(`${blocked} supervised assignment(s) blocked`, 'watch', 'Coordinator', '/coordinator')
  }
  if (stalled > 0) {
    addSig(`${stalled} stalled mission task(s)`, 'watch', 'Volunteer / captain', '/dashboard')
  }
  if (internOd > 0 || internOdLocal > 0) {
    addSig('Intern first-contact overdue', 'urgent', 'Intern lead', '/intern')
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
  const readiness_summary =
    readinessParts.length === 0
      ? 'Roster slice looks ready for field routing; confirm orientation with your captain if unsure.'
      : `Readiness gaps: ${readinessParts.join('; ')}.`

  const recommended_mode = inferRecommendedMode({
    desk,
    normalizedRole: normalized_role,
    hasCoordinatorPressure,
  })

  const fingerprint = [
    desk,
    normalized_role,
    input.progressSlice,
    exception_summary.status_key,
    String(blocked),
    String(overdue),
    String(stalled),
    String(snap?.kpis_below_half_target ?? ''),
  ].join('|')

  const recent_changes = bumpRecentChangeNote(fingerprint)

  return {
    normalized_role,
    desk_route: desk,
    leadership_level,
    user_scope,
    recommended_mode,
    command_summary: {
      attention_now: attention_now.slice(0, 8),
      on_track: on_track.slice(0, 6),
      next_steps: next_steps.slice(0, 5),
      recent_changes: recent_changes.slice(0, 3),
    },
    urgent_signals: urgent_signals.slice(0, 8),
    exception_summary,
    desk_health,
    kpi_telemetry,
    readiness_summary: readiness_summary.slice(0, 360),
  }
}
