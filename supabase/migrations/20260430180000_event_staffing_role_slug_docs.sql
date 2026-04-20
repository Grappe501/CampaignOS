-- Blueprint 18 — Document staffing role slugs for `campaign_event_staffing_assignments`.
-- Application validates against `EVENT_STAFF_ROLE_SLUGS` in `src/lib/eventStaffingMatrix.ts`.
-- Shifts: optional `shift_label`, `shift_start_at`, `shift_end_at` on each assignment row.
-- Open slots: `assigned_user_id` NULL with placeholder copy in `assigned_display_name`, status `invited`.

COMMENT ON COLUMN public.campaign_event_staffing_assignments.staff_role_slug IS
    'Logical role: event_lead, host, volunteer_captain, checkin, setup, … — see eventStaffingMatrix.ts';

COMMENT ON COLUMN public.campaign_event_staffing_assignments.shift_label IS
    'Human-readable shift name when supportsShifts is true for that role template.';

COMMENT ON COLUMN public.campaign_event_staffing_assignments.shift_start_at IS
    'Optional shift window start (timestamptz); null for whole-event assignment.';

COMMENT ON COLUMN public.campaign_event_staffing_assignments.shift_end_at IS
    'Optional shift window end (timestamptz); must be >= shift_start_at when both set.';

COMMENT ON TABLE public.campaign_event_staffing_assignments IS
    'Staffing matrix instances: one row per role slot or shift; ties to campaign_events.id.';
