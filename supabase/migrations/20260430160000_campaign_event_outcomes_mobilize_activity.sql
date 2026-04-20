-- Blueprint 15 — Migration 3: outcomes, Mobilize sync mirror, activity log.

-- ---------------------------------------------------------------------------
-- campaign_event_outcomes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    attendance_count integer,
    lead_count integer,
    volunteer_signup_count integer,
    donor_followup_count integer,
    supporter_followup_count integer,
    media_handoff_needed boolean NOT NULL DEFAULT false,
    debrief_notes text,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_event_outcomes_one_per_event UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS campaign_event_outcomes_event_idx
    ON public.campaign_event_outcomes (event_id);

DROP TRIGGER IF EXISTS trg_campaign_event_outcomes_updated_at ON public.campaign_event_outcomes;
CREATE TRIGGER trg_campaign_event_outcomes_updated_at
    BEFORE UPDATE ON public.campaign_event_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_mobilize_sync
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_mobilize_sync (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    mobilize_event_id text,
    mobilize_public_url text,
    sync_state text NOT NULL DEFAULT 'not_applicable'
        CHECK (sync_state IN (
            'not_applicable',
            'eligible',
            'draft_ready',
            'queued',
            'queued_for_publish',
            'published',
            'update_required',
            'sync_error',
            'archived',
            'archived_remote'
        )),
    update_needed boolean NOT NULL DEFAULT false,
    last_synced_at timestamptz,
    last_error text,
    sync_hash text,
    tags_synced text[],
    published_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_event_mobilize_sync_one_per_event UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS campaign_event_mobilize_sync_event_idx
    ON public.campaign_event_mobilize_sync (event_id);

CREATE INDEX IF NOT EXISTS campaign_event_mobilize_sync_state_idx
    ON public.campaign_event_mobilize_sync (sync_state);

DROP TRIGGER IF EXISTS trg_campaign_event_mobilize_sync_updated_at ON public.campaign_event_mobilize_sync;
CREATE TRIGGER trg_campaign_event_mobilize_sync_updated_at
    BEFORE UPDATE ON public.campaign_event_mobilize_sync
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    message text NOT NULL,
    actor_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_event_activity_log_event_idx
    ON public.campaign_event_activity_log (event_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_mobilize_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_event_outcomes_select ON public.campaign_event_outcomes;
CREATE POLICY campaign_event_outcomes_select ON public.campaign_event_outcomes
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_outcomes_insert ON public.campaign_event_outcomes;
CREATE POLICY campaign_event_outcomes_insert ON public.campaign_event_outcomes
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_outcomes_update ON public.campaign_event_outcomes;
CREATE POLICY campaign_event_outcomes_update ON public.campaign_event_outcomes
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_outcomes_delete ON public.campaign_event_outcomes;
CREATE POLICY campaign_event_outcomes_delete ON public.campaign_event_outcomes
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_mobilize_sync_select ON public.campaign_event_mobilize_sync;
CREATE POLICY campaign_event_mobilize_sync_select ON public.campaign_event_mobilize_sync
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_mobilize_sync_insert ON public.campaign_event_mobilize_sync;
CREATE POLICY campaign_event_mobilize_sync_insert ON public.campaign_event_mobilize_sync
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_mobilize_sync_update ON public.campaign_event_mobilize_sync;
CREATE POLICY campaign_event_mobilize_sync_update ON public.campaign_event_mobilize_sync
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_mobilize_sync_delete ON public.campaign_event_mobilize_sync;
CREATE POLICY campaign_event_mobilize_sync_delete ON public.campaign_event_mobilize_sync
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_activity_log_select ON public.campaign_event_activity_log;
CREATE POLICY campaign_event_activity_log_select ON public.campaign_event_activity_log
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_activity_log_insert ON public.campaign_event_activity_log;
CREATE POLICY campaign_event_activity_log_insert ON public.campaign_event_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

COMMENT ON TABLE public.campaign_event_activity_log IS
    'Append-only audit trail; no UPDATE/DELETE policies by design.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_outcomes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_mobilize_sync TO authenticated;
GRANT SELECT, INSERT ON public.campaign_event_activity_log TO authenticated;
