/**
 * Deterministic preflight checks before rapid actions (permissions stay server-side in RLS/RPC).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { eventIsPendingVolunteerRequest } from './eventSubmissionApproval'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { findOverlappingEventIdsForUser } from './volunteerLoadBalancerService'
import type { RapidActionType } from './rapidActionSchemas'

export type RapidActionPrecheckResult = { ok: boolean; block?: boolean; warnings: string[] }

export function precheckRapidAction(input: {
  action: RapidActionType
  event: CampaignCalendarEventRecord | null
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  allEvents: readonly CampaignCalendarEventRecord[]
  /** Target volunteer for assignment-heavy actions */
  targetVolunteerUserId?: string | null
}): RapidActionPrecheckResult {
  const warnings: string[] = []
  const e = input.event
  if (!e) return { ok: false, block: true, warnings: ['No event context'] }

  const pending = eventIsPendingVolunteerRequest(e)
  const staffOps: RapidActionType[] = [
    'assign_volunteer_to_role',
    'create_assignment',
    'create_shift_slot',
    'reassign_volunteer_to_role',
    'confirm_provisional_coverage',
    'create_backup_staffing_role',
    'convert_gap_to_marketplace_opportunity',
  ]

  if (pending && staffOps.includes(input.action)) {
    warnings.push('Event is still a pending request — staffing actions are provisional until approval.')
  }

  const uid = input.targetVolunteerUserId
  if (uid && (input.action === 'assign_volunteer_to_role' || input.action === 'reassign_volunteer_to_role')) {
    const ov = findOverlappingEventIdsForUser(uid, input.allEvents, input.assignmentMap)
    if (ov.length >= 2) {
      return {
        ok: false,
        block: true,
        warnings: [
          'Hard conflict: this volunteer already has overlapping event windows in the campaign list — resolve schedule before assigning.',
        ],
      }
    }
  }

  return { ok: true, block: false, warnings }
}
