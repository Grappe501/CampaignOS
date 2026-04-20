-- Power of 5 propagation engine (additive): stages, templates, manual relay campaigns,
-- conversions, stage history, contact plan extensions. No bulk-send automation.

-- ---------------------------------------------------------------------------
-- Progress states (deterministic stage model extensions)
-- ---------------------------------------------------------------------------
INSERT INTO public.power5_progress_states (key, label, sort_order, is_terminal)
VALUES
    ('first_contact', 'First contact', 22, false),
    ('invited', 'Invited', 34, false),
    ('interested', 'Interested', 36, false),
    ('committed', 'Committed', 38, false),
    ('active', 'Active', 52, false),
    ('dormant', 'Dormant', 3, true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Relationship nodes: proximity + target role (relational-first organizing)
-- ---------------------------------------------------------------------------
ALTER TABLE public.power5_relationship_nodes
    ADD COLUMN IF NOT EXISTS proximity_type text
        CHECK (
            proximity_type IS NULL
            OR proximity_type IN (
                'co_resident',
                'same_block',
                'same_org',
                'same_community',
                'digital_only',
                'other'
            )
        ),
    ADD COLUMN IF NOT EXISTS target_role text;

COMMENT ON COLUMN public.power5_relationship_nodes.proximity_type IS
    'How close this person is geographically / socially (guides contact order).';
COMMENT ON COLUMN public.power5_relationship_nodes.target_role IS
    'Optional organizing goal: volunteer, host, donor, etc.';

-- ---------------------------------------------------------------------------
-- Contact plans: fallback channel order + goal
-- ---------------------------------------------------------------------------
ALTER TABLE public.power5_contact_plans
    ADD COLUMN IF NOT EXISTS fallback_channel_order jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS goal text;

-- ---------------------------------------------------------------------------
-- Stage history (audit trail; RLS via owning node)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_stage_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    prior_stage text,
    new_stage text NOT NULL,
    changed_by_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_stage_history_node_idx
    ON public.power5_stage_history (node_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.power5_log_node_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid;
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.progress_state_key IS DISTINCT FROM NEW.progress_state_key THEN
        SELECT id INTO actor
        FROM public.campaign_profiles
        WHERE user_id = auth.uid()
        LIMIT 1;
        INSERT INTO public.power5_stage_history (
            node_id,
            prior_stage,
            new_stage,
            changed_by_profile_id,
            reason
        )
        VALUES (
            NEW.id,
            OLD.progress_state_key,
            NEW.progress_state_key,
            actor,
            'progress_update'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_power5_node_stage_history ON public.power5_relationship_nodes;
CREATE TRIGGER tr_power5_node_stage_history
    AFTER UPDATE ON public.power5_relationship_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.power5_log_node_stage_change();

-- ---------------------------------------------------------------------------
-- Message templates (assistive; not autonomous sends)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    slug text NOT NULL,
    template_type text NOT NULL
        CHECK (template_type IN (
            'invitation',
            'follow_up',
            'event_invite',
            'turnout_reminder',
            'volunteer_activation',
            'registration_nudge',
            'appreciation',
            'host_gathering_invite'
        )),
    title text NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT message_templates_slug_owner_unique
        UNIQUE (owner_profile_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS message_templates_global_slug_idx
    ON public.message_templates (slug)
    WHERE owner_profile_id IS NULL;

CREATE TABLE IF NOT EXISTS public.message_template_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL
        REFERENCES public.message_templates (id) ON DELETE CASCADE,
    variant_kind text NOT NULL
        CHECK (variant_kind IN (
            'sms',
            'conversation_starter',
            'face_to_face_prompt',
            'call_script',
            'social_share',
            'email'
        )),
    body text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_template_variants_template_idx
    ON public.message_template_variants (template_id, sort_order);

-- ---------------------------------------------------------------------------
-- Manual propagation / relay (no auto-send; assignments are user-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_message_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    title text NOT NULL,
    body_summary text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'closed')),
    relay_guardrails jsonb NOT NULL DEFAULT jsonb_build_object(
        'no_automated_send', true,
        'max_new_assignments_per_day', 25,
        'require_manual_delivery', true
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_msg_campaigns_owner_idx
    ON public.power5_message_campaigns (owner_profile_id);

CREATE TABLE IF NOT EXISTS public.power5_message_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL
        REFERENCES public.power5_message_campaigns (id) ON DELETE CASCADE,
    assignee_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    node_id uuid REFERENCES public.power5_relationship_nodes (id) ON DELETE SET NULL,
    message_template_id uuid REFERENCES public.message_templates (id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'queued'
        CHECK (status IN (
            'queued',
            'prepared',
            'delivered_manually',
            'acknowledged',
            'acted_on',
            'dismissed'
        )),
    personalization_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_msg_assign_assignee_idx
    ON public.power5_message_assignments (assignee_profile_id, status);
CREATE INDEX IF NOT EXISTS power5_msg_assign_campaign_idx
    ON public.power5_message_assignments (campaign_id);

CREATE TABLE IF NOT EXISTS public.power5_message_delivery_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL
        REFERENCES public.power5_message_assignments (id) ON DELETE CASCADE,
    event_type text NOT NULL
        CHECK (event_type IN (
            'prepared',
            'opened_channel',
            'logged_touch',
            'template_edited',
            'cancelled'
        )),
    performed_by_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.power5_message_outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL
        REFERENCES public.power5_message_assignments (id) ON DELETE CASCADE,
    outcome text NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Conversions (signup / voter bind back to tree + invite)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    user_profile_id uuid NOT NULL
        REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    voter_id text,
    conversion_type text NOT NULL
        CHECK (conversion_type IN (
            'signed_up',
            'voter_matched',
            'volunteer_activated',
            'host_committed'
        )),
    source_recruitment_link_id uuid
        REFERENCES public.power5_recruitment_links (id) ON DELETE SET NULL,
    converted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_conversions_node_idx ON public.power5_conversions (node_id);
CREATE INDEX IF NOT EXISTS power5_conversions_user_idx ON public.power5_conversions (user_profile_id);

-- ---------------------------------------------------------------------------
-- Structured contact events (manual / logged outreach beyond attempts table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power5_contact_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL
        REFERENCES public.power5_relationship_nodes (id) ON DELETE CASCADE,
    event_type text NOT NULL
        CHECK (event_type IN (
            'identified',
            'planned',
            'touch',
            'invite',
            'response',
            'stage_change',
            'other'
        )),
    channel text,
    direction text NOT NULL DEFAULT 'outbound'
        CHECK (direction IN ('outbound', 'inbound', 'system')),
    performed_by_profile_id uuid
        REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    message_template_id uuid REFERENCES public.message_templates (id) ON DELETE SET NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    outcome text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS power5_contact_events_node_idx
    ON public.power5_contact_events (node_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.power5_stage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_stage_history_own ON public.power5_stage_history;
CREATE POLICY power5_stage_history_own ON public.power5_stage_history
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_stage_history.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_stage_history.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    );

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_templates_read ON public.message_templates;
CREATE POLICY message_templates_read ON public.message_templates
    FOR SELECT TO authenticated
    USING (
        owner_profile_id IS NULL
        OR owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS message_templates_write ON public.message_templates;
CREATE POLICY message_templates_write ON public.message_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS message_templates_update ON public.message_templates;
CREATE POLICY message_templates_update ON public.message_templates
    FOR UPDATE TO authenticated
    USING (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS message_templates_delete ON public.message_templates;
CREATE POLICY message_templates_delete ON public.message_templates
    FOR DELETE TO authenticated
    USING (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );

ALTER TABLE public.message_template_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_template_variants_select ON public.message_template_variants;
CREATE POLICY message_template_variants_select ON public.message_template_variants
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.message_templates t
            WHERE t.id = message_template_variants.template_id
              AND (
                  t.owner_profile_id IS NULL
                  OR t.owner_profile_id IN (
                      SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
                  )
              )
        )
    );
DROP POLICY IF EXISTS message_template_variants_mutate ON public.message_template_variants;
CREATE POLICY message_template_variants_mutate ON public.message_template_variants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.message_templates t
            WHERE t.id = message_template_variants.template_id
              AND t.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.message_templates t
            WHERE t.id = message_template_variants.template_id
              AND t.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    );

ALTER TABLE public.power5_message_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_msg_campaigns_own ON public.power5_message_campaigns;
CREATE POLICY power5_msg_campaigns_own ON public.power5_message_campaigns
    FOR ALL TO authenticated
    USING (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        owner_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );

ALTER TABLE public.power5_message_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_msg_assign_select ON public.power5_message_assignments;
CREATE POLICY power5_msg_assign_select ON public.power5_message_assignments
    FOR SELECT TO authenticated
    USING (
        assignee_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
        OR campaign_id IN (
            SELECT id FROM public.power5_message_campaigns
            WHERE owner_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
        )
    );
DROP POLICY IF EXISTS power5_msg_assign_insert ON public.power5_message_assignments;
CREATE POLICY power5_msg_assign_insert ON public.power5_message_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        campaign_id IN (
            SELECT id FROM public.power5_message_campaigns
            WHERE owner_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
        )
        AND assignee_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS power5_msg_assign_update ON public.power5_message_assignments;
CREATE POLICY power5_msg_assign_update ON public.power5_message_assignments
    FOR UPDATE TO authenticated
    USING (
        assignee_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
        OR campaign_id IN (
            SELECT id FROM public.power5_message_campaigns
            WHERE owner_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        assignee_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
        OR campaign_id IN (
            SELECT id FROM public.power5_message_campaigns
            WHERE owner_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
        )
    );

ALTER TABLE public.power5_message_delivery_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_msg_delivery_rw ON public.power5_message_delivery_events;
CREATE POLICY power5_msg_delivery_rw ON public.power5_message_delivery_events
    FOR ALL TO authenticated
    USING (
        assignment_id IN (
            SELECT a.id
            FROM public.power5_message_assignments a
            WHERE a.assignee_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
            OR a.campaign_id IN (
                SELECT c.id FROM public.power5_message_campaigns c
                WHERE c.owner_profile_id IN (
                    SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT a.id
            FROM public.power5_message_assignments a
            WHERE a.assignee_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
            OR a.campaign_id IN (
                SELECT c.id FROM public.power5_message_campaigns c
                WHERE c.owner_profile_id IN (
                    SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
                )
            )
        )
    );

ALTER TABLE public.power5_message_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_msg_outcomes_rw ON public.power5_message_outcomes;
CREATE POLICY power5_msg_outcomes_rw ON public.power5_message_outcomes
    FOR ALL TO authenticated
    USING (
        assignment_id IN (
            SELECT a.id
            FROM public.power5_message_assignments a
            WHERE a.assignee_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
            OR a.campaign_id IN (
                SELECT c.id FROM public.power5_message_campaigns c
                WHERE c.owner_profile_id IN (
                    SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT a.id
            FROM public.power5_message_assignments a
            WHERE a.assignee_profile_id IN (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
            )
            OR a.campaign_id IN (
                SELECT c.id FROM public.power5_message_campaigns c
                WHERE c.owner_profile_id IN (
                    SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
                )
            )
        )
    );

ALTER TABLE public.power5_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_conversions_own ON public.power5_conversions;
CREATE POLICY power5_conversions_own ON public.power5_conversions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_conversions.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
        OR user_profile_id IN (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_conversions.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    );

ALTER TABLE public.power5_contact_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power5_contact_events_own ON public.power5_contact_events;
CREATE POLICY power5_contact_events_own ON public.power5_contact_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_events.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.id = power5_contact_events.node_id
              AND n.owner_profile_id IN (
                  SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid()
              )
        )
    );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_stage_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_template_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_message_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_message_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_message_delivery_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_message_outcomes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power5_contact_events TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed: global assistive templates (read-only for volunteers via RLS)
-- ---------------------------------------------------------------------------
INSERT INTO public.message_templates (owner_profile_id, slug, template_type, title, tags)
SELECT NULL, v.slug, v.template_type, v.title, v.tags
FROM (VALUES
    ('relational-core-invite', 'invitation', 'Invite to your Power of 5', ARRAY['power5', 'relational']::text[]),
    ('relational-follow-up', 'follow_up', 'Check-in after first conversation', ARRAY['power5']::text[]),
    ('event-invite-coffee', 'event_invite', 'Small circle invite', ARRAY['event']::text[]),
    ('turnout-reminder-soft', 'turnout_reminder', 'Gentle turnout reminder', ARRAY['election']::text[]),
    ('volunteer-one-step', 'volunteer_activation', 'One concrete volunteer step', ARRAY['volunteer']::text[]),
    ('registration-nudge-trusted', 'registration_nudge', 'Trusted registration nudge', ARRAY['registration']::text[]),
    ('appreciation-small-win', 'appreciation', 'Thank-you for showing up', ARRAY['care']::text[]),
    ('host-gathering-micro', 'host_gathering_invite', 'Host a tiny gathering', ARRAY['host']::text[])
) AS v(slug, template_type, title, tags)
WHERE NOT EXISTS (
    SELECT 1 FROM public.message_templates g
    WHERE g.owner_profile_id IS NULL AND g.slug = v.slug
);

INSERT INTO public.message_template_variants (template_id, variant_kind, body, sort_order)
SELECT t.id, x.variant_kind, x.body, x.sort_order
FROM public.message_templates t
CROSS JOIN (VALUES
    ('relational-core-invite', 'conversation_starter', 'I''ve been thinking about people I trust who care about our community — you came to mind. Can we grab 15 minutes?', 0),
    ('relational-core-invite', 'face_to_face_prompt', 'Share why this campaign matters to you personally; ask what they care about most locally.', 1),
    ('relational-core-invite', 'sms', 'Hey — you came to mind for something I''m building with neighbors. Got a few minutes this week?', 2),
    ('relational-follow-up', 'call_script', 'Hi — following up on our chat. No pressure — want to hear what landed and what felt off.', 0),
    ('relational-follow-up', 'sms', 'Following up from our conversation. Still happy to answer Qs — want me to send the link?', 1)
) AS x(slug, variant_kind, body, sort_order)
WHERE t.slug = x.slug AND t.owner_profile_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.message_template_variants e
      WHERE e.template_id = t.id AND e.variant_kind = x.variant_kind
  );
