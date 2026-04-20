/**
 * Dev-only staffing assignment rows aligned with blueprint 18 + `campaign_event_staffing_assignments`.
 */

import type { StaffingAssignmentLike } from './eventStaffingMatrix'

const MAP: Record<string, StaffingAssignmentLike[]> = {
  // Washington County fair — partial coverage
  'a1000000-0000-4000-8000-000000000001': [
    {
      staff_role_slug: 'event_lead',
      assigned_user_id: 'coord-alex',
      status: 'confirmed',
      shift_label: 'Fair day',
      shift_start_at: '2026-04-26T15:00:00.000Z',
      shift_end_at: '2026-04-26T20:00:00.000Z',
    },
    {
      staff_role_slug: 'volunteer_captain',
      assigned_user_id: null,
      assigned_display_name: null,
      status: 'invited',
      shift_label: 'Volunteer lead',
    },
    {
      staff_role_slug: 'checkin',
      assigned_user_id: null,
      assigned_display_name: 'Open — assign volunteer',
      status: 'invited',
    },
    {
      staff_role_slug: 'setup',
      assigned_user_id: 'vol-ops-taylor',
      status: 'confirmed',
      shift_label: 'Morning setup',
      shift_start_at: '2026-04-26T13:00:00.000Z',
      shift_end_at: '2026-04-26T15:00:00.000Z',
    },
  ],
  // House party intro — host + lead covered
  'a1000000-0000-4000-8000-000000000002': [
    {
      staff_role_slug: 'host',
      assigned_user_id: 'host-jordan',
      status: 'confirmed',
    },
    {
      staff_role_slug: 'event_lead',
      assigned_user_id: 'coord-alex',
      status: 'confirmed',
    },
    {
      staff_role_slug: 'greeter',
      assigned_user_id: null,
      assigned_display_name: null,
      status: 'invited',
    },
  ],
}

export function getDevStaffingAssignmentsForEvent(eventId: string | undefined): StaffingAssignmentLike[] {
  if (!eventId || !import.meta.env.DEV) return []
  return MAP[eventId] ?? []
}
