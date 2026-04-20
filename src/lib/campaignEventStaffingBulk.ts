/**
 * Bulk fetch staffing assignments for dashboard / heatmap / load balancer.
 */

import { supabase } from './supabaseClient'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'

export async function fetchStaffingAssignmentsForEvents(
  eventIds: readonly string[],
): Promise<Map<string, StaffingAssignmentLike[]>> {
  const map = new Map<string, StaffingAssignmentLike[]>()
  if (!eventIds.length) return map

  const { data, error } = await supabase
    .from('campaign_event_staffing_assignments')
    .select(
      'event_id,staff_role_slug,assigned_user_id,assigned_display_name,shift_label,shift_start_at,shift_end_at,status',
    )
    .in('event_id', [...eventIds])

  if (error || !data) return map

  for (const r of data) {
    const eid = String((r as { event_id?: string }).event_id ?? '')
    if (!eid) continue
    const row: StaffingAssignmentLike = {
      staff_role_slug: String((r as { staff_role_slug?: string }).staff_role_slug ?? ''),
      assigned_user_id:
        (r as { assigned_user_id?: string | null }).assigned_user_id != null
          ? String((r as { assigned_user_id?: string | null }).assigned_user_id)
          : null,
      assigned_display_name:
        (r as { assigned_display_name?: string | null }).assigned_display_name != null
          ? String((r as { assigned_display_name?: string | null }).assigned_display_name)
          : null,
      shift_label:
        (r as { shift_label?: string | null }).shift_label != null
          ? String((r as { shift_label?: string | null }).shift_label)
          : undefined,
      shift_start_at:
        (r as { shift_start_at?: string | null }).shift_start_at != null
          ? String((r as { shift_start_at?: string | null }).shift_start_at)
          : undefined,
      shift_end_at:
        (r as { shift_end_at?: string | null }).shift_end_at != null
          ? String((r as { shift_end_at?: string | null }).shift_end_at)
          : undefined,
      status: String((r as { status?: string }).status ?? 'invited'),
    }
    const arr = map.get(eid) ?? []
    arr.push(row)
    map.set(eid, arr)
  }

  return map
}
