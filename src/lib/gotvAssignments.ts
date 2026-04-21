/**
 * Assignment query helpers (pure).
 */

import type { GotvSiteAssignmentRow } from './gotvDomain'

export function assignmentsForProfile(
  assignments: readonly GotvSiteAssignmentRow[],
  profileId: string,
): GotvSiteAssignmentRow[] {
  return assignments.filter((a) => a.campaign_profile_id === profileId)
}
