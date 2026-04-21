import type { EventCommunicationsWorkspace, EventMediaLibraryRecord, EventContentDraft } from './eventCommsModels'
import { parseCommunicationsWorkspaceJson } from './eventCommsWorkspaceGuards'

const KEY = (eventId: string) => `campaignos:event-comms-ws:v1:${eventId}`

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

/** Best-effort parse; falls back to legacy shape if strict guard rejects older blobs. */
export function loadCommunicationsWorkspace(eventId: string): EventCommunicationsWorkspace | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY(eventId))
    if (!raw) return null
    const parsed = parseCommunicationsWorkspaceJson(raw, eventId)
    if (parsed) return parsed
    const o = JSON.parse(raw) as unknown
    if (!isRecord(o) || o.v !== 1 || o.event_id !== eventId || !isRecord(o.plan)) return null
    return o as EventCommunicationsWorkspace
  } catch {
    return null
  }
}

export function saveCommunicationsWorkspace(ws: EventCommunicationsWorkspace): void {
  const next = { ...ws, updated_at: new Date().toISOString() }
  try {
    localStorage.setItem(KEY(next.event_id), JSON.stringify(next))
  } catch {
    /* quota */
  }
}

export function upsertDraft(ws: EventCommunicationsWorkspace, draft: EventContentDraft): EventCommunicationsWorkspace {
  const rest = ws.drafts.filter((d) => d.id !== draft.id)
  return {
    ...ws,
    drafts: [...rest, draft],
    audit: [
      ...ws.audit,
      { at: new Date().toISOString(), action: 'draft_saved', detail: draft.kind },
    ].slice(-80),
  }
}

export function upsertMedia(ws: EventCommunicationsWorkspace, row: EventMediaLibraryRecord): EventCommunicationsWorkspace {
  const rest = ws.media_library.filter((m) => m.id !== row.id)
  return {
    ...ws,
    media_library: [...rest, row],
    audit: [
      ...ws.audit,
      { at: new Date().toISOString(), action: 'media_added', detail: row.media_type },
    ].slice(-80),
  }
}
