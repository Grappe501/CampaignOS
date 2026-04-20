/**
 * Bridges campaign event staffing roles to volunteer command roles and recommendations.
 */

import type { EventStaffRoleSlug } from './eventStaffingMatrix'
import {
  recommendVolunteersForRole,
  type RecommendationContext,
} from './volunteerCommandRecommendations'
import type { VolunteerRecommendation } from './volunteerCommandDomain'
import { createAssignment } from './volunteerCommandApi'

/** Best-effort map from event matrix slugs to volunteer_roles.role_slug. */
const EVENT_STAFF_TO_VOLUNTEER_ROLE: Partial<Record<EventStaffRoleSlug, string>> = {
  greeter: 'greeter',
  checkin: 'check_in_support',
  setup: 'setup_support',
  cleanup: 'cleanup_support',
  photography: 'photographer',
  volunteer_captain: 'team_lead',
  materials_runner: 'logistics_support',
  driver: 'logistics_support',
  host: 'host_support',
  event_lead: 'team_lead',
  candidate_support: 'host_support',
  finance_support: 'host_support',
  speaker_support: 'host_support',
  press_support: 'outreach_support',
  data_capture: 'check_in_support',
  security: 'setup_support',
  general_volunteer: 'outreach_support',
  canvass_captain: 'team_lead',
  phone_bank_lead: 'team_lead',
  early_vote_site_lead: 'team_lead',
  election_day_staging_lead: 'team_lead',
}

export function mapEventStaffRoleToVolunteerRoleSlug(eventStaffSlug: string): string {
  const k = eventStaffSlug as EventStaffRoleSlug
  return EVENT_STAFF_TO_VOLUNTEER_ROLE[k] ?? 'outreach_support'
}

export function suggestVolunteersForEventStaffingGap(
  ctx: RecommendationContext,
  eventStaffRoleSlug: string,
  limit = 8,
): VolunteerRecommendation[] {
  const volRole = mapEventStaffRoleToVolunteerRoleSlug(eventStaffRoleSlug)
  return recommendVolunteersForRole(volRole, ctx, limit)
}

export async function createVolunteerAssignmentForEventGap(input: {
  campaignId?: string
  eventId: string
  eventStaffRoleSlug: string
  volunteerId: string
  assignedBy?: string | null
}): Promise<{ id: string | null; error: Error | null }> {
  const roleSlug = mapEventStaffRoleToVolunteerRoleSlug(input.eventStaffRoleSlug)
  return createAssignment({
    campaignId: input.campaignId,
    roleSlug,
    volunteerId: input.volunteerId,
    eventId: input.eventId,
    status: 'assigned',
    assignedBy: input.assignedBy,
  })
}
