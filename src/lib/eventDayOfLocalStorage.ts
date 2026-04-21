import type { EventDayOfWorkspace } from './eventDayOfSchemas'
import { parseEventDayWorkspaceJson } from './eventDayOfWorkspaceGuards'

const KEY = (eventId: string) => `campaignos:event-dayof-ws:v1:${eventId}`

/** Fired after a successful save so desk health overlays can resync without polling. */
export const EVENT_DAY_OF_WORKSPACE_SAVED = 'campaignos:event-dayof-saved' as const

export type EventDayOfWorkspaceSavedDetail = { eventId: string }

export function loadEventDayWorkspace(eventId: string): EventDayOfWorkspace | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY(eventId))
    if (!raw) return null
    return parseEventDayWorkspaceJson(raw, eventId)
  } catch {
    return null
  }
}

/** Persists workspace; returns false on quota / access failure so UI can surface a retry path. */
export function saveEventDayWorkspace(ws: EventDayOfWorkspace): boolean {
  const next = { ...ws, updated_at: new Date().toISOString() }
  try {
    localStorage.setItem(KEY(next.event_id), JSON.stringify(next))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(EVENT_DAY_OF_WORKSPACE_SAVED, {
          detail: { eventId: next.event_id } satisfies EventDayOfWorkspaceSavedDetail,
        }),
      )
    }
    return true
  } catch {
    return false
  }
}
