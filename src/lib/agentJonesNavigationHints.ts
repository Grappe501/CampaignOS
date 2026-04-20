import {
  isAgentJonesNavigatePath,
  isAgentJonesScrollTargetId,
} from './agentJonesContext'
import type {
  AgentJonesNavigationHint,
  AgentJonesOperatingContext,
  AgentJonesSurface,
} from './agentJonesContextV2'

function parseScrollIdsFromText(text: string): string[] {
  const out: string[] = []
  const re = /scroll:\s*([a-z0-9-]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const id = m[1]
    if (isAgentJonesScrollTargetId(id)) out.push(id)
  }
  return out
}

const SCROLL_LABELS: Record<string, string> = {
  'mission-tasks': 'Mission tasks',
  'daily-activation': 'Daily activation',
  'coordinator-mission-ops': 'Coordinator missions',
  'intern-desk': 'Intern desk',
  'admin-exceptions': 'Exceptions',
  'admin-desks': 'Desks',
  'candidate-health-snapshot': 'Campaign health',
  'campaign-kpis': 'Campaign KPIs',
  'exception-request': 'Exception request',
  'voter-workspace': 'Voter workspace',
  'workspace-cards': 'Workspace cards',
  'dash-profile-photo': 'Profile photo',
  'event-coordinator-desk': 'Event desk',
}

function scrollLabel(id: string): string {
  return SCROLL_LABELS[id] ?? id.replace(/-/g, ' ')
}

export function buildAgentJonesNavigationHints(input: {
  pathname: string
  surface: AgentJonesSurface
  operating: AgentJonesOperatingContext
}): AgentJonesNavigationHint[] {
  const hints: AgentJonesNavigationHint[] = []
  const seen = new Set<string>()

  const push = (h: Omit<AgentJonesNavigationHint, 'priority'>) => {
    const key = `${h.kind}|${h.route ?? ''}|${h.target_id ?? ''}|${h.label}`
    if (seen.has(key)) return
    seen.add(key)
    const n = hints.length + 1
    if (n > 3) return
    hints.push({ ...h, priority: n as 1 | 2 | 3 })
  }

  for (const u of input.operating.urgent_signals) {
    const rh = u.route_hint?.trim()
    if (rh && isAgentJonesNavigatePath(rh)) {
      push({
        kind: 'navigate',
        label: u.label.slice(0, 72),
        route: rh,
        target_id: null,
        reason: u.owner_hint
          ? `Signal — ${u.owner_hint.slice(0, 48)}`
          : 'Open related desk',
      })
    }
  }

  for (const line of input.operating.command_summary.next_steps) {
    for (const id of parseScrollIdsFromText(line)) {
      push({
        kind: 'scroll',
        label: scrollLabel(id),
        route: null,
        target_id: id,
        reason: 'From your next steps',
      })
    }
  }

  const p = input.pathname.split('?')[0] ?? '/'
  const op = input.operating

  if (hints.length < 3 && p.startsWith('/admin')) {
    push({
      kind: 'scroll',
      label: 'Admin exceptions',
      route: null,
      target_id: 'admin-exceptions',
      reason: 'Governance',
    })
  }
  if (hints.length < 3 && p.startsWith('/coordinator')) {
    push({
      kind: 'scroll',
      label: 'Mission operations',
      route: null,
      target_id: 'coordinator-mission-ops',
      reason: 'Coordinator desk',
    })
  }
  if (hints.length < 3 && p.startsWith('/intern')) {
    push({
      kind: 'scroll',
      label: 'Intern desk',
      route: null,
      target_id: 'intern-desk',
      reason: 'Intern desk',
    })
  }
  if (hints.length < 3 && (p.startsWith('/dashboard') || p === '/')) {
    if (
      op.desk_health.volunteer_lane === 'urgent' ||
      op.urgent_signals.some((s) => s.severity === 'urgent')
    ) {
      push({
        kind: 'scroll',
        label: 'Mission tasks',
        route: null,
        target_id: 'mission-tasks',
        reason: 'Clear urgent lane',
      })
    } else if (op.command_summary.next_steps.some((s) => s.includes('daily'))) {
      push({
        kind: 'scroll',
        label: 'Daily activation',
        route: null,
        target_id: 'daily-activation',
        reason: 'Today’s checklist',
      })
    }
  }
  if (hints.length < 3 && input.surface === 'candidate_desk') {
    push({
      kind: 'scroll',
      label: 'Health snapshot',
      route: null,
      target_id: 'candidate-health-snapshot',
      reason: 'Leadership desk',
    })
  }
  if (hints.length < 3 && p.startsWith('/events')) {
    const onRecord = /^\/events\/[^/]+$/.test(p) && p !== '/events/calendar'
    push({
      kind: 'scroll',
      label: onRecord ? 'Event record' : 'Event desk overview',
      route: null,
      target_id: onRecord ? 'event-record-detail' : 'event-coordinator-desk',
      reason: onRecord ? 'Scaffold and type tasks' : 'Event coordinator command',
    })
  }

  return hints.slice(0, 3)
}
