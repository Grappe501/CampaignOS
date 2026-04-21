/**
 * Future tool / function names — bounded to app-safe routes; execution stays server+permissioned.
 */
export const EVENT_AI_TOOL_NAMES = [
  'navigate_cockpit',
  'navigate_event_command',
  'navigate_approvals_queue',
  'request_simulation_stub',
  'fetch_packet_snapshot',
] as const

export type EventAiToolName = (typeof EVENT_AI_TOOL_NAMES)[number]
