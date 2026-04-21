/**
 * Deterministic turnout phase engine (time-to-election, configurable calendar).
 */

import { getCountdownParts, getPollCloseUtcMs } from './campaignClock'
import { GOTV_ELECTION_CALENDAR, type GotvTurnoutPhase } from './gotvDomain'

const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000

/** Start of election day in America/Chicago as UTC instant (poll date only, midnight CT). */
export function electionDayStartUtcMs(): number {
  // Nov 3, 2026 00:00 US Central — 06:00 UTC if CST (Nov is standard time)
  return Date.UTC(2026, 10, 3, 6, 0, 0, 0)
}

export function msToPollClose(nowMs: number): number {
  return getPollCloseUtcMs() - nowMs
}

export type GotvPhaseResolution = {
  phase: GotvTurnoutPhase
  ms_to_poll_close: number
  days_to_poll_close: number
  /** Priority lines for command surfaces (deterministic). */
  phase_priorities: string[]
  urgency_multiplier: number
}

export function resolveGotvTurnoutPhase(
  nowMs: number,
  calendar: typeof GOTV_ELECTION_CALENDAR = GOTV_ELECTION_CALENDAR,
): GotvPhaseResolution {
  const parts = getCountdownParts(nowMs)
  const msToClose = msToPollClose(nowMs)
  const daysToClose = parts.isPast ? 0 : parts.days
  const evStart = calendar.earlyVoteStartUtcMs
  const evEnd = calendar.earlyVoteEndUtcMs
  const electionStart = electionDayStartUtcMs()
  const pollsClose = getPollCloseUtcMs()

  let phase: GotvTurnoutPhase = 'pre_early_vote_ramp'
  if (parts.isPast || msToClose < -36 * MS_HOUR) {
    phase = 'post_election_review'
  } else if (msToClose < 0 && msToClose >= -36 * MS_HOUR) {
    phase = 'post_close_wrap'
  } else if (nowMs >= electionStart && nowMs < pollsClose + MS_HOUR) {
    phase = 'election_day'
  } else if (msToClose <= 48 * MS_HOUR) {
    phase = 'pre_election_48h'
  } else if (msToClose <= 96 * MS_HOUR) {
    phase = 'pre_election_96h'
  } else if (nowMs >= evStart && nowMs <= evEnd) {
    const evElapsed = nowMs - evStart
    phase =
      evElapsed <= calendar.earlyVoteLaunchHours * MS_HOUR ? 'early_vote_launch' : 'early_vote_sustain'
  } else if (nowMs < evStart) {
    phase = 'pre_early_vote_ramp'
  } else if (nowMs > evEnd && nowMs < electionStart) {
    // After early vote, before election day (e.g. overnight): final stretch posture
    phase = msToClose <= 21 * MS_DAY ? 'pre_election_96h' : 'pre_early_vote_ramp'
  } else {
    phase = 'pre_early_vote_ramp'
  }

  const phase_priorities = prioritiesForPhase(phase)
  const urgency_multiplier = urgencyForPhase(phase)

  return {
    phase,
    ms_to_poll_close: msToClose,
    days_to_poll_close: daysToClose,
    phase_priorities,
    urgency_multiplier,
  }
}

function urgencyForPhase(phase: GotvTurnoutPhase): number {
  switch (phase) {
    case 'election_day':
    case 'post_close_wrap':
      return 1.35
    case 'pre_election_48h':
      return 1.28
    case 'pre_election_96h':
      return 1.18
    case 'early_vote_launch':
      return 1.12
    case 'early_vote_sustain':
      return 1.06
    default:
      return 1
  }
}

function prioritiesForPhase(phase: GotvTurnoutPhase): string[] {
  switch (phase) {
    case 'pre_early_vote_ramp':
      return [
        'Stand up early vote site roster shells and captains.',
        'Validate county → site mapping and volunteer depth by importance.',
      ]
    case 'early_vote_launch':
      return [
        'Confirm captains and first-shift greeters at every early vote site.',
        'Run same-day replacement queue for no-shows.',
      ]
    case 'early_vote_sustain':
      return [
        'Hold daily coverage parity vs required slots; escalate chronic gaps.',
        'Keep confirmation rate above floor — reminder waves for soft commits.',
      ]
    case 'pre_election_96h':
      return [
        'Freeze risky roster experiments; focus on red/orange polling sites.',
        'Pre-stage election-day runners and backup captains.',
      ]
    case 'pre_election_48h':
      return [
        'No uncovered high-importance sites — county lead review mandatory.',
        'Incident playbook live: short-staffed and routing confusion paths.',
      ]
    case 'election_day':
      return [
        'Real-time fill workflow and county escalation for critical sites.',
        'Comms check every captain channel before peak waves.',
      ]
    case 'post_close_wrap':
      return [
        'Close incidents, capture lessons, release volunteers with thanks.',
        'Snapshot coverage actuals for audit and Script #7 relational follow-up.',
      ]
    case 'post_election_review':
      return [
        'Archive turnout command data; mark sites closed in system of record.',
      ]
    default:
      return ['Review turnout command board for your phase.']
  }
}

export function phaseExpectsHigherCoverage(phase: GotvTurnoutPhase): boolean {
  return (
    phase === 'early_vote_launch' ||
    phase === 'pre_election_48h' ||
    phase === 'election_day'
  )
}
