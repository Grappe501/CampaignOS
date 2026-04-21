/**
 * Communication step timing hints → absolute due dates (relative to event start).
 * Hints use the playbook convention: "-21d", "-1d", "0", "+1d", "+2d".
 */

export function parseTimingOffsetDays(timingHint: string): number | null {
  const h = timingHint.trim()
  if (h === '0') return 0
  const m = /^(-?\d+)d$/i.exec(h)
  if (!m) return null
  return parseInt(m[1], 10)
}

/**
 * Returns ISO timestamp for the step target, or null if event start is missing/invalid or hint unparsable.
 */
export function computeStepDueAtIso(timingHint: string, eventStartIso: string | null | undefined): string | null {
  const hint = parseTimingOffsetDays(timingHint)
  if (hint === null) return null
  const raw = eventStartIso?.trim()
  if (!raw) return null
  const start = new Date(raw)
  if (Number.isNaN(start.getTime())) return null
  if (hint === 0) return start.toISOString()
  const ms = start.getTime() + hint * 86400000
  return new Date(ms).toISOString()
}

export function describeTimingVsEventStart(
  timingHint: string,
  eventStartIso: string | null | undefined,
): string | null {
  const due = computeStepDueAtIso(timingHint, eventStartIso)
  if (!due) {
    if (!eventStartIso?.trim()) return 'Set a valid event start time to compute due dates.'
    if (parseTimingOffsetDays(timingHint) === null) return `Unrecognized timing "${timingHint}" — due date not computed.`
    return 'Could not compute due date.'
  }
  try {
    return new Date(due).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return due
  }
}
