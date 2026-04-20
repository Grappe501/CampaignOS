-- Power of 5 relational organizing engine (additive).
-- Trust-based growth scaffold: teams/trees, memberships (cap 5 core), relationship nodes,
-- recruitment links + invites, contact plans/attempts, progress states, impact metrics.

-- ---------------------------------------------------------------------------
-- Onboarding / attribution hooks on campaign_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS power5_recruiter_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS power5_home_team_id uuid,
    ADD COLUMN IF NOT EXISTS power5_first_five_hint jsonb;

COMMENT ON COLUMN public.campaign_profiles.power5_recruiter_profile_id IS
    'Profile that recruited this volunteer (attribution).';
COMMENT ON COLUMN public.campaign_profiles.power5_home_team_id IS
    'Primary Power of 5 home tree team.';
COMMENT ON COLUMN public.campaign_profiles.power5_first_five_hint IS
    'Onboarding scaffold: first five, relationship context (optional JSON).';

CREATE INDEX IF NOT EXISTS campaign_profiles_power5_recruiter_idx
    ON public.campaign_profiles (power5_recruiter_profile_id)
    WHERE power5_recruiter_profile_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Progress states
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_progress_states (
    key text PRIMARY KEY,
    label text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false
);

INSERT INTO public.power5_progress_states (key, label, sort_order, is_terminal)
VALUES
    ('identified', 'Identified', 10, false),
    ('planning', 'Planning contact', 20, false),
    ('contacted', 'Contacted', 30, false),
    ('follow_up', 'Follow-up', 40, false),
    ('activated', 'Activated / committed', 50, false),
    ('signed_up', 'Signed up', 60, false),
    ('matched_voter', 'Matched on roster', 70, false),
    ('stalled', 'Paused', 5, false)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teams (root: parent_team_id NULL; root_team_id = id after trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    parent_team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    root_team_id uuid,
    display_name text NOT NULL DEFAULT 'My Power of 5',
    recruiter_attribution_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    campaign_slug text NOT NULL DEFAULT 'chris-jones-for-congress',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT power5_teams_not_own_parent CHECK (parent_team_id IS DISTINCT FROM id)
);

COMMENT ON TABLE public.power5_teams IS
    'Organizing tree; root rows have parent_team_id NULL and root_team_id = id.';

CREATE INDEX IF NOT EXISTS power5_teams_owner_idx ON public.power5_teams (owner_profile_id);
CREATE INDEX IF NOT EXISTS power5_teams_root_idx ON public.power5_teams (root_team_id);

CREATE OR REPLACE FUNCTION public.power5_teams_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.parent_team_id IS NULL THEN
        NEW.root_team_id := NEW.id;
    ELSE
        SELECT t.root_team_id INTO NEW.root_team_id
        FROM public.power5_teams t
        WHERE t.id = NEW.parent_team_id;
        IF NEW.root_team_id IS NULL THEN
            RAISE EXCEPTION 'Invalid parent_team_id';
        END IF;
    END IF;
    IF NEW.recruiter_attribution_profile_id IS NULL THEN
        NEW.recruiter_attribution_profile_id := NEW.owner_profile_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_power5_teams_before_insert ON public.power5_teams;
CREATE TRIGGER tr_power5_teams_before_insert
    BEFORE INSERT ON public.power5_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.power5_teams_before_insert();

-- ---------------------------------------------------------------------------
-- Team memberships (max 5 distinct teams as owner or core_member)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_team_memberships (
    team_id uuid NOT NULL REFERENCES public.power5_teams (id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    membership_kind text NOT NULL DEFAULT 'core_member'
        CHECK (membership_kind IN ('owner', 'core_member', 'recruit')),
    is_primary boolean NOT NULL DEFAULT false,
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS power5_team_memberships_profile_idx
    ON public.power5_team_memberships (profile_id);

CREATE OR REPLACE FUNCTION public.power5_membership_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cnt integer;
BEGIN
    IF NEW.membership_kind NOT IN ('owner', 'core_member') THEN
        RETURN NEW;
    END IF;
    SELECT COUNT(DISTINCT team_id) INTO cnt
    FROM public.power5_team_memberships
    WHERE profile_id = NEW.profile_id
      AND membership_kind IN ('owner', 'core_member');
    IF TG_OP = 'INSERT' THEN
        IF cnt >= 5 THEN
            RAISE EXCEPTION 'power5: max 5 core team memberships per volunteer';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.membership_kind IN ('owner', 'core_member')
           AND NEW.membership_kind IN ('owner', 'core_member')
           AND OLD.team_id = NEW.team_id THEN
            RETURN NEW;
        END IF;
        IF OLD.membership_kind = 'recruit' AND NEW.membership_kind IN ('owner', 'core_member') THEN
            IF cnt >= 5 THEN
                RAISE EXCEPTION 'power5: max 5 core team memberships per volunteer';
            END IF;
        ELSIF cnt >= 5 THEN
            RAISE EXCEPTION 'power5: max 5 core team memberships per volunteer';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_power5_membership_limit ON public.power5_team_memberships;
CREATE TRIGGER tr_power5_membership_limit
    BEFORE INSERT OR UPDATE ON public.power5_team_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.power5_membership_limit();

-- ---------------------------------------------------------------------------
-- Relationship nodes (personal network list)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_relationship_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    display_label text NOT NULL,
    relationship_kind text NOT NULL
        CHECK (relationship_kind IN (
            'family', 'neighbor', 'coworker', 'church', 'friend', 'teammate', 'community'
        )),
    connection_strength smallint NOT NULL DEFAULT 3
        CHECK (connection_strength >= 1 AND connection_strength <= 5),
    preferred_contact text NOT NULL DEFAULT 'text'
        CHECK (preferred_contact IN (
            'face_to_face', 'phone_call', 'zoom', 'social_media', 'text'
        )),
    progress_state_key text NOT NULL DEFAULT 'identified'
        REFERENCES public.power5_progress_states (key),
    next_step text,
    linked_voter_id text,
    recruit_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_nodes_owner_idx ON public.power5_relationship_nodes (owner_profile_id);

-- ---------------------------------------------------------------------------
-- Edges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_relationship_edges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_node_id uuid NOT NULL REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    to_node_id uuid NOT NULL REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    edge_kind text NOT NULL DEFAULT 'knows'
        CHECK (edge_kind IN ('knows', 'recruited', 'referred', 'accountability')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT power5_edges_no_self CHECK (from_node_id <> to_node_id)
);

CREATE INDEX IF NOT EXISTS power5_edges_from_idx ON public.power5_relationship_edges (from_node_id);

-- ---------------------------------------------------------------------------
-- Recruitment links (shareable invite_token; qr_payload for QR generation later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_recruitment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    recruiter_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.power5_teams (id) ON DELETE CASCADE,
    qr_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    consumed_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT power5_recruit_link_consume_pair CHECK (
        (consumed_by_profile_id IS NULL AND consumed_at IS NULL)
        OR (consumed_by_profile_id IS NOT NULL AND consumed_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS power5_recruit_links_recruiter_idx
    ON public.power5_recruitment_links (recruiter_profile_id);

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recruitment_link_id uuid NOT NULL REFERENCES public.power5_recruitment_links (id) ON DELETE CASCADE,
    personalization_note text,
    target_email_hint text,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Contact plans & attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_contact_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    planned_channel text NOT NULL
        CHECK (planned_channel IN (
            'face_to_face', 'phone_call', 'zoom', 'social_media', 'text'
        )),
    planned_for date,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.power5_contact_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    channel text NOT NULL,
    outcome text NOT NULL DEFAULT 'attempted',
    note text,
    attempted_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Impact metrics (manual / batch; UI can also aggregate nodes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_impact_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    metric_key text NOT NULL,
    metric_value numeric NOT NULL DEFAULT 0,
    team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    period_start date,
    period_end date,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT power5_impact_metric_key CHECK (metric_key IN (
        'nodes_identified', 'nodes_contacted', 'nodes_activated', 'recruits_signed_up',
        'recruits_matched', 'tree_ring_1', 'tree_ring_2', 'relational_reach_index'
    ))
);

CREATE INDEX IF NOT EXISTS power5_impact_owner_idx ON public.power5_impact_metrics (owner_profile_id);

-- ---------------------------------------------------------------------------
-- FK root_team_id (after table exists)
-- ---------------------------------------------------------------------------
ALTER TABLE public.power5_teams
    DROP CONSTRAINT IF EXISTS power5_teams_root_team_id_fkey;
ALTER TABLE public.power5_teams
    ADD CONSTRAINT power5_teams_root_team_id_fkey
    FOREIGN KEY (root_team_id) REFERENCES public.power5_teams (id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- New profile → default root team + owner membership + home_team_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.power5_ensure_default_team_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tid uuid;
BEGIN
    INSERT INTO public.power5_teams (
        owner_profile_id,
        parent_team_id,
        display_name,
        recruiter_attribution_profile_id
    )
    VALUES (
        NEW.id,
        NULL,
        'My Power of 5',
        COALESCE(NEW.power5_recruiter_profile_id, NEW.id)
    )
    RETURNING id INTO tid;

    INSERT INTO public.power5_team_memberships (team_id, profile_id, membership_kind, is_primary)
    VALUES (tid, NEW.id, 'owner', true);

    UPDATE public.campaign_profiles
    SET power5_home_team_id = tid
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_campaign_profile_power5_seed ON public.campaign_profiles;
CREATE TRIGGER tr_campaign_profile_power5_seed
    AFTER INSERT ON public.campaign_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.power5_ensure_default_team_for_profile();

-- ---------------------------------------------------------------------------
-- Backfill existing profiles (no INSERT trigger retroactive)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r record;
    tid uuid;
BEGIN
    FOR r IN
        SELECT cp.id AS pid
        FROM public.campaign_profiles cp
        WHERE NOT EXISTS (
            SELECT 1 FROM public.power5_teams t
            WHERE t.owner_profile_id = cp.id AND t.parent_team_id IS NULL
        )
    LOOP
        INSERT INTO public.power5_teams (
            owner_profile_id,
            parent_team_id,
            display_name,
            recruiter_attribution_profile_id
        )
        VALUES (r.pid, NULL, 'My Power of 5', r.pid)
        RETURNING id INTO tid;

        INSERT INTO public.power5_team_memberships (team_id, profile_id, membership_kind, is_primary)
        VALUES (tid, r.pid, 'owner', true)
        ON CONFLICT DO NOTHING;

        UPDATE public.campaign_profiles
        SET power5_home_team_id = tid
        WHERE id = r.pid AND power5_home_team_id IS NULL;
    END LOOP;
END;
$$;

UPDATE public.campaign_profiles cp
SET power5_home_team_id = t.id
FROM public.power5_teams t
WHERE t.owner_profile_id = cp.id
  AND t.parent_team_id IS NULL
  AND cp.power5_home_team_id IS NULL;

-- ---------------------------------------------------------------------------
-- home_team FK on campaign_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_profiles
    DROP CONSTRAINT IF EXISTS campaign_profiles_power5_home_team_id_fkey;
ALTER TABLE public.campaign_profiles
    ADD CONSTRAINT campaign_profiles_power5_home_team_id_fkey
    FOREIGN KEY (power5_home_team_id) REFERENCES public.power5_teams (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RPC: attach recruit to recruiter root team (call after match / signup)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.power5_attach_recruit_membership(
    p_recruit_profile_id uuid,
    p_recruiter_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    home_team uuid;
BEGIN
    SELECT t.id INTO home_team
    FROM public.power5_teams t
    WHERE t.owner_profile_id = p_recruiter_profile_id
      AND t.parent_team_id IS NULL
    ORDER BY t.created_at
    LIMIT 1;
    IF home_team IS NULL THEN
        RETURN;
    END IF;
    INSERT INTO public.power5_team_memberships (team_id, profile_id, membership_kind, is_primary)
    VALUES (home_team, p_recruit_profile_id, 'recruit', false)
    ON CONFLICT (team_id, profile_id) DO NOTHING;

    UPDATE public.campaign_profiles
    SET power5_home_team_id = COALESCE(power5_home_team_id, home_team)
    WHERE id = p_recruit_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.power5_attach_recruit_membership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.power5_attach_recruit_membership(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.power5_progress_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_progress_states_read ON public.power5_progress_states;
CREATE POLICY power5_progress_states_read ON public.power5_progress_states
    FOR SELECT TO authenticated USING (true);

ALTER TABLE public.power5_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_teams_select ON public.power5_teams;
CREATE POLICY power5_teams_select ON public.power5_teams
    FOR SELECT TO authenticated
    USING (
        owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        OR id IN (
            SELECT m.team_id FROM public.power5_team_memberships m
            JOIN public.campaign_profiles cp ON cp.id = m.profile_id
            WHERE cp.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS power5_teams_mutate ON public.power5_teams;
CREATE POLICY power5_teams_mutate ON public.power5_teams
    FOR INSERT TO authenticated
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));
CREATE POLICY power5_teams_update ON public.power5_teams
    FOR UPDATE TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));
CREATE POLICY power5_teams_delete ON public.power5_teams
    FOR DELETE TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.power5_team_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_memberships_select ON public.power5_team_memberships;
CREATE POLICY power5_memberships_select ON public.power5_team_memberships
    FOR SELECT TO authenticated
    USING (
        profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        OR team_id IN (
            SELECT id FROM public.power5_teams
            WHERE owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );
DROP POLICY IF EXISTS power5_memberships_write ON public.power5_team_memberships;
CREATE POLICY power5_memberships_write ON public.power5_team_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        team_id IN (
            SELECT id FROM public.power5_teams
            WHERE owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );
CREATE POLICY power5_memberships_update ON public.power5_team_memberships
    FOR UPDATE TO authenticated
    USING (
        team_id IN (
            SELECT id FROM public.power5_teams
            WHERE owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        team_id IN (
            SELECT id FROM public.power5_teams
            WHERE owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );
CREATE POLICY power5_memberships_delete ON public.power5_team_memberships
    FOR DELETE TO authenticated
    USING (
        team_id IN (
            SELECT id FROM public.power5_teams
            WHERE owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );

ALTER TABLE public.power5_relationship_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_nodes_own ON public.power5_relationship_nodes;
CREATE POLICY power5_nodes_own ON public.power5_relationship_nodes
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.power5_relationship_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_edges_own ON public.power5_relationship_edges;
CREATE POLICY power5_edges_own ON public.power5_relationship_edges
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_relationship_edges.from_node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_relationship_edges.from_node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );

ALTER TABLE public.power5_recruitment_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_links_recruiter ON public.power5_recruitment_links;
CREATE POLICY power5_links_recruiter ON public.power5_recruitment_links
    FOR ALL TO authenticated
    USING (recruiter_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (recruiter_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

ALTER TABLE public.power5_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_invites_recruiter ON public.power5_invites;
CREATE POLICY power5_invites_recruiter ON public.power5_invites
    FOR ALL TO authenticated
    USING (
        recruitment_link_id IN (
            SELECT id FROM public.power5_recruitment_links
            WHERE recruiter_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        recruitment_link_id IN (
            SELECT id FROM public.power5_recruitment_links
            WHERE recruiter_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );

ALTER TABLE public.power5_contact_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_plans_own ON public.power5_contact_plans;
CREATE POLICY power5_plans_own ON public.power5_contact_plans
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_plans.node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_plans.node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );

ALTER TABLE public.power5_contact_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_attempts_own ON public.power5_contact_attempts;
CREATE POLICY power5_attempts_own ON public.power5_contact_attempts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_attempts.node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_attempts.node_id
              AND n.owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid())
        )
    );

ALTER TABLE public.power5_impact_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_metrics_own ON public.power5_impact_metrics;
CREATE POLICY power5_metrics_own ON public.power5_impact_metrics
    FOR ALL TO authenticated
    USING (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()))
    WITH CHECK (owner_profile_id IN (SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()));

GRANT SELECT ON public.power5_progress_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_team_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_relationship_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_relationship_edges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_recruitment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_contact_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_contact_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_impact_metrics TO authenticated;
