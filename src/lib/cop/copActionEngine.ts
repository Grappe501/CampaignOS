import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'
import type { CopActionCandidate, CopActionCategory } from './copTypes'
import { COP_ROUTES } from './copRouting'

function rankScore(a: CopActionCandidate): number {
  return (
    a.urgencyScore * 0.35 +
    a.impactScore * 0.3 +
    a.confidence * 0.15 +
    a.priorityScore * 0.2
  )
}

export function buildActionQueue(snap: LeadershipBriefingSnapshot): CopActionCandidate[] {
  const q: CopActionCandidate[] = []

  if (snap.counts.staffing_incomplete_events > 0) {
    q.push({
      id: 'act-staffing-program',
      title: `Resolve staffing gaps on ${String(snap.counts.staffing_incomplete_events)} program event(s)`,
      category: 'staffing',
      priorityScore: 0.85,
      urgencyScore: 0.82,
      impactScore: 0.8,
      confidence: 0.75,
      whyNow: 'Upcoming events need coverage before day-of strain.',
      blockers: snap.meta.data_quality_notes.filter((n) =>
        n.includes('Staffing assignment map'),
      ),
      requiresApproval: false,
      sourceMetricKeys: ['critical_events_understaffed', 'open_staffing_slots'],
      routeTarget: COP_ROUTES.volunteerCommand(),
    })
  }

  if (snap.counts.approval_pending > 0) {
    q.push({
      id: 'act-approvals',
      title: `Clear or delegate ${String(snap.counts.approval_pending)} pending approval(s)`,
      category: 'approvals',
      priorityScore: 0.9,
      urgencyScore: 0.78,
      impactScore: 0.72,
      confidence: 0.88,
      whyNow: 'Governance queue blocks publish and staffing activation.',
      blockers: [],
      requiresApproval: true,
      sourceMetricKeys: ['approval_backlog_total'],
      routeTarget: COP_ROUTES.approvals(),
    })
  }

  if (snap.counts.postevent_followup_gaps > 0) {
    q.push({
      id: 'act-closeout',
      title: `Close after-action / follow-up work (${String(snap.counts.postevent_followup_gaps)} gap(s))`,
      category: 'event_closeout',
      priorityScore: 0.65,
      urgencyScore: 0.55,
      impactScore: 0.58,
      confidence: 0.65,
      whyNow: 'Closure debt hides true program health.',
      blockers: [],
      requiresApproval: false,
      sourceMetricKeys: ['events_missing_after_action'],
      routeTarget: COP_ROUTES.warRoom(),
    })
  }

  if (snap.counts.critical_risk_events > 0) {
    q.push({
      id: 'act-war-room',
      title: `Triage ${String(snap.counts.critical_risk_events)} critical-band event(s) in war room`,
      category: 'event_preparation',
      priorityScore: 0.95,
      urgencyScore: 0.92,
      impactScore: 0.9,
      confidence: 0.8,
      whyNow: 'Critical band events drive turnout and comms risk.',
      blockers: [],
      requiresApproval: false,
      sourceMetricKeys: ['critical_events_understaffed'],
      routeTarget: COP_ROUTES.warRoom(),
    })
  }

  for (let i = 0; i < snap.recommendations.length && i < 6; i += 1) {
    const rec = snap.recommendations[i]!
    const cat: CopActionCategory =
      rec.route_hint === '/events/review-requests'
        ? 'approvals'
        : 'route_followup'
    q.push({
      id: `act-rec-${String(i)}-${rec.title.slice(0, 20).replace(/\W+/g, '-')}`,
      title: rec.title,
      category: cat,
      priorityScore: 0.55,
      urgencyScore: 0.5,
      impactScore: 0.55,
      confidence: 0.6,
      whyNow: rec.detail.slice(0, 220),
      blockers: [],
      requiresApproval: false,
      sourceMetricKeys: [],
      routeTarget: routeFromHint(rec.route_hint),
    })
  }

  return [...q].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 16)
}

function routeFromHint(
  hint: LeadershipBriefingSnapshot['recommendations'][0]['route_hint'],
): ReturnType<typeof COP_ROUTES.dashboard> {
  switch (hint) {
    case '/events/war-room':
      return COP_ROUTES.warRoom()
    case '/events/review-requests':
      return COP_ROUTES.approvals()
    case '/events/calendar':
      return COP_ROUTES.calendar()
    case '/events':
    default:
      return COP_ROUTES.eventsDesk()
  }
}
