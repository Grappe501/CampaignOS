import type {
  AgentJonesCalendarSummary,
  AgentJonesCoordinatorOpsContext,
  AgentJonesDailyActivationContext,
  AgentJonesLeadershipSnapshotContext,
  AgentJonesOperatingContext,
  AgentJonesProactiveAlert,
  AgentJonesVolunteerMissionContext,
} from './agentJonesContextV2'
import type { DashboardProgressSlice } from './dashboardState'

const SEVERITY_RANK: Record<AgentJonesProactiveAlert['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function sortAlertsBySeverity(alerts: AgentJonesProactiveAlert[]): AgentJonesProactiveAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )
}

/** Drop alerts that repeat the same grounded story when a stronger one is present. */
export function dedupeAlertsByMeaningfulChange(alerts: AgentJonesProactiveAlert[]): AgentJonesProactiveAlert[] {
  const ids = new Set(alerts.map((a) => a.id))
  return alerts.filter((a) => {
    if (a.id === 'proactive-desk-lane-urgent' && ids.has('proactive-coord-overdue')) {
      return false
    }
    if (
      a.id === 'proactive-timing-cluster' &&
      (ids.has('proactive-mission-overdue') || ids.has('proactive-mission-due-soon'))
    ) {
      return false
    }
    if (
      a.id === 'proactive-coverage-gap-hint' &&
      ids.has('proactive-undercovered-area-proxy')
    ) {
      return false
    }
    if (
      a.id === 'proactive-coverage-readiness-headline' &&
      ids.has('proactive-area-staffing-visible')
    ) {
      return false
    }
    if (
      a.id === 'proactive-opportunity-area-proxy' &&
      ids.has('proactive-undercovered-area-proxy')
    ) {
      return false
    }
    if (
      a.id === 'proactive-escalation-route-open' &&
      ids.has('proactive-cross-desk-pressure')
    ) {
      return false
    }
    return true
  })
}

function hasUrgentLabel(operating: AgentJonesOperatingContext, substr: string): boolean {
  const s = substr.toLowerCase()
  return operating.urgent_signals.some((u) => u.label.toLowerCase().includes(s))
}

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== 'string') return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return (Date.now() - t) / 3600000
}

export function buildAgentJonesProactiveAlerts(input: {
  operating: AgentJonesOperatingContext
  volunteerMission: AgentJonesVolunteerMissionContext | null
  dailyActivation: AgentJonesDailyActivationContext | null
  coordinatorOps: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot: AgentJonesLeadershipSnapshotContext | null
  calendarSummary: AgentJonesCalendarSummary | null
  exceptionRequestedAt: string | null | undefined
  progressSlice: DashboardProgressSlice
}): AgentJonesProactiveAlert[] {
  const out: AgentJonesProactiveAlert[] = []
  const op = input.operating
  const push = (a: AgentJonesProactiveAlert) => {
    if (out.some((x) => x.id === a.id)) return
    out.push(a)
  }

  if (input.progressSlice === 'unmatched') {
    push({
      id: 'proactive-readiness-blocked',
      severity: 'high',
      title: 'Roster not cleared for field routing',
      explanation:
        'Finish self-match or the exception path your branch requires before assuming voter-gated tools are available.',
      route_hint: '/dashboard',
      target_id: 'voter-workspace',
      dismissible: false,
    })
  } else if (input.progressSlice === 'matched_no_branch') {
    push({
      id: 'proactive-readiness-blocked',
      severity: 'medium',
      title: 'Pick a volunteer path (branch)',
      explanation:
        'Branch choice routes training and mission cards — pick one from onboarding so downstream work lines up.',
      route_hint: '/dashboard',
      target_id: 'onboarding-branch',
      dismissible: true,
    })
  }

  const cal = input.calendarSummary
  if (cal?.next_deadline_at) {
    const dueMs = Date.parse(cal.next_deadline_at)
    if (Number.isFinite(dueMs)) {
      const h = (dueMs - Date.now()) / 3600000
      if (h < 0) {
        push({
          id: 'proactive-mission-overdue',
          severity: 'high',
          title: 'Mission due date in the past',
          explanation:
            'At least one visible assignment is past its due time — close or renegotiate honestly so the queue stays credible.',
          route_hint: '/dashboard',
          target_id: 'mission-tasks',
          dismissible: false,
        })
      } else if (h <= 48) {
        push({
          id: 'proactive-mission-due-soon',
          severity: 'medium',
          title: 'Mission deadline inside 48h',
          explanation:
            'A visible assignment deadline is approaching — finish or escalate before it slips further.',
          route_hint: '/dashboard',
          target_id: 'mission-tasks',
          dismissible: true,
        })
      }
    }
  }

  if (cal?.upcoming_count_7d != null && cal.upcoming_count_7d >= 3) {
    let nearDeadline = false
    if (cal.next_deadline_at) {
      const dueMs = Date.parse(cal.next_deadline_at)
      if (Number.isFinite(dueMs)) {
        const h = (dueMs - Date.now()) / 3600000
        if (h <= 48) nearDeadline = true
      }
    }
    if (!nearDeadline) {
      push({
        id: 'proactive-timing-cluster',
        severity: 'low',
        title: 'Several timing-sensitive assignments in view',
        explanation: `${cal.upcoming_count_7d} visible item(s) carry deadlines in the next ~7 days — sequence honestly so nothing quietly slips.`,
        route_hint: '/dashboard',
        target_id: 'mission-tasks',
        dismissible: true,
      })
    }
  }

  const daily = input.dailyActivation
  if (
    daily &&
    daily.total_today > 0 &&
    daily.completed_today < daily.total_today &&
    !hasUrgentLabel(op, 'daily')
  ) {
    push({
      id: 'proactive-daily-open',
      severity: 'low',
      title: 'Daily activation still open',
      explanation: `You have ${daily.total_today - daily.completed_today} daily item(s) left for today when you have a short window.`,
      route_hint: '/dashboard',
      target_id: 'daily-activation',
      dismissible: true,
    })
  }

  const snap = input.leadershipSnapshot
  if (
    snap &&
    snap.active_kpi_count > 0 &&
    snap.kpis_below_half_target >= 2 &&
    !hasUrgentLabel(op, 'kpi')
  ) {
    push({
      id: 'proactive-kpi-thin',
      severity: snap.kpis_below_half_target >= 3 ? 'high' : 'medium',
      title: 'Multiple KPI lanes under half',
      explanation:
        'Several visible KPIs sit under half of target — leadership narrative and coordinator air cover may be needed.',
      route_hint: '/candidate',
      target_id: 'candidate-health-snapshot',
      dismissible: true,
    })
  }

  const ops = input.coordinatorOps
  if (
    ops &&
    ops.has_supervisor_scope &&
    ops.blocked_count > 0 &&
    !hasUrgentLabel(op, 'blocked')
  ) {
    push({
      id: 'proactive-coord-blocked',
      severity: 'medium',
      title: 'Supervised blocked rows need a decision',
      explanation:
        'Blocked supervised assignments usually need a dependency or policy call — clear the oldest lane before stacking new asks.',
      route_hint: '/coordinator',
      target_id: 'coordinator-mission-ops',
      dismissible: true,
    })
  }

  if (
    ops &&
    ops.has_supervisor_scope &&
    ops.overdue_count > 0 &&
    !hasUrgentLabel(op, 'overdue')
  ) {
    push({
      id: 'proactive-coord-overdue',
      severity: 'high',
      title: 'Supervised overdue rows still visible',
      explanation:
        'The coordinator board still shows overdue supervised assignments — clear or reassign before adding optional work.',
      route_hint: '/coordinator',
      target_id: 'coordinator-mission-ops',
      dismissible: false,
    })
  }

  if (op.exception_summary.pending_review) {
    const exH = hoursSince(input.exceptionRequestedAt ?? null)
    const aged = exH != null && exH >= 72
    push({
      id: 'proactive-exception-pending',
      severity: aged ? 'medium' : 'low',
      title: aged ? 'Exception pending multiple days' : 'Roster exception pending review',
      explanation: aged
        ? 'Your roster exception has been pending for a while — check status or nudge coordinators; avoid voter-gated work until cleared.'
        : 'Voter-gated execution stays off until coordinators update exception status — watch the exception card for changes.',
      route_hint: '/dashboard',
      target_id: 'exception-request',
      dismissible: true,
    })
  }

  const laneUrgent = Object.values(op.desk_health).some((v) => v === 'urgent')
  if (laneUrgent) {
    push({
      id: 'proactive-desk-lane-urgent',
      severity: 'high',
      title: 'A visible desk lane is urgent',
      explanation:
        'Desk health shows at least one lane in urgent — use command summary and next actions before taking on new scope.',
      dismissible: true,
    })
  }

  const dailyOpen =
    daily &&
    daily.total_today > 0 &&
    daily.completed_today < daily.total_today
  if (
    input.progressSlice === 'matched_ready' &&
    !op.exception_summary.pending_review &&
    (input.volunteerMission?.active_summaries?.length ?? 0) === 0 &&
    !dailyOpen &&
    op.desk_route === '/dashboard' &&
    op.normalized_role === 'volunteer'
  ) {
    push({
      id: 'proactive-no-next-step',
      severity: 'low',
      title: 'No mission or daily queue in this view',
      explanation:
        'Roster looks ready but there are no visible mission rows and no open daily checklist — use training/workspace cards or wait for captain task drops instead of forcing busywork.',
      route_hint: '/dashboard',
      target_id: 'workspace-cards',
      dismissible: true,
    })
  }

  return sortAlertsBySeverity(dedupeAlertsByMeaningfulChange(out)).slice(0, 5)
}
