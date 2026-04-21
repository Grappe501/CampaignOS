/**
 * Supabase access for GOTV / polling place command (RLS).
 */

import { supabase } from './supabaseClient'
import type {
  GotvIncidentRow,
  GotvPollingPlaceRow,
  GotvSiteAssignmentRow,
  GotvSiteShiftRow,
} from './gotvDomain'

function mapPlace(raw: Record<string, unknown>): GotvPollingPlaceRow {
  return {
    id: String(raw.id),
    campaign_id: String(raw.campaign_id ?? 'default'),
    site_kind: raw.site_kind as GotvPollingPlaceRow['site_kind'],
    label: String(raw.label ?? ''),
    address_line: raw.address_line != null ? String(raw.address_line) : null,
    county_id: raw.county_id != null ? String(raw.county_id) : null,
    precinct_id: raw.precinct_id != null ? String(raw.precinct_id) : null,
    city: raw.city != null ? String(raw.city) : null,
    zone_key: raw.zone_key != null ? String(raw.zone_key) : null,
    importance: Number(raw.importance ?? 50),
    status: raw.status as GotvPollingPlaceRow['status'],
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

function mapShift(raw: Record<string, unknown>): GotvSiteShiftRow {
  return {
    id: String(raw.id),
    site_id: String(raw.site_id),
    role_slug: String(raw.role_slug ?? ''),
    shift_start: String(raw.shift_start ?? ''),
    shift_end: String(raw.shift_end ?? ''),
    slots_needed: Number(raw.slots_needed ?? 0),
    notes: raw.notes != null ? String(raw.notes) : null,
    status: raw.status as GotvSiteShiftRow['status'],
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

function mapAssignment(raw: Record<string, unknown>): GotvSiteAssignmentRow {
  return {
    id: String(raw.id),
    shift_id: String(raw.shift_id),
    campaign_profile_id: String(raw.campaign_profile_id),
    assignment_status: raw.assignment_status as GotvSiteAssignmentRow['assignment_status'],
    confirmed_at: raw.confirmed_at != null ? String(raw.confirmed_at) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

function mapIncident(raw: Record<string, unknown>): GotvIncidentRow {
  return {
    id: String(raw.id),
    campaign_id: String(raw.campaign_id ?? 'default'),
    site_id: String(raw.site_id),
    incident_kind: String(raw.incident_kind ?? ''),
    severity: raw.severity as GotvIncidentRow['severity'],
    status: raw.status as GotvIncidentRow['status'],
    owner_profile_id: raw.owner_profile_id != null ? String(raw.owner_profile_id) : null,
    message: String(raw.message ?? ''),
    payload: (raw.payload as Record<string, unknown>) ?? {},
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

export async function fetchGotvPollingPlaces(campaignId: string): Promise<GotvPollingPlaceRow[]> {
  const { data, error } = await supabase
    .from('campaign_polling_places')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('county_id', { ascending: true })
    .order('label', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPlace(r as Record<string, unknown>))
}

export async function fetchGotvShiftsForSites(siteIds: string[]): Promise<GotvSiteShiftRow[]> {
  if (!siteIds.length) return []
  const { data, error } = await supabase
    .from('campaign_turnout_site_shifts')
    .select('*')
    .in('site_id', siteIds)
    .order('shift_start', { ascending: true })
    .limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapShift(r as Record<string, unknown>))
}

export async function fetchGotvAssignmentsForShifts(
  shiftIds: string[],
): Promise<GotvSiteAssignmentRow[]> {
  if (!shiftIds.length) return []
  const { data, error } = await supabase
    .from('campaign_turnout_site_assignments')
    .select('*')
    .in('shift_id', shiftIds)
    .limit(5000)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapAssignment(r as Record<string, unknown>))
}

export async function fetchOpenGotvIncidents(campaignId: string): Promise<GotvIncidentRow[]> {
  const { data, error } = await supabase
    .from('campaign_turnout_incidents')
    .select('*')
    .eq('campaign_id', campaignId)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapIncident(r as Record<string, unknown>))
}

export async function insertGotvIncident(params: {
  campaignId: string
  siteId: string
  incidentKind: string
  severity: GotvIncidentRow['severity']
  message: string
  payload?: Record<string, unknown>
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('campaign_turnout_incidents')
    .insert({
      campaign_id: params.campaignId,
      site_id: params.siteId,
      incident_kind: params.incidentKind,
      severity: params.severity,
      status: 'open',
      message: params.message,
      payload: params.payload ?? {},
    })
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  const id = data && typeof data === 'object' && 'id' in data ? String((data as { id: string }).id) : ''
  if (!id) throw new Error('No incident id')
  return { id }
}

export async function logGotvIntervention(params: {
  campaignId: string
  siteId: string | null
  kind: string
  message: string
  payload?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('campaign_turnout_intervention_log').insert({
    campaign_id: params.campaignId,
    site_id: params.siteId,
    intervention_kind: params.kind,
    message: params.message,
    payload: params.payload ?? {},
  })
  if (error) throw new Error(error.message)
}
