/**
 * Event request governance — aligns with `approval_required` + `operational_status === 'approval_needed'`.
 * Approve/reject RPCs enforce authorization server-side (`is_campaign_event_editor`).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'
import { isDevAuthBypassEnabled } from './devAuth'
import { runApprovalPrecheck } from './approvalPrecheckEngine'

/** Pending volunteer / neighborhood submissions awaiting coordinator action. */
export function listPendingApprovalEvents(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return [...events]
    .filter((e) => e.approval_required === true)
    .filter((e) => String(e.operational_status ?? '') === 'approval_needed')
    .sort(
      (a, b) =>
        new Date(a.submitted_for_review_at ?? a.created_at).getTime() -
        new Date(b.submitted_for_review_at ?? b.created_at).getTime(),
    )
}

export type ApprovalQueueSortMode =
  | 'oldest_request'
  | 'earliest_event'
  | 'highest_risk'
  | 'precheck_worst'
  | 'submission_quality'

/** Deterministic queue ordering for governance workload. */
export function sortPendingApprovalEvents(
  events: readonly CampaignCalendarEventRecord[],
  mode: ApprovalQueueSortMode,
  peerEvents?: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  const list = listPendingApprovalEvents(events)
  const peers = peerEvents ?? events

  const withPrecheck = list.map((e) => ({
    e,
    pre: runApprovalPrecheck(e, { peerEvents: peers }),
  }))

  if (mode === 'oldest_request') {
    return [...list].sort(
      (a, b) =>
        new Date(a.submitted_for_review_at ?? a.created_at).getTime() -
        new Date(b.submitted_for_review_at ?? b.created_at).getTime(),
    )
  }
  if (mode === 'earliest_event') {
    return [...list].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }
  if (mode === 'highest_risk') {
    return [...list].sort((a, b) => {
      const ra = riskRank(a.approval_risk_level)
      const rb = riskRank(b.approval_risk_level)
      if (ra !== rb) return rb - ra
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    })
  }
  if (mode === 'precheck_worst') {
    return withPrecheck
      .sort((a, b) => a.pre.readiness_precheck_score - b.pre.readiness_precheck_score)
      .map((x) => x.e)
  }
  if (mode === 'submission_quality') {
    return withPrecheck
      .sort((a, b) => {
        const fa = failedPrecheckChecks(a.pre)
        const fb = failedPrecheckChecks(b.pre)
        if (fa !== fb) return fb - fa
        return a.pre.readiness_precheck_score - b.pre.readiness_precheck_score
      })
      .map((x) => x.e)
  }
  return list
}

function riskRank(level: string | null | undefined): number {
  const s = String(level ?? '').toLowerCase()
  if (s === 'high') return 3
  if (s === 'medium') return 2
  if (s === 'low') return 1
  return 0
}

function failedPrecheckChecks(pre: { checks: { ok: boolean }[] }): number {
  return pre.checks.filter((c) => !c.ok).length
}

/**
 * Client-side gate aligned with `is_campaign_event_editor` roles (coordinator, campaign_manager, candidate, …).
 */
export function canApproveEventRequests(
  profile: { primary_role?: string | null } | null | undefined,
): boolean {
  if (isDevAuthBypassEnabled()) return true
  return canAccessEventCoordinatorDesk(profile?.primary_role)
}
