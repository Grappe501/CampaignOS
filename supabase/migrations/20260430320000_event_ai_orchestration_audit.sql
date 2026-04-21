-- Event AI orchestration audit — recommendation disposition + session snapshots (advisory; app is source of truth).

CREATE TABLE IF NOT EXISTS public.event_ai_recommendation_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    disposition text NOT NULL DEFAULT 'proposed'
        CHECK (disposition IN ('proposed', 'accepted', 'ignored', 'deferred')),
    related_event_id uuid NULL,
    source_mode text NOT NULL DEFAULT 'event_mission_brief',
    schema_version int NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS event_ai_recommendation_audit_owner_idx
    ON public.event_ai_recommendation_audit (owner_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_ai_recommendation_audit_campaign_idx
    ON public.event_ai_recommendation_audit (campaign_id);

COMMENT ON TABLE public.event_ai_recommendation_audit IS
    'Event AI typed recommendations — bounded JSON payload from client; no autonomous execution.';

CREATE TABLE IF NOT EXISTS public.event_ai_session_snapshot (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    context_hash text NOT NULL,
    orchestration_scope text NOT NULL
        CHECK (orchestration_scope IN ('cockpit_campaign', 'event_desk', 'leadership_wide')),
    packet_version int NOT NULL DEFAULT 3,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_ai_session_snapshot_owner_idx
    ON public.event_ai_session_snapshot (owner_profile_id, created_at DESC);

COMMENT ON TABLE public.event_ai_session_snapshot IS
    'Optional persisted Agent Jones event_ai_orchestration envelope for audit and upgrades.';

ALTER TABLE public.event_ai_recommendation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ai_session_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_ai_recommendation_audit_own ON public.event_ai_recommendation_audit
    FOR ALL
    USING (owner_profile_id = (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id = (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

CREATE POLICY event_ai_session_snapshot_own ON public.event_ai_session_snapshot
    FOR ALL
    USING (owner_profile_id = (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id = (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));
