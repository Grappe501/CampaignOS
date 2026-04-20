/**
 * Supabase access for volunteer_opportunities, bookmarks, invites.
 */

import { supabase } from './supabaseClient'
import type {
  OpportunityCommitmentType,
  OpportunityMarketplaceStatus,
  OpportunitySourceType,
  OpportunityVisibilityScope,
  VolunteerOpportunity,
} from './volunteerOpportunityDomain'

function parseJsonArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export function mapVolunteerOpportunityRow(row: Record<string, unknown>): VolunteerOpportunity {
  return {
    id: String(row.id ?? ''),
    campaignId: String(row.campaign_id ?? 'default'),
    sourceType: String(row.source_type ?? 'assignment') as OpportunitySourceType,
    sourceId: String(row.source_id ?? ''),
    title: String(row.title ?? ''),
    description: row.description != null ? String(row.description) : null,
    roleSlug: row.role_slug != null ? String(row.role_slug) : null,
    eventId: row.event_id != null ? String(row.event_id) : null,
    shiftId: row.shift_id != null ? String(row.shift_id) : null,
    shiftSlotId: row.shift_slot_id != null ? String(row.shift_slot_id) : null,
    staffingRequirementId:
      row.staffing_requirement_id != null ? String(row.staffing_requirement_id) : null,
    opportunityType: String(row.opportunity_type ?? 'general'),
    category: String(row.category ?? 'general'),
    startsAt: row.starts_at != null ? String(row.starts_at) : null,
    endsAt: row.ends_at != null ? String(row.ends_at) : null,
    dueAt: row.due_at != null ? String(row.due_at) : null,
    locationLabel: row.location_label != null ? String(row.location_label) : null,
    regionLabel: row.region_label != null ? String(row.region_label) : null,
    commitmentType: String(row.commitment_type ?? 'task') as OpportunityCommitmentType,
    quantityOpen: Number(row.quantity_open ?? 0),
    quantityFilled: Number(row.quantity_filled ?? 0),
    selfClaimAllowed: row.self_claim_allowed !== false,
    coordinatorAssignmentAllowed: row.coordinator_assignment_allowed !== false,
    requiredSkillsJson: parseJsonArr(row.required_skills_json),
    preferredSkillsJson: parseJsonArr(row.preferred_skills_json),
    requiredTrainingJson: parseJsonArr(row.required_training_json),
    onboardingRequired: Boolean(row.onboarding_required),
    reliabilityPreference: row.reliability_preference != null ? String(row.reliability_preference) : null,
    priority: String(row.priority ?? 'medium') as VolunteerOpportunity['priority'],
    status: String(row.status ?? 'open') as OpportunityMarketplaceStatus,
    visibilityScope: String(row.visibility_scope ?? 'campaign') as OpportunityVisibilityScope,
    metadataJson:
      row.metadata_json && typeof row.metadata_json === 'object'
        ? (row.metadata_json as Record<string, unknown>)
        : {},
    createdBy: row.created_by != null ? String(row.created_by) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    virtual: false,
  }
}

export async function fetchOpportunitiesFromDb(
  campaignId = 'default',
): Promise<VolunteerOpportunity[]> {
  const { data, error } = await supabase
    .from('volunteer_opportunities')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['open', 'paused'])
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapVolunteerOpportunityRow(r as Record<string, unknown>))
}

export async function updateOpportunityStatus(
  opportunityId: string,
  status: OpportunityMarketplaceStatus,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('volunteer_opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', opportunityId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchBookmarkedOpportunityIds(volunteerId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('volunteer_opportunity_bookmarks')
    .select('opportunity_id')
    .eq('volunteer_id', volunteerId)

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => String((r as { opportunity_id: string }).opportunity_id)))
}

export async function setOpportunityBookmark(
  volunteerId: string,
  opportunityId: string,
  bookmarked: boolean,
): Promise<{ error: Error | null }> {
  if (bookmarked) {
    const { error } = await supabase.from('volunteer_opportunity_bookmarks').upsert(
      {
        volunteer_id: volunteerId,
        opportunity_id: opportunityId,
      },
      { onConflict: 'volunteer_id,opportunity_id' },
    )
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }
  const { error } = await supabase
    .from('volunteer_opportunity_bookmarks')
    .delete()
    .eq('volunteer_id', volunteerId)
    .eq('opportunity_id', opportunityId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}
