import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { StaffingAssignmentLike } from '../lib/eventStaffingMatrix'

export function useEventStaffingAssignments(eventId: string | undefined | null) {
  const [assignments, setAssignments] = useState<StaffingAssignmentLike[]>([])

  useEffect(() => {
    if (!eventId) {
      setAssignments([])
      return
    }
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('campaign_event_staffing_assignments')
        .select(
          'staff_role_slug,assigned_user_id,assigned_display_name,shift_label,shift_start_at,shift_end_at,status',
        )
        .eq('event_id', eventId)

      if (cancelled || error) {
        if (!cancelled && error) setAssignments([])
        return
      }

      const mapped: StaffingAssignmentLike[] = (data ?? []).map((r) => ({
        staff_role_slug: String(r.staff_role_slug ?? ''),
        assigned_user_id: r.assigned_user_id != null ? String(r.assigned_user_id) : null,
        assigned_display_name: r.assigned_display_name != null ? String(r.assigned_display_name) : null,
        shift_label: r.shift_label != null ? String(r.shift_label) : undefined,
        shift_start_at: r.shift_start_at != null ? String(r.shift_start_at) : undefined,
        shift_end_at: r.shift_end_at != null ? String(r.shift_end_at) : undefined,
        status: String(r.status ?? 'invited'),
      }))
      setAssignments(mapped)
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  return assignments
}
