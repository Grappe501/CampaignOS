/**
 * Claim flows: routes virtual + persisted opportunities to assignments, shifts, or event staffing.
 */

import { supabase } from './supabaseClient'
import {
  claimAssignment,
  createAssignment,
  fetchOpenAssignments,
  logVolunteerActivity,
} from './volunteerCommandApi'
import { fetchCampaignEventById } from './campaignEventsFromSupabase'
import { recomputeAndPersistEventReadiness } from './campaignEventReadinessPersistence'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { mapEventStaffRoleToVolunteerRoleSlug } from './volunteerEventStaffingAdapter'
import { parseVirtualOpportunityId } from './volunteerOpportunityMerge'
import type { VolunteerOpportunity } from './volunteerOpportunityDomain'

export type ClaimResult = { ok: true } | { ok: false; error: string }

export async function claimOpportunity(input: {
  volunteerId: string
  profileId: string
  opportunity: VolunteerOpportunity
}): Promise<ClaimResult> {
  const { volunteerId, profileId, opportunity } = input
  const vid = parseVirtualOpportunityId(opportunity.id)

  if (vid?.kind === 'assignment' || opportunity.sourceType === 'assignment') {
    const assignmentId = vid?.sourceId ?? opportunity.sourceId
    const { error } = await claimAssignment(assignmentId, volunteerId)
    if (error) return { ok: false, error: error.message }
    await logVolunteerActivity(volunteerId, 'marketplace_claim_assignment', { assignmentId }, profileId)
    return { ok: true }
  }

  if (vid?.kind === 'shift_slot' || opportunity.sourceType === 'shift_slot') {
    const slotId = vid?.sourceId ?? opportunity.shiftSlotId ?? opportunity.sourceId
    const shiftId = opportunity.shiftId
    const roleSlug = opportunity.roleSlug
    if (!shiftId || !roleSlug) return { ok: false, error: 'Shift opportunity is missing shift or role.' }

    const open = (await fetchOpenAssignments(opportunity.campaignId)).filter(
      (a) => a.shiftSlotId === slotId && a.status === 'open' && !a.volunteerId,
    )
    if (open[0]) {
      const { error } = await claimAssignment(open[0].id, volunteerId)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await createAssignment({
        campaignId: opportunity.campaignId,
        roleSlug,
        volunteerId,
        shiftId,
        shiftSlotId: slotId,
        eventId: opportunity.eventId,
        status: 'assigned',
        assignedBy: profileId,
      })
      if (error) return { ok: false, error: error.message }
    }
    await logVolunteerActivity(volunteerId, 'marketplace_claim_shift_slot', { shiftId, slotId }, profileId)
    return { ok: true }
  }

  if (vid?.kind === 'staffing_requirement' || opportunity.sourceType === 'staffing_requirement') {
    const staffId = vid?.sourceId ?? opportunity.staffingRequirementId ?? opportunity.sourceId
    const { error } = await supabase
      .from('campaign_event_staffing_assignments')
      .update({
        assigned_user_id: profileId,
        assigned_display_name: null,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .is('assigned_user_id', null)

    if (error) return { ok: false, error: error.message }

    const evId = opportunity.eventId
    if (evId) {
      const slug = String(opportunity.metadataJson?.staff_role_slug ?? 'greeter')
      const volRole = mapEventStaffRoleToVolunteerRoleSlug(slug)
      const ca = await createAssignment({
        campaignId: opportunity.campaignId,
        roleSlug: volRole,
        volunteerId,
        eventId: evId,
        status: 'assigned',
        assignedBy: profileId,
      })
      if (ca.error) {
        /* staffing row updated; assignment mirror is best-effort */
      }

      const { event, error: evErr } = await fetchCampaignEventById(evId)
      if (!evErr && event) {
        const typeKey = event.event_type
        if (isCampaignEventTypeKey(typeKey)) {
          const { data: row } = await supabase.from('campaign_events').select('*').eq('id', evId).maybeSingle()
          if (row) {
            await recomputeAndPersistEventReadiness(evId, {
              eventType: typeKey,
              row: row as Record<string, unknown>,
            }).catch(() => {})
          }
        }
      }
    }

    await logVolunteerActivity(
      volunteerId,
      'marketplace_claim_staffing',
      { staffingId: staffId, eventId: evId },
      profileId,
    )
    return { ok: true }
  }

  if (opportunity.sourceType === 'custom_opportunity') {
    return { ok: false, error: 'Custom opportunities use coordinator assignment for now.' }
  }

  return { ok: false, error: 'Unsupported opportunity type.' }
}
