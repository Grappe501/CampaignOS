-- Phase 1: Relational Communications Workspace (Power of 5 aligned).
-- User-triggered only; no bulk send; scaffolded channel connections; outreach tracking.

-- ---------------------------------------------------------------------------
-- Connected accounts (opt-in scaffold — no OAuth tokens stored yet)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_connected_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    platform text NOT NULL
        CHECK (platform IN (
            'gmail', 'facebook', 'instagram', 'sms', 'other'
        )),
    handle text,
    connection_status text NOT NULL DEFAULT 'not_connected'
        CHECK (connection_status IN (
            'not_connected', 'pending', 'connected', 'revoked'
        )),
    permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_synced_at timestamptz,
    CONSTRAINT user_connected_accounts_one_per_platform
        UNIQUE (owner_profile_id, platform)
);

CREATE INDEX IF NOT EXISTS user_connected_accounts_owner_idx
    ON public.user_connected_accounts (owner_profile_id);

COMMENT ON TABLE public.user_connected_accounts IS
    'Volunteer opt-in channel connections (Phase 1 scaffold; no API secrets).';

-- ---------------------------------------------------------------------------
-- Outreach contact extension (1:1 with Power of 5 node)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outreach_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    last_contacted_at timestamptz,
    preferred_channel text
        CHECK (preferred_channel IS NULL OR preferred_channel IN (
            'face_to_face', 'phone_call', 'zoom', 'social_media', 'text', 'email', 'other'
        )),
    next_action text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT outreach_contacts_one_per_node UNIQUE (node_id)
);

CREATE INDEX IF NOT EXISTS outreach_contacts_owner_idx
    ON public.outreach_contacts (owner_profile_id);

CREATE INDEX IF NOT EXISTS outreach_contacts_node_idx
    ON public.outreach_contacts (node_id);

-- ---------------------------------------------------------------------------
-- User-initiated action records (draft / opened / completed — never auto-send)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outreach_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    action_kind text NOT NULL
        CHECK (action_kind IN ('talk_in_person', 'call', 'message', 'invite')),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'opened', 'completed', 'dismissed')),
    suggested_copy text,
    opened_platform text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_actions_owner_idx
    ON public.outreach_actions (owner_profile_id);
CREATE INDEX IF NOT EXISTS outreach_actions_node_idx
    ON public.outreach_actions (node_id);

-- ---------------------------------------------------------------------------
-- Activity log (manual + user-triggered events)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outreach_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    event_type text NOT NULL
        CHECK (event_type IN (
            'invitation_sent',
            'message_sent',
            'response_logged',
            'in_person',
            'call_made',
            'channel_opened',
            'note_added'
        )),
    channel text,
    note text,
    outreach_action_id uuid REFERENCES public.outreach_actions (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_activity_owner_idx
    ON public.outreach_activity_log (owner_profile_id);
CREATE INDEX IF NOT EXISTS outreach_activity_node_idx
    ON public.outreach_activity_log (node_id);
CREATE INDEX IF NOT EXISTS outreach_activity_created_idx
    ON public.outreach_activity_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_connected_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_connected_accounts_own ON public.user_connected_accounts;
CREATE POLICY user_connected_accounts_own ON public.user_connected_accounts
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_contacts_own ON public.outreach_contacts;
CREATE POLICY outreach_contacts_own ON public.outreach_contacts
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.outreach_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_actions_own ON public.outreach_actions;
CREATE POLICY outreach_actions_own ON public.outreach_actions
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.outreach_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_activity_own ON public.outreach_activity_log;
CREATE POLICY outreach_activity_own ON public.outreach_activity_log
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connected_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_activity_log TO authenticated;
