/**
 * Default closure checklist for field execution (shared by runtime + workspace guards).
 */

import type { ClosureChecklistItem } from './eventDayOfSchemas'

export function defaultClosureItems(): ClosureChecklistItem[] {
  return [
    { id: 'cl-ros', label: 'Run of show finalized in system', done: false },
    { id: 'cl-teardown', label: 'Teardown / venue cleared', done: false },
    { id: 'cl-staff', label: 'Staffing accounted for', done: false },
    { id: 'cl-media', label: 'Key media uploaded to event library', done: false },
    { id: 'cl-signup', label: 'Signup sheets captured / ingestion queued', done: false },
    { id: 'cl-followup', label: 'Urgent follow-ups captured', done: false },
    { id: 'cl-debrief', label: 'Debrief owner assigned', done: false },
  ]
}
