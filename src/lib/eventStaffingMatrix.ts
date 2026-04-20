/**
 * Event staffing matrix & shift model (blueprint 18).
 * Templates are app-side; rows persist in `campaign_event_staffing_assignments` (Supabase).
 */

import type { CalendarStaffingStatus } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'

export const EVENT_STAFF_ROLE_SLUGS = [
  'event_lead',
  'host',
  'candidate_support',
  'finance_support',
  'volunteer_captain',
  'checkin',
  'greeter',
  'speaker_support',
  'materials_runner',
  'setup',
  'cleanup',
  'security',
  'press_support',
  'photography',
  'data_capture',
  'driver',
  'general_volunteer',
  /** Reserved for GOTV / early vote / Election Day programs */
  'canvass_captain',
  'phone_bank_lead',
  'early_vote_site_lead',
  'election_day_staging_lead',
] as const

export type EventStaffRoleSlug = (typeof EVENT_STAFF_ROLE_SLUGS)[number]

export const STAFF_ROLE_LABELS: Record<EventStaffRoleSlug, string> = {
  event_lead: 'Event lead',
  host: 'Host',
  candidate_support: 'Candidate / surrogate support',
  finance_support: 'Finance support',
  volunteer_captain: 'Volunteer captain',
  checkin: 'Check-in',
  greeter: 'Greeter',
  speaker_support: 'Speaker / program support',
  materials_runner: 'Materials runner',
  setup: 'Setup',
  cleanup: 'Cleanup',
  security: 'Security / crowd',
  press_support: 'Press liaison',
  photography: 'Photography / content',
  data_capture: 'Data capture / signups',
  driver: 'Driver / logistics transport',
  general_volunteer: 'General volunteer',
  canvass_captain: 'Canvass captain',
  phone_bank_lead: 'Phone bank lead',
  early_vote_site_lead: 'Early vote site lead',
  election_day_staging_lead: 'Election Day staging lead',
}

/** One required “slot” in the matrix (may map to multiple assignment rows when shifts enabled). */
export type EventStaffRoleTemplate = {
  slug: EventStaffRoleSlug
  /** When true, event should not execute without at least minFilled slots. */
  required: boolean
  /** Minimum filled assignments (confirmed or completed) for this slug. */
  minFilled: number
  /** When true, UI may offer shift splits (maps to shift_* columns on assignments). */
  supportsShifts: boolean
  notes?: string
}

export type StaffingAssignmentLike = {
  staff_role_slug: string
  assigned_user_id: string | null
  assigned_display_name?: string | null
  shift_label?: string | null
  shift_start_at?: string | null
  shift_end_at?: string | null
  status: string
}

const FILLED_STATUSES = new Set(['confirmed', 'completed'])

function isFilled(a: StaffingAssignmentLike): boolean {
  return FILLED_STATUSES.has(String(a.status).toLowerCase())
}

export function roleFilledCount(role: EventStaffRoleSlug, assignments: readonly StaffingAssignmentLike[]): number {
  return assignments.filter((a) => a.staff_role_slug === role && isFilled(a)).length
}

export function getStaffingMatrixForEventType(eventType: CampaignEventTypeKey): EventStaffRoleTemplate[] {
  switch (eventType) {
    case 'public_fair_festival':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'volunteer_captain', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'greeter', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'materials_runner', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'setup', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'cleanup', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true, notes: 'Booth coverage' },
      ]
    case 'house_party_intro_candidate':
      return [
        { slug: 'host', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'candidate_support', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'greeter', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'general_volunteer', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'house_party_fundraising':
      return [
        { slug: 'host', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'finance_support', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'checkin', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'data_capture', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'lunch_meeting':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'finance_support', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'candidate_support', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'coffee_meeting':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'volunteer_captain', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'general_volunteer', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'county_party_meeting':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'volunteer_captain', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'materials_runner', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'speaker_support', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'campaign_rally':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'candidate_support', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'volunteer_captain', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'security', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'press_support', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'photography', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'speaker_support', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'setup', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'cleanup', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'general_volunteer', required: false, minFilled: 4, supportsShifts: true },
      ]
    case 'volunteer_recruitment_event':
      return [
        { slug: 'volunteer_captain', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'data_capture', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true },
      ]
    case 'community_listening_session':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'data_capture', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'greeter', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'early_vote_rally':
      return [
        { slug: 'early_vote_site_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'canvass_captain', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true },
      ]
    case 'gotv_staging_event':
      return [
        { slug: 'election_day_staging_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'canvass_captain', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'materials_runner', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true },
      ]
    case 'faith_values_gathering':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'greeter', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'data_capture', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'general_volunteer', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'canvass_launch_event':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'canvass_captain', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'materials_runner', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true },
      ]
    case 'coalition_partner_event':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'greeter', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'data_capture', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'press_support', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'campus_youth_activation':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'volunteer_captain', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'checkin', required: true, minFilled: 1, supportsShifts: true },
        { slug: 'general_volunteer', required: false, minFilled: 2, supportsShifts: true },
      ]
    case 'digital_hybrid_event':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'speaker_support', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'data_capture', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'press_support', required: false, minFilled: 1, supportsShifts: false },
      ]
    case 'surrogate_appearance_event':
      return [
        { slug: 'event_lead', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'speaker_support', required: true, minFilled: 1, supportsShifts: false },
        { slug: 'press_support', required: false, minFilled: 1, supportsShifts: false },
        { slug: 'checkin', required: false, minFilled: 1, supportsShifts: true },
        { slug: 'photography', required: false, minFilled: 1, supportsShifts: false },
      ]
  }
}

export type StaffingMatrixRoleStatus = {
  template: EventStaffRoleTemplate
  label: string
  filled: number
  openInvited: number
  deficit: number
  satisfied: boolean
}

export function evaluateStaffingMatrix(
  eventType: CampaignEventTypeKey,
  assignments: readonly StaffingAssignmentLike[],
): StaffingMatrixRoleStatus[] {
  const templates = getStaffingMatrixForEventType(eventType)
  return templates.map((template) => {
    const filled = roleFilledCount(template.slug, assignments)
    const invitedOpen = assignments.filter(
      (a) =>
        a.staff_role_slug === template.slug &&
        String(a.status).toLowerCase() === 'invited' &&
        !(a.assigned_user_id ?? '').trim() &&
        !(a.assigned_display_name ?? '').trim(),
    ).length
    const deficit = Math.max(0, template.minFilled - filled)
    return {
      template,
      label: STAFF_ROLE_LABELS[template.slug],
      filled,
      openInvited: invitedOpen,
      deficit,
      satisfied: filled >= template.minFilled,
    }
  })
}

export function requiredRolesUncovered(statuses: readonly StaffingMatrixRoleStatus[]): EventStaffRoleSlug[] {
  return statuses
    .filter((s) => s.template.required && !s.satisfied)
    .map((s) => s.template.slug)
}

/**
 * Derive coverage state from the matrix (ignores row.staffing_state — compare in UI).
 */
export function deriveStaffingStateFromMatrix(
  eventType: CampaignEventTypeKey,
  assignments: readonly StaffingAssignmentLike[],
  nowMs: number,
  eventStartMs: number,
): CalendarStaffingStatus {
  const statuses = evaluateStaffingMatrix(eventType, assignments)
  const required = statuses.filter((s) => s.template.required)
  const anyFilled = statuses.some((s) => s.filled > 0)
  const allRequiredMet = required.every((s) => s.satisfied)

  if (!anyFilled) return 'unstaffed'
  if (!allRequiredMet) {
    const hours = (eventStartMs - nowMs) / 3_600_000
    if (hours <= 48 && hours >= 0) return 'at_risk'
    return 'partially_staffed'
  }
  const optionalGap = statuses.some((s) => !s.template.required && !s.satisfied && s.template.minFilled > 0)
  if (optionalGap) return 'partially_staffed'
  return 'staffed'
}

export function isCampaignEventTypeKey(raw: string): raw is CampaignEventTypeKey {
  return (
    raw === 'public_fair_festival' ||
    raw === 'house_party_intro_candidate' ||
    raw === 'house_party_fundraising' ||
    raw === 'lunch_meeting' ||
    raw === 'coffee_meeting' ||
    raw === 'county_party_meeting' ||
    raw === 'campaign_rally' ||
    raw === 'volunteer_recruitment_event' ||
    raw === 'community_listening_session' ||
    raw === 'early_vote_rally' ||
    raw === 'gotv_staging_event' ||
    raw === 'faith_values_gathering' ||
    raw === 'canvass_launch_event' ||
    raw === 'coalition_partner_event' ||
    raw === 'campus_youth_activation' ||
    raw === 'digital_hybrid_event' ||
    raw === 'surrogate_appearance_event'
  )
}
