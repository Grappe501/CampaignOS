/**
 * Central election clock for CampaignOS.
 * Update poll close here only (verify UTC against America/Chicago wall time).
 */

export const CAMPAIGN_ELECTION_CLOCK = {
  /** IANA zone for display copy and future extensions. */
  timeZone: 'America/Chicago',
  electionDayLabel: 'Tuesday, November 3, 2026',
  pollsCloseDisplay: '7:30 PM CT',
  headingLabel: 'Election Day Countdown',
  /**
   * Polls close: 2026-11-03 7:30 PM CST → UTC.
   * (DST ends first Sunday in Nov; Nov 3 is standard time.)
   */
  pollsCloseUtcMs: Date.UTC(2026, 10, 4, 1, 30, 0, 0),
} as const

export type CountdownParts = {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
}

export type CountdownUrgency = 'default' | 'd90' | 'd30' | 'd7' | 'h72' | 'closed'

const MS_DAY = 86_400_000
const MS_HOUR = 3_600_000
const MS_MIN = 60_000

export function getPollCloseUtcMs(): number {
  return CAMPAIGN_ELECTION_CLOCK.pollsCloseUtcMs
}

export function getCountdownParts(nowMs: number = Date.now()): CountdownParts {
  const end = getPollCloseUtcMs()
  const totalMs = end - nowMs
  if (totalMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    }
  }
  const seconds = Math.floor((totalMs / 1000) % 60)
  const minutes = Math.floor((totalMs / MS_MIN) % 60)
  const hours = Math.floor((totalMs / MS_HOUR) % 24)
  const days = Math.floor(totalMs / MS_DAY)
  return { totalMs, days, hours, minutes, seconds, isPast: false }
}

export function getCountdownUrgency(parts: CountdownParts): CountdownUrgency {
  if (parts.isPast) return 'closed'
  const t = parts.totalMs
  if (t <= 72 * MS_HOUR) return 'h72'
  if (t <= 7 * MS_DAY) return 'd7'
  if (t <= 30 * MS_DAY) return 'd30'
  if (t <= 90 * MS_DAY) return 'd90'
  return 'default'
}

/** Single-line timer: `Nd HH:MM:SS` or `HH:MM:SS` when under 24h to display day boundary... keep days until 0. */
export function formatCountdownDisplay(parts: CountdownParts): string {
  if (parts.isPast) return 'Polls closed — thank you for voting.'
  const { days, hours, minutes, seconds } = parts
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`
  }
  return `${hh}:${mm}:${ss}`
}

/** Shorter line for very narrow screens (no seconds clutter when many days). */
export function formatCountdownDisplayCompact(parts: CountdownParts): string {
  if (parts.isPast) return 'Polls closed'
  const { days, hours, minutes, seconds } = parts
  if (days >= 1) {
    return `${days}d ${hours}h ${minutes}m`
  }
  return `${hours}h ${minutes}m ${seconds}s`
}

export function pollsCloseIsoInstant(): string {
  return new Date(getPollCloseUtcMs()).toISOString()
}
