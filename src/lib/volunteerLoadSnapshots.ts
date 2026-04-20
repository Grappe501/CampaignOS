/**
 * Session-scoped volunteer load snapshots for trend hints (paired with staffingCoverageSnapshots).
 */

import type { VolunteerLoadProfile } from './volunteerLoadModels'

export type VolunteerLoadSnapshot = {
  user_id: string
  captured_at: string
  load_score: number
  state: VolunteerLoadProfile['state']
}

const KEY = 'campaignos_volunteer_load_snapshots_v1'
const MAX = 300

function read(): VolunteerLoadSnapshot[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as VolunteerLoadSnapshot[]) : []
  } catch {
    return []
  }
}

function write(rows: VolunteerLoadSnapshot[]) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)))
  } catch {
    /* quota */
  }
}

export function recordVolunteerLoadSnapshot(row: VolunteerLoadSnapshot): void {
  write([...read(), row])
}

export function snapshotsForVolunteer(userId: string): VolunteerLoadSnapshot[] {
  return read().filter((r) => r.user_id === userId)
}
