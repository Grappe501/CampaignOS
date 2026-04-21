/**
 * Closure + debrief truth checks for field execution (deterministic, client-side v1).
 */

import type { EventDayOfWorkspace } from './eventDayOfSchemas'
import { buildFieldClosureIntegrityWarnings } from './eventDayOfExecutionService'

export type FieldClosureRiskSnapshot = {
  missingClosureLabels: string[]
  /** Populated when every checklist item is checked but field state contradicts closure. */
  integrityWarnings: string[]
}

export function evaluateFieldClosureRisk(ws: EventDayOfWorkspace): FieldClosureRiskSnapshot {
  return {
    missingClosureLabels: ws.closure.items.filter((x) => !x.done).map((x) => x.label),
    integrityWarnings: buildFieldClosureIntegrityWarnings(ws),
  }
}
