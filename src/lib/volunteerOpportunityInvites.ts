/**
 * Coordinator → volunteer opportunity invites (persistence + dashboard visibility).
 * External delivery (email/SMS) can be wired later; state lives in volunteer_opportunity_invites.
 */

import { supabase } from './supabaseClient'

export async function createOpportunityInvite(input: {
  opportunityId: string
  volunteerId: string
  inviteType?: string
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('volunteer_opportunity_invites').insert({
    opportunity_id: input.opportunityId,
    volunteer_id: input.volunteerId,
    invite_type: input.inviteType ?? 'coordinator_nudge',
    status: 'pending',
  })
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
