/**
 * Coordinator-side persistence of open work into volunteer_opportunities for analytics and custom rows.
 * Volunteers still see merged live feed via volunteerOpportunityMerge without requiring sync.
 */

import { supabase } from './supabaseClient'
import { fetchOpenAssignments } from './volunteerCommandApi'

export async function syncOpenAssignmentsToMarketplace(campaignId = 'default'): Promise<{
  synced: number
  error: Error | null
}> {
  const open = await fetchOpenAssignments(campaignId)
  const now = new Date().toISOString()
  let n = 0
  for (const a of open) {
    const { error } = await supabase.from('volunteer_opportunities').upsert(
      {
        campaign_id: campaignId,
        source_type: 'assignment',
        source_id: a.id,
        title: `Open assignment — ${a.roleSlug}`,
        description: 'Synced from volunteer assignment queue.',
        role_slug: a.roleSlug,
        event_id: a.eventId,
        shift_id: a.shiftId,
        shift_slot_id: a.shiftSlotId,
        opportunity_type: 'assignment',
        category: 'open_work',
        commitment_type: a.shiftId ? 'shift' : 'task',
        due_at: a.dueAt,
        quantity_open: 1,
        quantity_filled: 0,
        priority: a.priority,
        status: 'open',
        self_claim_allowed: true,
        coordinator_assignment_allowed: true,
        required_skills_json: [],
        preferred_skills_json: [],
        required_training_json: [],
        onboarding_required: false,
        metadata_json: { sync: 'assignment' },
        updated_at: now,
      },
      { onConflict: 'campaign_id,source_type,source_id' },
    )
    if (error) return { synced: n, error: new Error(error.message) }
    n += 1
  }
  return { synced: n, error: null }
}

export async function archiveStaleOpportunitiesForResolvedAssignments(
  campaignId = 'default',
): Promise<{ error: Error | null }> {
  const { data: opps, error: e1 } = await supabase
    .from('volunteer_opportunities')
    .select('id, source_id')
    .eq('campaign_id', campaignId)
    .eq('source_type', 'assignment')
    .eq('status', 'open')

  if (e1) return { error: new Error(e1.message) }
  const assignments = await fetchOpenAssignments(campaignId)
  const openIds = new Set(assignments.map((a) => a.id))

  for (const o of opps ?? []) {
    const row = o as { id: string; source_id: string }
    if (!openIds.has(row.source_id)) {
      const { error } = await supabase
        .from('volunteer_opportunities')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (error) return { error: new Error(error.message) }
    }
  }
  return { error: null }
}
