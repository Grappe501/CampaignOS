/**
 * Memory index — placeholder interface for future durable retrieval snapshots.
 */

import type { EventAiRetrievalContextV1 } from './eventAiOrchestrationSchemas'

export type EventAiMemoryIndexEntry = {
  id: string
  campaign_id: string
  saved_at_ms: number
  retrieval: EventAiRetrievalContextV1
}

/** In-memory dev aid only — replace with Supabase + vector refs. */
const memory: EventAiMemoryIndexEntry[] = []

export function pushMemoryIndexEntry(entry: EventAiMemoryIndexEntry): void {
  memory.unshift(entry)
  if (memory.length > 40) memory.pop()
}

export function listMemoryIndexEntries(): readonly EventAiMemoryIndexEntry[] {
  return memory
}
