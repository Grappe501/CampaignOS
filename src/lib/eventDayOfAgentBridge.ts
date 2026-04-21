/**
 * Bounded day-of / field execution snapshot for Agent Jones (same deterministic source as the Field panel).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import type { AgentJonesFieldExecutionSnapshot } from './agentJonesEventIntelligenceBridge'
import { loadEventDayWorkspace } from './eventDayOfLocalStorage'
import {
  buildDayOfBriefingLines,
  buildInitialDayOfWorkspace,
  effectiveDayOfPhase,
  mergeAssignmentsIntoCheckins,
  scheduleSegmentsForEventStart,
} from './eventDayOfExecutionService'

export function buildAgentJonesFieldExecutionSnapshot(
  record: CampaignCalendarEventRecord,
  staffingAssignments: readonly StaffingAssignmentLike[],
  nowMs: number,
): AgentJonesFieldExecutionSnapshot | null {
  if (typeof localStorage === 'undefined') return null
  let ws = loadEventDayWorkspace(record.event_id)
  if (!ws) ws = buildInitialDayOfWorkspace(record, staffingAssignments)
  ws = mergeAssignmentsIntoCheckins(ws, staffingAssignments)
  ws = { ...ws, segments: scheduleSegmentsForEventStart(ws.segments, record.start_at) }
  const phase = effectiveDayOfPhase(ws, record, nowMs)
  const briefing_lines = buildDayOfBriefingLines({ record, ws, phase })
  return {
    phase_label: phase.replace(/_/g, ' '),
    briefing_lines: briefing_lines.slice(0, 8),
    open_field_issues: ws.issues.filter((i) => i.status !== 'resolved').length,
    pending_closure_items: ws.closure.items.filter((x) => !x.done).length,
    signup_handoff_ack: ws.signup_sheet_handoff_ack,
    source: 'browser_workspace_v1',
  }
}
