/**
 * Dependency ordering hints — lighter than full simulation; used in summaries.
 */

export type EventAiDependencyNode = {
  id: string
  label: string
  blocked_by: string[]
}

/** Deterministic partial order for messaging — not a scheduler. */
export function buildStubDependencyChain(eventTitle: string): EventAiDependencyNode[] {
  return [
    { id: 'approve', label: `Approvals & charter — ${eventTitle}`, blocked_by: [] },
    { id: 'staff', label: 'Volunteer staffing confirmation', blocked_by: ['approve'] },
    { id: 'comms', label: 'Communications & promotion windows', blocked_by: ['approve', 'staff'] },
    { id: 'dayof', label: 'Day-of execution readiness', blocked_by: ['staff', 'comms'] },
    { id: 'after', label: 'After-action & learning capture', blocked_by: ['dayof'] },
  ]
}
