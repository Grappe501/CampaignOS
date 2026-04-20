-- Blueprint 15 — Migration 1: primary campaign event row (durable anchor for coordinator desk, calendar, Mobilize).
-- App-level enums as CHECK constraints; single-campaign default via campaign_id text until a campaigns table exists.

-- ---------------------------------------------------------------------------
-- updated_at touch (local to event tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_campaign_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- campaign_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    title text NOT NULL,
    event_type text NOT NULL,
    event_subtype text,
    description text,
    public_title text,
    public_description text,
    public_instructions text,
    public_location_notes text,
    public_contact_name text,
    public_contact_email text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'submitted',
            'approved',
            'scheduled',
            'published_internal',
            'published_public',
            'completed',
            'canceled',
            'archived'
        )),
    staffing_state text NOT NULL DEFAULT 'unstaffed'
        CHECK (staffing_state IN (
            'unstaffed',
            'partially_staffed',
            'staffed',
            'at_risk'
        )),
    visibility_scope text NOT NULL DEFAULT 'internal_staff',
    public_publish_state text,
    mobilize_publish_state text NOT NULL DEFAULT 'not_applicable'
        CHECK (mobilize_publish_state IN (
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
    candidate_involved boolean NOT NULL DEFAULT false,
    finance_related boolean NOT NULL DEFAULT false,
    county_party_flag boolean NOT NULL DEFAULT false,
    county_id text,
    precinct_id text,
    district_id text,
    venue_name text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    location_notes text,
    virtual_url text,
    timezone text,
    start_at timestamptz NOT NULL,
    end_at timestamptz,
    owner_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    requester_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    host_display_name text,
    notes_internal text,
    goals_summary text,
    followup_state text
        CHECK (
            followup_state IS NULL
            OR followup_state IN ('none', 'pending', 'in_progress', 'complete', 'overdue')
        ),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_events_end_after_start CHECK (
        end_at IS NULL OR end_at >= start_at
    )
);

COMMENT ON TABLE public.campaign_events IS
    'Primary event record: calendar, workflow summary, visibility, Mobilize denormalized state.';

CREATE INDEX IF NOT EXISTS campaign_events_campaign_start_idx
    ON public.campaign_events (campaign_id, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_status_start_idx
    ON public.campaign_events (status, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_visibility_start_idx
    ON public.campaign_events (visibility_scope, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_type_start_idx
    ON public.campaign_events (event_type, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_county_start_idx
    ON public.campaign_events (county_id, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_candidate_start_idx
    ON public.campaign_events (candidate_involved, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_finance_start_idx
    ON public.campaign_events (finance_related, start_at);

DROP TRIGGER IF EXISTS trg_campaign_events_updated_at ON public.campaign_events;
CREATE TRIGGER trg_campaign_events_updated_at
    BEFORE UPDATE ON public.campaign_events
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: Phase 1 — authenticated read; writes restricted to event editor roles
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.campaign_profile_id_for_auth()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id
    FROM public.campaign_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_event_editor(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_profile_id IS NOT NULL
        AND (
            EXISTS (
                SELECT 1
                FROM public.campaign_profiles cp
                WHERE cp.id = p_profile_id
                  AND lower(trim(coalesce(cp.primary_role, ''))) IN (
                      'admin',
                      'staff',
                      'coordinator',
                      'volunteer_coordinator',
                      'event_coordinator',
                      'campaign_manager',
                      'candidate'
                  )
            )
            OR EXISTS (
                SELECT 1
                FROM public.campaign_profiles cp
                WHERE cp.id = p_profile_id
                  AND (
                      (cp.primary_role ILIKE '%assistant%' AND cp.primary_role ILIKE '%manager%')
                      OR cp.primary_role ILIKE '%deputy%campaign%'
                  )
            )
            OR EXISTS (
                SELECT 1
                FROM public.volunteer_supervisor_teams st
                WHERE st.supervisor_profile_id = p_profile_id
            )
        );
$$;

DROP POLICY IF EXISTS campaign_events_select_authenticated ON public.campaign_events;
CREATE POLICY campaign_events_select_authenticated ON public.campaign_events
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_events_insert_editors ON public.campaign_events;
CREATE POLICY campaign_events_insert_editors ON public.campaign_events
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_events_update_editors ON public.campaign_events;
CREATE POLICY campaign_events_update_editors ON public.campaign_events
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_events_delete_editors ON public.campaign_events;
CREATE POLICY campaign_events_delete_editors ON public.campaign_events
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_events TO authenticated;
