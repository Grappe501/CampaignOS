import type { AgentJonesCalendarSummary, AgentJonesCountdownSummary } from './agentJonesContextV2'
import { getCountdownParts } from './campaignClock'
import { resolveGotvTurnoutPhase } from './gotvCountdownEngine'

const MS_HOUR = 3_600_000

export function buildAgentJonesCountdownSummary(input: {
  nowMs?: number
  calendarSummary: AgentJonesCalendarSummary | null
}): AgentJonesCountdownSummary | null {
  const now = input.nowMs ?? Date.now()
  const parts = getCountdownParts(now)
  const daysRemaining = parts.isPast ? 0 : parts.days
  const gotvPhase = resolveGotvTurnoutPhase(now)

  let countdown_window: AgentJonesCountdownSummary['countdown_window'] = null
  if (!parts.isPast) {
    if (parts.totalMs <= 12 * MS_HOUR) countdown_window = 'same_day'
    else if (parts.totalMs <= 24 * MS_HOUR) countdown_window = '24h'
    else if (parts.totalMs <= 48 * MS_HOUR) countdown_window = '48h'
    else if (parts.totalMs <= 96 * MS_HOUR) countdown_window = '96h'
    else if (parts.days <= 7) countdown_window = '7d'
  }

  const cal = input.calendarSummary
  const nextEvt = cal?.next_event_title?.trim()
  let next_countdown_label: string | null = 'Election Day (Nov 3, 2026 — in-app clock)'
  if (nextEvt) {
    next_countdown_label = nextEvt.slice(0, 120)
  }

  const hasTimingLayer =
    Boolean(nextEvt) ||
    (cal?.upcoming_count_7d != null && cal.upcoming_count_7d > 0) ||
    (cal?.governance_warning_count != null && cal.governance_warning_count > 0)
  let countdown_scope_note: string | null = null
  if (!parts.isPast && !hasTimingLayer) {
    countdown_scope_note =
      'Countdown leans on the in-app election clock — no assignment milestones in this timing slice.'
  }

  const notes: string[] = []
  if (!parts.isPast) {
    notes.push(
      `${daysRemaining} day(s) to polls close on the in-app election clock — not a board of elections system.`,
    )
  }
  if (cal?.upcoming_count_7d != null && cal.upcoming_count_7d > 0) {
    notes.push(
      `~7d timing layer: ${cal.upcoming_count_7d} visible assignment-related item(s).`,
    )
  }
  if (cal?.governance_warning_count != null && cal.governance_warning_count > 0) {
    notes.push(
      `${cal.governance_warning_count} governance / escalation timing signal(s) in this session.`,
    )
  }

  let countdown_pressure_headline: string | null = null
  if (parts.isPast) {
    countdown_pressure_headline = 'Polls-close milestone passed on the campaign clock — pivot to wrap-up framing.'
  } else if (countdown_window === 'same_day' || countdown_window === '24h') {
    countdown_pressure_headline =
      'Same-day / final-day pressure: protect poll coverage, hotline, and captain comms from visible boards only.'
  } else if (countdown_window === '48h' || countdown_window === '96h') {
    countdown_pressure_headline =
      '96h–48h class pressure: sequence volunteer deployment and event shifts before opening new programs.'
  } else if (countdown_window === '7d') {
    countdown_pressure_headline =
      'Inside one week to polls close (clock): tighten deadlines and staffing truth on coordinator surfaces.'
  } else if (daysRemaining <= 21) {
    countdown_pressure_headline =
      'Inside ~three weeks to polls close — prioritize honest capacity and coverage over narrative experiments.'
  }

  if (
    !countdown_pressure_headline &&
    !notes.length &&
    daysRemaining == null &&
    !next_countdown_label
  ) {
    return null
  }

  return {
    next_countdown_label,
    days_remaining: daysRemaining,
    countdown_window,
    countdown_pressure_headline,
    turnout_phase: gotvPhase.phase,
    turnout_phase_priorities: gotvPhase.phase_priorities.slice(0, 4),
    ...(countdown_scope_note ? { countdown_scope_note } : {}),
    ...(notes.length ? { action_window_notes: notes.slice(0, 4) } : {}),
  }
}
