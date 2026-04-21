/**
 * Blends browser-local field execution truth into the event health score surfaced on the desk.
 * Penalties are capped so the core coordinator model still dominates.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { healthStatusFromScore, type EventHealthStatusBand } from './eventHealthScoreService'
import type { EventHealthScoreV2Result } from './eventHealthScoreV2'
import { effectiveDayOfPhase } from './eventDayOfExecutionService'
import type { EventDayOfWorkspace } from './eventDayOfSchemas'

export type FieldExecutionHealthOverlay = {
  /** Score after deterministic field penalties (0–100). */
  adjusted_score: number
  adjusted_status: EventHealthStatusBand
  /** Short lines for the Field panel + digest-style surfacing. */
  field_reasons: string[]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Applies a bounded penalty from day-of workspace state (issues, live check-ins, post-event closure).
 */
export function overlayFieldExecutionOnHealth(
  base: EventHealthScoreV2Result,
  record: CampaignCalendarEventRecord,
  workspace: EventDayOfWorkspace | null,
  nowMs: number,
): FieldExecutionHealthOverlay {
  const field_reasons: string[] = []
  let penalty = 0

  if (workspace) {
    const openIssues = workspace.issues.filter((i) => i.status !== 'resolved').length
    if (openIssues > 0) {
      const p = Math.min(14, openIssues * 3)
      penalty += p
      field_reasons.push(
        `${openIssues} open day-of field issue(s) — resolve or assign before debrief.`,
      )
    }

    const phase = effectiveDayOfPhase(workspace, record, nowMs)
    if (phase === 'live' || phase === 'winding_down') {
      const pendingCi = workspace.check_ins.filter(
        (c) => c.status === 'expected' || c.status === 'late',
      ).length
      if (pendingCi > 0) {
        const p = Math.min(10, pendingCi * 2)
        penalty += p
        field_reasons.push(
          `${pendingCi} staffing check-in row(s) still expected or late during live operations.`,
        )
      }
    }

    const endMs = new Date(record.end_at || record.start_at).getTime()
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      const done =
        workspace.closure.items.length > 0 && workspace.closure.items.every((x) => x.done)
      if (!done) {
        penalty += 6
        field_reasons.push('Post-event closure checklist not complete in day-of workspace.')
      }
      if (!workspace.signup_sheet_handoff_ack) {
        penalty += 3
        field_reasons.push('Signup sheet handoff not acknowledged after event window.')
      }
    }
  }

  penalty = clamp(penalty, 0, 22)
  const adjusted_score = Math.round(clamp(base.current_score - penalty, 0, 100))
  const adjusted_status = healthStatusFromScore(adjusted_score)

  return { adjusted_score, adjusted_status, field_reasons }
}
