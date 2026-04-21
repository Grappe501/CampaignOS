/**
 * Entity links — opaque ids + relationship labels for graph queries.
 */

import type { EventAiRelationKind } from './eventAiRelationshipGraph'

export type EventAiEntityKind =
  | 'program_event'
  | 'approval'
  | 'task'
  | 'volunteer_shift'
  | 'comms_asset'
  | 'media_asset'
  | 'calendar_hold'
  | 'candidate_slot'
  | 'workbench_item'

export type EventAiEntityRef = {
  kind: EventAiEntityKind
  id: string
  label: string | null
}

export type EventAiEntityLink = {
  from: EventAiEntityRef
  to: EventAiEntityRef
  relation: EventAiRelationKind
  weight: 1 | 2 | 3
  note: string
}
