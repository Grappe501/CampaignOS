/**
 * Map `campaign_events` (+ optional joined facets) to `CampaignCalendarEventRecord` for calendar UIs.
 */

import type {
  CalendarStaffingStatus,
  CampaignCalendarEventRecord,
} from './campaignCalendarArchitecture'

function buildAddressLine(row: Record<string, unknown>): string | null {
  const parts = [
    row.address_line_1,
    row.address_line_2,
    row.city,
    row.state,
    row.postal_code,
  ]
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean)
  if (parts.length) return parts.join(', ')
  const v = row.virtual_url != null ? String(row.virtual_url).trim() : ''
  return v || null
}

/** Normalize a Supabase `campaign_events` row (snake_case) to the shared calendar record shape. */
export function mapCampaignEventRowToCalendarRecord(row: Record<string, unknown>): CampaignCalendarEventRecord {
  const id = String(row.id ?? '')
  const mobilize = row.mobilize_publish_state
  const staffing = (row.staffing_state as CalendarStaffingStatus | undefined) ?? 'unstaffed'

  const readiness =
    row.readiness_score != null && row.readiness_score !== ''
      ? Number(row.readiness_score)
      : null

  return {
    event_id: id,
    campaign_id: row.campaign_id != null ? String(row.campaign_id) : 'default',
    operational_status: row.operational_status != null ? String(row.operational_status) : null,
    event_objective: row.event_objective != null ? String(row.event_objective) : null,
    volunteer_outcome:
      row.volunteer_outcome != null && row.volunteer_outcome !== ''
        ? Number(row.volunteer_outcome)
        : null,
    voter_contact_outcome:
      row.voter_contact_outcome != null && row.voter_contact_outcome !== ''
        ? Number(row.voter_contact_outcome)
        : null,
    readiness_score: readiness != null && !Number.isNaN(readiness) ? readiness : null,
    title: String(row.title ?? 'Untitled event'),
    event_type: String(row.event_type ?? 'coffee_meeting'),
    event_subtype: row.event_subtype != null ? String(row.event_subtype) : null,
    stage_status: String(row.status ?? 'draft'),
    start_at: String(row.start_at ?? new Date().toISOString()),
    end_at: row.end_at != null ? String(row.end_at) : '',
    timezone: row.timezone != null ? String(row.timezone) : 'America/Chicago',
    venue_name: row.venue_name != null ? String(row.venue_name) : null,
    address_or_virtual: buildAddressLine(row),
    postal_code: row.postal_code != null ? String(row.postal_code) : null,
    virtual_url: row.virtual_url != null ? String(row.virtual_url) : null,
    owner_user_id: row.owner_user_id != null ? String(row.owner_user_id) : null,
    owner_role: null,
    host_user_ids: [],
    county_id: row.county_id != null ? String(row.county_id) : null,
    precinct_id: row.precinct_id != null ? String(row.precinct_id) : null,
    district_id: row.district_id != null ? String(row.district_id) : null,
    visibility_scope: String(row.visibility_scope ?? 'internal_staff'),
    public_publish_state: row.public_publish_state != null ? String(row.public_publish_state) : null,
    mobilize_publish_state: mobilize != null ? String(mobilize) : 'not_applicable',
    mobilize_event_id: row.mobilize_event_id != null ? String(row.mobilize_event_id) : null,
    mobilize_last_synced_at: row.mobilize_last_synced_at != null ? String(row.mobilize_last_synced_at) : null,
    mobilize_last_error: row.mobilize_last_error != null ? String(row.mobilize_last_error) : null,
    mobilize_public_url: row.mobilize_public_url != null ? String(row.mobilize_public_url) : null,
    mobilize_tags_synced:
      row.mobilize_tags_synced === true || row.mobilize_tags_synced === false
        ? Boolean(row.mobilize_tags_synced)
        : null,
    mobilize_sync_hash: row.mobilize_sync_hash != null ? String(row.mobilize_sync_hash) : null,
    mobilize_update_needed:
      row.mobilize_update_needed === true || row.mobilize_update_needed === false
        ? Boolean(row.mobilize_update_needed)
        : null,
    mobilize_published_by_user_id:
      row.mobilize_published_by_user_id != null ? String(row.mobilize_published_by_user_id) : null,
    staffing_state: staffing,
    followup_state: row.followup_state != null ? String(row.followup_state) : null,
    finance_flag: Boolean(row.finance_related),
    candidate_flag: Boolean(row.candidate_involved),
    county_party_flag: Boolean(row.county_party_flag),
    public_title: row.public_title != null ? String(row.public_title) : null,
    public_description: row.public_description != null ? String(row.public_description) : null,
    public_instructions: row.public_instructions != null ? String(row.public_instructions) : null,
    public_location_notes: row.public_location_notes != null ? String(row.public_location_notes) : null,
    public_contact_name: row.public_contact_name != null ? String(row.public_contact_name) : null,
    public_contact_email: row.public_contact_email != null ? String(row.public_contact_email) : null,
    notes: row.notes_internal != null ? String(row.notes_internal) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    requester_user_id:
      row.requester_user_id != null ? String(row.requester_user_id) : null,
    approval_required:
      row.approval_required === true || row.approval_required === false
        ? Boolean(row.approval_required)
        : null,
    submitted_for_review_at:
      row.submitted_for_review_at != null ? String(row.submitted_for_review_at) : null,
    approved_by_user_id:
      row.approved_by_user_id != null ? String(row.approved_by_user_id) : null,
    approved_at: row.approved_at != null ? String(row.approved_at) : null,
    rejected_by_user_id:
      row.rejected_by_user_id != null ? String(row.rejected_by_user_id) : null,
    rejected_at: row.rejected_at != null ? String(row.rejected_at) : null,
    approval_notes: row.approval_notes != null ? String(row.approval_notes) : null,
    approval_review_state:
      row.approval_review_state != null ? String(row.approval_review_state) : null,
    approval_risk_level:
      row.approval_risk_level != null ? String(row.approval_risk_level) : null,
    approval_residual_conditions:
      row.approval_residual_conditions != null ? String(row.approval_residual_conditions) : null,
    approval_followup_required:
      row.approval_followup_required === true || row.approval_followup_required === false
        ? Boolean(row.approval_followup_required)
        : null,
    request_origin_surface:
      row.request_origin_surface != null ? String(row.request_origin_surface) : null,
    last_operational_touch_at:
      row.last_operational_touch_at != null ? String(row.last_operational_touch_at) : null,
  }
}
