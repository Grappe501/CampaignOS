/** Pure formatters for intern desk copy — no I/O. */

export function formatPipelineStatusLabel(status: string): string {
  const s = String(status ?? '').trim().toLowerCase()
  if (s === 'pending') return 'Awaiting first contact'
  if (s === 'contacted') return 'Follow-up in progress'
  if (s) return s.replace(/_/g, ' ')
  return 'Unknown status'
}

export function isFirstContactOverdue(
  status: string,
  firstContactDueIso: string,
  nowMs: number,
): boolean {
  if (String(status).trim().toLowerCase() !== 'pending') return false
  const due = new Date(firstContactDueIso).getTime()
  return Number.isFinite(due) && nowMs > due
}

export function formatDueClockSummary(
  nowMs: number,
  iso: string,
  mode: 'first_contact' | 'next_action',
): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) {
    return mode === 'first_contact'
      ? 'First contact window not set'
      : 'Next action time not set'
  }
  const deltaMin = Math.round((t - nowMs) / 60000)
  const absMin = Math.abs(deltaMin)
  let rel: string
  if (absMin < 60) {
    rel = deltaMin <= 0 ? `${absMin}m overdue` : `in ${absMin}m`
  } else {
    const hours = Math.round(absMin / 60)
    if (hours < 48) {
      rel = deltaMin <= 0 ? `${hours}h overdue` : `in ${hours}h`
    } else {
      const days = Math.round(hours / 24)
      rel = deltaMin <= 0 ? `${days}d overdue` : `in ${days}d`
    }
  }
  return mode === 'first_contact'
    ? `First contact ${rel}`
    : `Next action ${rel}`
}

export function formatVolunteerRef(volunteerProfileId: string): string {
  const id = String(volunteerProfileId ?? '').trim()
  if (!id) return 'Volunteer'
  return id.length > 12 ? `Volunteer ${id.slice(0, 8)}…` : `Volunteer ${id}`
}

export function escalationLabel(level: number): string | null {
  if (!Number.isFinite(level) || level <= 0) return null
  return `Coordinator attention · level ${level}`
}
