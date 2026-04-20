-- Volunteer Opportunity Marketplace (Step 2.5): unified discoverable work.
-- Synced rows mirror assignments/shifts/staffing; custom rows are coordinator-authored.

-- ---------------------------------------------------------------------------
-- volunteer_opportunities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    source_type text NOT NULL
        CHECK (
            source_type IN (
                'assignment',
                'shift_slot',
                'staffing_requirement',
                'onboarding_step',
                'training_support',
                'custom_opportunity'
            )
        ),
    source_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    role_slug text REFERENCES public.volunteer_roles (role_slug) ON DELETE SET NULL,
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    shift_id uuid REFERENCES public.volunteer_shifts (id) ON DELETE SET NULL,
    shift_slot_id uuid REFERENCES public.volunteer_shift_slots (id) ON DELETE SET NULL,
    staffing_requirement_id uuid REFERENCES public.campaign_event_staffing_assignments (id) ON DELETE CASCADE,
    opportunity_type text NOT NULL DEFAULT 'general',
    category text NOT NULL DEFAULT 'general',
    starts_at timestamptz,
    ends_at timestamptz,
    due_at timestamptz,
    location_label text,
    region_label text,
    commitment_type text NOT NULL DEFAULT 'task'
        CHECK (commitment_type IN ('task', 'shift', 'hybrid')),
    quantity_open integer NOT NULL DEFAULT 1
        CHECK (quantity_open >= 0 AND quantity_open <= 9999),
    quantity_filled integer NOT NULL DEFAULT 0
        CHECK (quantity_filled >= 0 AND quantity_filled <= 9999),
    self_claim_allowed boolean NOT NULL DEFAULT true,
    coordinator_assignment_allowed boolean NOT NULL DEFAULT true,
    required_skills_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    preferred_skills_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    required_training_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    onboarding_required boolean NOT NULL DEFAULT false,
    reliability_preference text,
    priority text NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'paused', 'filled', 'archived', 'cancelled')),
    visibility_scope text NOT NULL DEFAULT 'campaign'
        CHECK (visibility_scope IN ('public', 'campaign', 'team_coordinator_only')),
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS volunteer_opportunities_source_unique
    ON public.volunteer_opportunities (campaign_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS volunteer_opportunities_campaign_status_idx
    ON public.volunteer_opportunities (campaign_id, status);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_due_idx
    ON public.volunteer_opportunities (due_at);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_starts_idx
    ON public.volunteer_opportunities (starts_at);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_event_idx
    ON public.volunteer_opportunities (event_id);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_shift_idx
    ON public.volunteer_opportunities (shift_id);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_role_idx
    ON public.volunteer_opportunities (role_slug);
CREATE INDEX IF NOT EXISTS volunteer_opportunities_region_idx
    ON public.volunteer_opportunities (region_label);

-- ---------------------------------------------------------------------------
-- volunteer_opportunity_invites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_opportunity_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid NOT NULL REFERENCES public.volunteer_opportunities (id) ON DELETE CASCADE,
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    invite_type text NOT NULL DEFAULT 'coordinator_nudge',
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    CONSTRAINT volunteer_opportunity_invites_unique UNIQUE (opportunity_id, volunteer_id, invite_type)
);

CREATE INDEX IF NOT EXISTS volunteer_opportunity_invites_volunteer_idx
    ON public.volunteer_opportunity_invites (volunteer_id, status);

-- ---------------------------------------------------------------------------
-- volunteer_opportunity_bookmarks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_opportunity_bookmarks (
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    opportunity_id uuid NOT NULL REFERENCES public.volunteer_opportunities (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (volunteer_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_opportunity_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_opportunity_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_opportunities_select ON public.volunteer_opportunities;
CREATE POLICY volunteer_opportunities_select ON public.volunteer_opportunities
    FOR SELECT TO authenticated
    USING (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            status IN ('open', 'paused')
            AND visibility_scope IN ('public', 'campaign')
            AND public.campaign_profile_id_for_auth() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS volunteer_opportunities_write_coordinator ON public.volunteer_opportunities;
CREATE POLICY volunteer_opportunities_write_coordinator ON public.volunteer_opportunities
    FOR ALL TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_opportunity_invites_scope ON public.volunteer_opportunity_invites;
CREATE POLICY volunteer_opportunity_invites_scope ON public.volunteer_opportunity_invites
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_opportunity_invites.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_opportunity_invites.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_opportunity_bookmarks_scope ON public.volunteer_opportunity_bookmarks;
CREATE POLICY volunteer_opportunity_bookmarks_scope ON public.volunteer_opportunity_bookmarks
    FOR ALL TO authenticated
    USING (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_opportunity_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_opportunity_bookmarks TO authenticated;
