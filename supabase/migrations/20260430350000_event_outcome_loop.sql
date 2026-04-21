-- Event → Outcome Loop: DB truth layer (additive).
-- Extends campaign_event_outcomes, adds learning capture, rollup view, attendance sync trigger,
-- and expands post-event follow-up type enum.

-- ---------------------------------------------------------------------------
-- campaign_event_outcomes — extended dimensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_outcomes
    ADD COLUMN IF NOT EXISTS conversation_count integer
        CONSTRAINT campaign_event_outcomes_conversation_nonneg CHECK (
            conversation_count IS NULL OR conversation_count >= 0
        ),
    ADD COLUMN IF NOT EXISTS volunteer_assignments_created integer
        CONSTRAINT campaign_event_outcomes_vol_assign_nonneg CHECK (
            volunteer_assignments_created IS NULL OR volunteer_assignments_created >= 0
        ),
    ADD COLUMN IF NOT EXISTS contacts_influenced_count integer
        CONSTRAINT campaign_event_outcomes_contacts_nonneg CHECK (
            contacts_influenced_count IS NULL OR contacts_influenced_count >= 0
        ),
    ADD COLUMN IF NOT EXISTS pledges_or_donations_count integer
        CONSTRAINT campaign_event_outcomes_pledges_nonneg CHECK (
            pledges_or_donations_count IS NULL OR pledges_or_donations_count >= 0
        ),
    ADD COLUMN IF NOT EXISTS conversation_summary text,
    ADD COLUMN IF NOT EXISTS outcome_stage text
        CONSTRAINT campaign_event_outcomes_stage_check CHECK (
            outcome_stage IS NULL
            OR outcome_stage IN (
                'planned',
                'promoted',
                'staffed',
                'ready',
                'executed',
                'attendance_captured',
                'followup_generated',
                'followup_in_progress',
                'converted',
                'closed_with_learnings',
                'incomplete_recovery'
            )
        ),
    ADD COLUMN IF NOT EXISTS closure_recovery_notes text,
    ADD COLUMN IF NOT EXISTS first_followup_at timestamptz;

COMMENT ON COLUMN public.campaign_event_outcomes.outcome_stage IS
    'Operational outcome lifecycle stage (canonical app enum in eventOutcomeDomain).';

-- ---------------------------------------------------------------------------
-- campaign_event_learning_capture — DB-backed closure / lessons (JSON payload)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_learning_capture (
    event_id uuid PRIMARY KEY REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS campaign_event_learning_capture_updated_idx
    ON public.campaign_event_learning_capture (updated_at DESC);

COMMENT ON TABLE public.campaign_event_learning_capture IS
    'Structured learning / after-action payload (mirrors LearningCaptureDraft in app).';

ALTER TABLE public.campaign_event_learning_capture ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_event_learning_capture_select ON public.campaign_event_learning_capture;
CREATE POLICY campaign_event_learning_capture_select ON public.campaign_event_learning_capture
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_learning_capture_insert ON public.campaign_event_learning_capture;
CREATE POLICY campaign_event_learning_capture_insert ON public.campaign_event_learning_capture
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_learning_capture_update ON public.campaign_event_learning_capture;
CREATE POLICY campaign_event_learning_capture_update ON public.campaign_event_learning_capture
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_learning_capture_delete ON public.campaign_event_learning_capture;
CREATE POLICY campaign_event_learning_capture_delete ON public.campaign_event_learning_capture
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_learning_capture TO authenticated;

DROP TRIGGER IF EXISTS trg_campaign_event_learning_capture_updated_at ON public.campaign_event_learning_capture;
CREATE TRIGGER trg_campaign_event_learning_capture_updated_at
    BEFORE UPDATE ON public.campaign_event_learning_capture
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_followups — expand followup_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_followups
    DROP CONSTRAINT IF EXISTS campaign_event_followups_followup_type_check;

ALTER TABLE public.campaign_event_followups
    ADD CONSTRAINT campaign_event_followups_followup_type_check CHECK (
        followup_type IN (
            'thank_you',
            'volunteer',
            'donor',
            'issue',
            'host',
            'county_intel',
            'media_story',
            'logistics_recovery',
            'next_event_invite',
            'team_lead_review',
            'conversion_task'
        )
    );

-- ---------------------------------------------------------------------------
-- Keep outcomes.attendance_count aligned with check-in rows (trusted rollup)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_campaign_event_outcome_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
DECLARE
    eid uuid;
    cnt integer;
BEGIN
    eid := COALESCE(NEW.event_id, OLD.event_id);
    SELECT count(*)::integer INTO cnt
    FROM public.campaign_event_attendance
    WHERE event_id = eid;

    INSERT INTO public.campaign_event_outcomes (event_id, attendance_count, updated_at)
    VALUES (eid, cnt, now())
    ON CONFLICT (event_id) DO UPDATE
    SET attendance_count = EXCLUDED.attendance_count,
        updated_at = now();

    RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_outcome_attendance_ins ON public.campaign_event_attendance;
CREATE TRIGGER trg_sync_outcome_attendance_ins
    AFTER INSERT ON public.campaign_event_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_campaign_event_outcome_attendance();

DROP TRIGGER IF EXISTS trg_sync_outcome_attendance_del ON public.campaign_event_attendance;
CREATE TRIGGER trg_sync_outcome_attendance_del
    AFTER DELETE ON public.campaign_event_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_campaign_event_outcome_attendance();

-- ---------------------------------------------------------------------------
-- Rollup view — one row per event for reporting / selectors
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.campaign_event_outcome_rollups_v1 AS
SELECT
    e.id AS event_id,
    e.campaign_id,
    e.title,
    e.event_type,
    e.county_id,
    e.precinct_id,
    e.district_id,
    e.operational_status,
    e.status AS lifecycle_status,
    e.start_at,
    e.end_at,
    e.expected_audience_size,
    e.actual_audience_size,
    e.volunteer_outcome,
    e.voter_contact_outcome,
    e.followup_state,
    o.outcome_stage,
    o.attendance_count AS outcome_attendance_count,
    o.conversation_count,
    o.volunteer_signup_count,
    o.lead_count,
    o.volunteer_assignments_created,
    o.contacts_influenced_count,
    o.pledges_or_donations_count,
    o.media_handoff_needed,
    o.completed_at AS outcome_completed_at,
    o.first_followup_at,
    (
        SELECT count(*)::integer
        FROM public.campaign_event_attendance a
        WHERE a.event_id = e.id
    ) AS attendance_checkin_count,
    (
        SELECT count(*)::integer
        FROM public.campaign_event_followups f
        WHERE f.event_id = e.id
    ) AS followups_total,
    (
        SELECT count(*)::integer
        FROM public.campaign_event_followups f
        WHERE f.event_id = e.id
          AND f.status IN ('pending', 'in_progress')
    ) AS followups_open,
    (
        SELECT min(f.created_at)
        FROM public.campaign_event_followups f
        WHERE f.event_id = e.id
    ) AS first_followup_created_at,
    (
        EXISTS (
            SELECT 1
            FROM public.campaign_event_learning_capture lc
            WHERE lc.event_id = e.id
              AND lc.payload <> '{}'::jsonb
        )
    ) AS has_learning_capture
FROM public.campaign_events e
LEFT JOIN public.campaign_event_outcomes o ON o.event_id = e.id;

COMMENT ON VIEW public.campaign_event_outcome_rollups_v1 IS
    'Join of event row, outcome summary, attendance/follow-up counts, learning flag.';

GRANT SELECT ON public.campaign_event_outcome_rollups_v1 TO authenticated;
