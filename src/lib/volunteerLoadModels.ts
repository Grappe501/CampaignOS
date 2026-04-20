/**
 * Volunteer load / capacity states (advisory).
 */

export type VolunteerLoadState =
  | 'available'
  | 'healthy_load'
  | 'elevated_load'
  | 'overloaded'
  | 'burnout_risk'
  | 'inactive_but_available'
  /** Overlapping event windows for the same volunteer — deterministic block signal */
  | 'conflict_blocked'
  /** Few commitments vs capacity heuristic (advisory) */
  | 'underutilized_but_qualified'

export type VolunteerLoadProfile = {
  user_id: string
  display_hint: string | null
  load_score: number
  state: VolunteerLoadState
  active_assignments: number
  upcoming_events: number
  critical_roles_held: number
  hours_pressure: number
  details: string
}
