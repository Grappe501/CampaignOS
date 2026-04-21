/**
 * Single source of truth for Agent Jones scroll targets and navigate paths.
 * Used by the client (`agentJonesContext`) and Netlify `agent-jones` — keep in sync automatically via this module.
 */

/** Dashboard sections the model may suggest scrolling to — same IDs as DOM `id` hooks. */
export const AGENT_JONES_SCROLL_TARGET_IDS = [
  'voter-workspace',
  'power5-workspace',
  'exception-request',
  'onboarding-branch',
  'onboarding-activation',
  'workspace-cards',
  'mission-tasks',
  'daily-activation',
  'intern-desk',
  'campaign-kpis',
  'agent-jones',
  'dash-profile-photo',
  'coordinator-mission-ops',
  'candidate-health-snapshot',
  'admin-overview',
  'admin-exceptions',
  'admin-desks',
  'admin-tasks',
  'admin-config',
  'event-coordinator-desk',
  'war-room-root',
  'leadership-briefing-root',
  'finance-command-root',
  'simulation-command-root',
  'cm-cockpit-root',
  'event-coordinator-postevent-queue',
  'event-calendar-page',
  'event-calendar-command',
  'event-calendar-filters',
  'event-record-detail',
  'event-record-command',
  'event-record-field',
  'event-record-communications',
  'event-detail-health',
  'event-overview',
  'event-stage-tracker',
  'event-task-checklist',
  'event-staffing',
  'event-logistics',
  'event-calendar-visibility',
  'event-mobilize',
  'event-outcomes',
  'event-followup',
] as const

/** Paths the model may suggest via navigate actions (client + Netlify must match). */
export const AGENT_JONES_NAVIGATE_PATHS = [
  '/',
  '/dashboard',
  '/intern',
  '/coordinator',
  '/candidate',
  '/admin',
  '/events',
  '/events/war-room',
  '/events/leadership',
  '/events/finance-command',
  '/events/simulation-command',
  '/events/calendar',
  '/events/review-requests',
  '/events/promotion',
  '/cockpit/campaign-manager',
] as const

export type AgentJonesNavigatePath = (typeof AGENT_JONES_NAVIGATE_PATHS)[number]

export function isAgentJonesNavigatePath(id: string): id is AgentJonesNavigatePath {
  return (AGENT_JONES_NAVIGATE_PATHS as readonly string[]).includes(id)
}

export type AgentJonesScrollTargetId =
  (typeof AGENT_JONES_SCROLL_TARGET_IDS)[number]

export function isAgentJonesScrollTargetId(
  id: string,
): id is AgentJonesScrollTargetId {
  return (AGENT_JONES_SCROLL_TARGET_IDS as readonly string[]).includes(id)
}
