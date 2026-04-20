/**
 * Merge persisted marketplace rows with live open work (assignments, shift gaps, staffing gaps).
 */

import { supabase } from './supabaseClient'
import { fetchOpenAssignments, fetchShiftsForCampaign, fetchShiftSlots } from './volunteerCommandApi'
import { fetchVolunteerRoleDefinitions } from './volunteerCommandApi'
import { mapVolunteerOpportunityRow, fetchOpportunitiesFromDb } from './volunteerOpportunityApi'
import type { VolunteerOpportunity } from './volunteerOpportunityDomain'
import type { VolunteerAssignment } from './volunteerCommandDomain'

function virtualAssignmentId(id: string): string {
  return `v-asg:${id}`
}

function virtualSlotId(id: string): string {
  return `v-slot:${id}`
}

function virtualStaffId(id: string): string {
  return `v-staff:${id}`
}

function assignmentToVirtual(a: VolunteerAssignment, roleLabel: string): VolunteerOpportunity {
  return {
    id: virtualAssignmentId(a.id),
    campaignId: a.campaignId,
    sourceType: 'assignment',
    sourceId: a.id,
    title: `${roleLabel} — open assignment`,
    description: a.eventId ? 'Linked to a campaign event.' : 'Open volunteer command assignment.',
    roleSlug: a.roleSlug,
    eventId: a.eventId,
    shiftId: a.shiftId,
    shiftSlotId: a.shiftSlotId,
    staffingRequirementId: null,
    opportunityType: 'assignment',
    category: 'open_work',
    startsAt: null,
    endsAt: null,
    dueAt: a.dueAt,
    locationLabel: null,
    regionLabel: null,
    commitmentType: a.shiftId ? 'shift' : 'task',
    quantityOpen: 1,
    quantityFilled: 0,
    selfClaimAllowed: true,
    coordinatorAssignmentAllowed: true,
    requiredSkillsJson: [],
    preferredSkillsJson: [],
    requiredTrainingJson: [],
    onboardingRequired: false,
    reliabilityPreference: null,
    priority: a.priority,
    status: 'open',
    visibilityScope: 'campaign',
    metadataJson: { virtual: true },
    createdBy: null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    virtual: true,
  }
}

async function countAssignmentsForSlot(shiftSlotId: string): Promise<number> {
  const { data, error } = await supabase
    .from('volunteer_assignments')
    .select('status')
    .eq('shift_slot_id', shiftSlotId)
    .not('volunteer_id', 'is', null)

  if (error) return 0
  return (data ?? []).filter(
    (r) => !['canceled', 'declined'].includes(String((r as { status: string }).status)),
  ).length
}

async function fetchStaffingGaps(): Promise<
  { id: string; event_id: string; staff_role_slug: string; event_title: string | null; start_at: string | null }[]
> {
  const { data: staff, error } = await supabase
    .from('campaign_event_staffing_assignments')
    .select('id, event_id, staff_role_slug')
    .is('assigned_user_id', null)

  if (error || !staff?.length) return []

  const eventIds = [...new Set(staff.map((s) => String((s as { event_id: string }).event_id)))]
  const { data: evs } = await supabase
    .from('campaign_events')
    .select('id, title, start_at')
    .in('id', eventIds)

  const evMap = new Map<string, { title: string | null; start_at: string | null }>()
  for (const e of evs ?? []) {
    const r = e as { id: string; title: string | null; start_at: string | null }
    evMap.set(String(r.id), { title: r.title ?? null, start_at: r.start_at ?? null })
  }

  return staff.map((s) => {
    const row = s as { id: string; event_id: string; staff_role_slug: string }
    const ev = evMap.get(row.event_id)
    return {
      id: row.id,
      event_id: row.event_id,
      staff_role_slug: row.staff_role_slug,
      event_title: ev?.title ?? null,
      start_at: ev?.start_at ?? null,
    }
  })
}

function staffingToVirtual(s: {
  id: string
  event_id: string
  staff_role_slug: string
  event_title: string | null
  start_at: string | null
}): VolunteerOpportunity {
  return {
    id: virtualStaffId(s.id),
    campaignId: 'default',
    sourceType: 'staffing_requirement',
    sourceId: s.id,
    title: `${s.event_title ?? 'Event'} — ${s.staff_role_slug}`,
    description: 'Event staffing role needs a confirmed volunteer.',
    roleSlug: null,
    eventId: s.event_id,
    shiftId: null,
    shiftSlotId: null,
    staffingRequirementId: s.id,
    opportunityType: 'event_staffing',
    category: 'event',
    startsAt: s.start_at,
    endsAt: null,
    dueAt: null,
    locationLabel: null,
    regionLabel: null,
    commitmentType: 'task',
    quantityOpen: 1,
    quantityFilled: 0,
    selfClaimAllowed: true,
    coordinatorAssignmentAllowed: true,
    requiredSkillsJson: [],
    preferredSkillsJson: [],
    requiredTrainingJson: [],
    onboardingRequired: false,
    reliabilityPreference: null,
    priority: 'high',
    status: 'open',
    visibilityScope: 'campaign',
    metadataJson: { virtual: true, staff_role_slug: s.staff_role_slug },
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    virtual: true,
  }
}

/**
 * Full marketplace feed: DB opportunities + virtual rows for sources not yet synced.
 */
export async function fetchMergedMarketplaceOpportunities(
  campaignId = 'default',
): Promise<VolunteerOpportunity[]> {
  const [dbRows, openAssignments, roles, shifts, staffingGaps] = await Promise.all([
    fetchOpportunitiesFromDb(campaignId).catch(() => [] as VolunteerOpportunity[]),
    fetchOpenAssignments(campaignId),
    fetchVolunteerRoleDefinitions(),
    fetchShiftsForCampaign(campaignId),
    fetchStaffingGaps(),
  ])

  const roleLabel = (slug: string) => roles.find((r) => r.roleSlug === slug)?.label ?? slug

  const dbKeys = new Set(dbRows.map((r) => `${r.sourceType}:${r.sourceId}`))

  const virtualAsg: VolunteerOpportunity[] = []
  for (const a of openAssignments) {
    const key = `assignment:${a.id}`
    if (dbKeys.has(key)) continue
    virtualAsg.push(assignmentToVirtual(a, roleLabel(a.roleSlug)))
  }

  const virtualSlots: VolunteerOpportunity[] = []
  for (const sh of shifts) {
    if (sh.status === 'canceled') continue
    const slots = await fetchShiftSlots(sh.id)
    for (const sl of slots) {
      const filled = await countAssignmentsForSlot(sl.id)
      const open = Math.max(0, sl.slotsNeeded - filled)
      if (open <= 0) continue
      const key = `shift_slot:${sl.id}`
      if (dbKeys.has(key)) continue
      virtualSlots.push({
        id: virtualSlotId(sl.id),
        campaignId,
        sourceType: 'shift_slot',
        sourceId: sl.id,
        title: `${sh.title} — ${roleLabel(sl.roleSlug)}`,
        description: `Shift needs ${open} more (${sl.slotsNeeded} total).`,
        roleSlug: sl.roleSlug,
        eventId: sh.eventId,
        shiftId: sh.id,
        shiftSlotId: sl.id,
        staffingRequirementId: null,
        opportunityType: 'shift',
        category: 'shift',
        startsAt: sh.startsAt,
        endsAt: sh.endsAt,
        dueAt: sh.startsAt,
        locationLabel: sh.locationText,
        regionLabel: null,
        commitmentType: 'shift',
        quantityOpen: open,
        quantityFilled: filled,
        selfClaimAllowed: true,
        coordinatorAssignmentAllowed: true,
        requiredSkillsJson: [],
        preferredSkillsJson: [],
        requiredTrainingJson: [],
        onboardingRequired: false,
        reliabilityPreference: null,
        priority: 'medium',
        status: 'open',
        visibilityScope: 'campaign',
        metadataJson: { virtual: true },
        createdBy: null,
        createdAt: sh.createdAt,
        updatedAt: sh.updatedAt,
        virtual: true,
      })
    }
  }

  const virtualStaff: VolunteerOpportunity[] = []
  for (const s of staffingGaps) {
    const key = `staffing_requirement:${s.id}`
    if (dbKeys.has(key)) continue
    virtualStaff.push(staffingToVirtual(s))
  }

  const merged = [...dbRows, ...virtualAsg, ...virtualSlots, ...virtualStaff]
  merged.sort((a, b) => {
    const pr = { urgent: 4, high: 3, medium: 2, low: 1 }
    const pa = pr[a.priority] ?? 0
    const pb = pr[b.priority] ?? 0
    if (pb !== pa) return pb - pa
    const da = a.dueAt ?? a.startsAt ?? ''
    const db_ = b.dueAt ?? b.startsAt ?? ''
    return String(da).localeCompare(String(db_))
  })
  return merged
}

export function parseVirtualOpportunityId(id: string): {
  kind: 'assignment' | 'shift_slot' | 'staffing_requirement'
  sourceId: string
} | null {
  if (id.startsWith('v-asg:')) return { kind: 'assignment', sourceId: id.slice(6) }
  if (id.startsWith('v-slot:')) return { kind: 'shift_slot', sourceId: id.slice(7) }
  if (id.startsWith('v-staff:')) return { kind: 'staffing_requirement', sourceId: id.slice(8) }
  return null
}

export async function fetchOpportunityById(
  id: string,
  campaignId = 'default',
): Promise<VolunteerOpportunity | null> {
  const parsed = parseVirtualOpportunityId(id)
  if (parsed) {
    const all = await fetchMergedMarketplaceOpportunities(campaignId)
    return all.find((o) => o.id === id) ?? null
  }
  const { data, error } = await supabase
    .from('volunteer_opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return mapVolunteerOpportunityRow(data as Record<string, unknown>)
}
