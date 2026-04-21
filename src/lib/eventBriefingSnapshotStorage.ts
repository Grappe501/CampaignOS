import type { SerializedBriefingSnapshot } from './eventIntelligenceContracts'

const PREFIX = 'campaignos:event-briefing-snap:v1:'

function key(eventId: string): string {
  return `${PREFIX}${eventId}`
}

export function loadBriefingSnapshot(eventId: string): SerializedBriefingSnapshot | null {
  try {
    const raw = localStorage.getItem(key(eventId))
    if (!raw) return null
    const o = JSON.parse(raw) as SerializedBriefingSnapshot
    if (o?.v !== 1 || o.event_id !== eventId) return null
    return o
  } catch {
    return null
  }
}

export function saveBriefingSnapshot(snap: SerializedBriefingSnapshot): void {
  try {
    localStorage.setItem(key(snap.event_id), JSON.stringify(snap))
  } catch {
    /* ignore */
  }
}
