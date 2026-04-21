/**
 * Bounded actions AI may recommend — execution only via app tools with permissions.
 */

export type EventAiActionKind =
  | 'scroll_to_module'
  | 'open_route'
  | 'open_approval_queue'
  | 'open_event_command'
  | 'draft_comms'
  | 'create_task_stub'

export type EventAiBoundedActionDef = {
  kind: EventAiActionKind
  label: string
  /** Requires coordinator / CM / etc. */
  permission_gate: 'self' | 'coordinator' | 'campaign_manager' | 'admin'
  route_pattern: string | null
}

export const EVENT_AI_BOUNDED_ACTIONS: readonly EventAiBoundedActionDef[] = [
  {
    kind: 'open_route',
    label: 'Open Campaign Manager cockpit',
    permission_gate: 'campaign_manager',
    route_pattern: '/cockpit/campaign-manager',
  },
  {
    kind: 'open_approval_queue',
    label: 'Open approvals queue',
    permission_gate: 'coordinator',
    route_pattern: '/events/review-requests',
  },
  {
    kind: 'open_event_command',
    label: 'Open event command',
    permission_gate: 'coordinator',
    route_pattern: '/events',
  },
]
