-- Step 2.1 — Operationalization: attendance, follow-ups, critical task flag.

-- ---------------------------------------------------------------------------
-- campaign_event_attendance (field check-in rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    contact_id uuid,
    display_name text NOT NULL,
    walk_in boolean NOT NULL DEFAULT false,
    flags jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS campaign_event_attendance_event_idx
    ON public.campaign_event_attendance (event_id, created_at DESC);

COMMENT ON TABLE public.campaign_event_attendance IS
    'Walk-in and RSVP check-in; flags hold volunteer_interest, donor_interest, issue_concern, influencer.';

-- ---------------------------------------------------------------------------
-- campaign_event_followups (24/48/72h and typed follow-up work)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_followups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    followup_type text NOT NULL
        CHECK (
            followup_type IN (
                'thank_you',
                'volunteer',
                'donor',
                'issue',
                'host',
                'county_intel'
            )
        ),
    assigned_to uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    due_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'complete', 'canceled')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS campaign_event_followups_event_due_idx
    ON public.campaign_event_followups (event_id, due_at);

CREATE INDEX IF NOT EXISTS campaign_event_followups_status_idx
    ON public.campaign_event_followups (status, due_at);

DROP TRIGGER IF EXISTS trg_campaign_event_followups_updated_at ON public.campaign_event_followups;
CREATE TRIGGER trg_campaign_event_followups_updated_at
    BEFORE UPDATE ON public.campaign_event_followups
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- Task instances — critical path flag (workflow engine)
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_task_instances
    ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.campaign_event_task_instances.is_critical IS
    'When true, counts toward readiness critical-task ratio.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_event_attendance_select ON public.campaign_event_attendance;
CREATE POLICY campaign_event_attendance_select ON public.campaign_event_attendance
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_attendance_insert ON public.campaign_event_attendance;
CREATE POLICY campaign_event_attendance_insert ON public.campaign_event_attendance
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_attendance_update ON public.campaign_event_attendance;
CREATE POLICY campaign_event_attendance_update ON public.campaign_event_attendance
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_attendance_delete ON public.campaign_event_attendance;
CREATE POLICY campaign_event_attendance_delete ON public.campaign_event_attendance
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_followups_select ON public.campaign_event_followups;
CREATE POLICY campaign_event_followups_select ON public.campaign_event_followups
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_followups_insert ON public.campaign_event_followups;
CREATE POLICY campaign_event_followups_insert ON public.campaign_event_followups
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_followups_update ON public.campaign_event_followups;
CREATE POLICY campaign_event_followups_update ON public.campaign_event_followups
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_followups_delete ON public.campaign_event_followups;
CREATE POLICY campaign_event_followups_delete ON public.campaign_event_followups
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_followups TO authenticated;
