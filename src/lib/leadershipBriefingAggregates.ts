/**
 * Centralized, typed rollups for leadership briefing (single source with war-room / command).
 */

import type { WarRoomEventRow } from './multiEventWarRoomSchemas'

/** Aligned with war-room adjusted health — avoids duplicate full-program health passes. */
export function countCriticalEventsFromWarRows(rows: readonly WarRoomEventRow[]): number {
  const ids = new Set<string>()
  for (const r of rows) {
    if (r.adjusted_status === 'CRITICAL') {
      ids.add(r.item.record.event_id)
    }
  }
  return ids.size
}
