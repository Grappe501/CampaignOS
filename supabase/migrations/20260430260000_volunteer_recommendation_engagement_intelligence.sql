-- Step 2.6: Volunteer recommendation + engagement intelligence (preferences, embeddings, snapshots, events).

-- ---------------------------------------------------------------------------
-- volunteers: recommendation preference profile (JSON; app validates shape in TS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteers
    ADD COLUMN IF NOT EXISTS recommendation_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volunteers.recommendation_preferences IS
    'Opt-in and taste signals for marketplace/recommendations (task_management_opt_in, preferred_roles_json, etc.).';

-- ---------------------------------------------------------------------------
-- volunteer_profile_embeddings / volunteer_opportunity_embeddings (vectors as jsonb arrays)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_profile_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
    text_hash text NOT NULL,
    embedded_text text NOT NULL,
    embedding_vector jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_profile_embeddings_volunteer_unique UNIQUE (volunteer_id)
);

CREATE INDEX IF NOT EXISTS volunteer_profile_embeddings_volunteer_idx
    ON public.volunteer_profile_embeddings (volunteer_id);

CREATE TABLE IF NOT EXISTS public.volunteer_opportunity_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL,
    source_id text NOT NULL,
    campaign_id text NOT NULL DEFAULT 'default',
    embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
    text_hash text NOT NULL,
    embedded_text text NOT NULL,
    embedding_vector jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_opportunity_embeddings_source_unique UNIQUE (campaign_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS volunteer_opportunity_embeddings_campaign_idx
    ON public.volunteer_opportunity_embeddings (campaign_id, source_type);

-- ---------------------------------------------------------------------------
-- volunteer_recommendation_batches + volunteer_recommendation_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_recommendation_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    campaign_id text NOT NULL DEFAULT 'default',
    model_name text,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_recommendation_batches_volunteer_idx
    ON public.volunteer_recommendation_batches (volunteer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.volunteer_recommendation_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_batch_id uuid NOT NULL REFERENCES public.volunteer_recommendation_batches (id) ON DELETE CASCADE,
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    opportunity_id text NOT NULL,
    eligibility_state text NOT NULL DEFAULT 'unknown',
    deterministic_fit_score numeric(8, 6),
    semantic_similarity_score numeric(8, 6),
    ai_fit_score numeric(8, 6),
    final_rank_score numeric(8, 6),
    recommendation_strength text,
    reasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    blockers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    suggested_next_step text,
    model_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_recommendation_snapshots_volunteer_idx
    ON public.volunteer_recommendation_snapshots (volunteer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS volunteer_recommendation_snapshots_batch_idx
    ON public.volunteer_recommendation_snapshots (recommendation_batch_id);

-- ---------------------------------------------------------------------------
-- volunteer_engagement_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_engagement_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    opportunity_id text,
    event_type text NOT NULL,
    event_value numeric,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_engagement_events_volunteer_idx
    ON public.volunteer_engagement_events (volunteer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS volunteer_engagement_events_type_idx
    ON public.volunteer_engagement_events (event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_opportunity_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_recommendation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_recommendation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_engagement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_profile_embeddings_scope ON public.volunteer_profile_embeddings;
CREATE POLICY volunteer_profile_embeddings_scope ON public.volunteer_profile_embeddings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_profile_embeddings.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_profile_embeddings.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_opportunity_embeddings_read ON public.volunteer_opportunity_embeddings;
CREATE POLICY volunteer_opportunity_embeddings_read ON public.volunteer_opportunity_embeddings
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS volunteer_opportunity_embeddings_write_coord ON public.volunteer_opportunity_embeddings;
CREATE POLICY volunteer_opportunity_embeddings_write_coord ON public.volunteer_opportunity_embeddings
    FOR ALL TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_recommendation_batches_scope ON public.volunteer_recommendation_batches;
CREATE POLICY volunteer_recommendation_batches_scope ON public.volunteer_recommendation_batches
    FOR ALL TO authenticated
    USING (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS volunteer_recommendation_batches_team_supervisor_read ON public.volunteer_recommendation_batches;
CREATE POLICY volunteer_recommendation_batches_team_supervisor_read ON public.volunteer_recommendation_batches
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_recommendation_batches.volunteer_id
              AND public.volunteer_supervisor_covers_assignee(
                  public.campaign_profile_id_for_auth(),
                  v.profile_id
              )
        )
    );

DROP POLICY IF EXISTS volunteer_recommendation_snapshots_scope ON public.volunteer_recommendation_snapshots;
CREATE POLICY volunteer_recommendation_snapshots_scope ON public.volunteer_recommendation_snapshots
    FOR ALL TO authenticated
    USING (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS volunteer_recommendation_snapshots_team_supervisor_read ON public.volunteer_recommendation_snapshots;
CREATE POLICY volunteer_recommendation_snapshots_team_supervisor_read ON public.volunteer_recommendation_snapshots
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_recommendation_snapshots.volunteer_id
              AND public.volunteer_supervisor_covers_assignee(
                  public.campaign_profile_id_for_auth(),
                  v.profile_id
              )
        )
    );

DROP POLICY IF EXISTS volunteer_engagement_events_scope ON public.volunteer_engagement_events;
CREATE POLICY volunteer_engagement_events_scope ON public.volunteer_engagement_events
    FOR ALL TO authenticated
    USING (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS volunteer_engagement_events_team_supervisor_read ON public.volunteer_engagement_events;
CREATE POLICY volunteer_engagement_events_team_supervisor_read ON public.volunteer_engagement_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_engagement_events.volunteer_id
              AND public.volunteer_supervisor_covers_assignee(
                  public.campaign_profile_id_for_auth(),
                  v.profile_id
              )
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_profile_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_opportunity_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_recommendation_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_recommendation_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_engagement_events TO authenticated;
