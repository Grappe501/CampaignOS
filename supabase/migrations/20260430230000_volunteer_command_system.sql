-- Volunteer Command System (Step 2.2): profiles, roles, assignments, shifts,
-- training, activity, reliability, reminders. Idempotent CREATE/IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- volunteers (1:1 extension of campaign_profiles for operational volunteer data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    display_name text,
    email text,
    phone text,
    location_text text,
    timezone text,
    languages text[] NOT NULL DEFAULT '{}',
    transportation jsonb NOT NULL DEFAULT '{}'::jsonb,
    availability jsonb NOT NULL DEFAULT '{}'::jsonb,
    preferred_role_slugs text[] NOT NULL DEFAULT '{}',
    onboarding_status text NOT NULL DEFAULT 'new'
        CHECK (onboarding_status IN (
            'new', 'contacted', 'onboarding', 'ready', 'active', 'paused', 'inactive'
        )),
    active_status text NOT NULL DEFAULT 'active'
        CHECK (active_status IN ('active', 'paused', 'inactive')),
    reliability_score numeric(6, 3),
    leadership_potential numeric(6, 3),
    notes_internal text,
    onboarding_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteers_profile_unique UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS volunteers_campaign_idx ON public.volunteers (campaign_id);
CREATE INDEX IF NOT EXISTS volunteers_onboarding_idx ON public.volunteers (onboarding_status);
CREATE INDEX IF NOT EXISTS volunteers_active_idx ON public.volunteers (active_status);

COMMENT ON TABLE public.volunteers IS
    'Operational volunteer profile; links to campaign_profiles.';

-- ---------------------------------------------------------------------------
-- volunteer_skills / volunteer_interests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    skill_slug text NOT NULL,
    proficiency text NOT NULL DEFAULT 'intermediate'
        CHECK (proficiency IN ('novice', 'intermediate', 'advanced', 'expert')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_skills_unique UNIQUE (volunteer_id, skill_slug)
);

CREATE INDEX IF NOT EXISTS volunteer_skills_volunteer_idx ON public.volunteer_skills (volunteer_id);
CREATE INDEX IF NOT EXISTS volunteer_skills_slug_idx ON public.volunteer_skills (skill_slug);

CREATE TABLE IF NOT EXISTS public.volunteer_interests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    interest_slug text NOT NULL,
    weight smallint NOT NULL DEFAULT 1
        CHECK (weight >= 1 AND weight <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_interests_unique UNIQUE (volunteer_id, interest_slug)
);

CREATE INDEX IF NOT EXISTS volunteer_interests_volunteer_idx ON public.volunteer_interests (volunteer_id);

-- ---------------------------------------------------------------------------
-- volunteer_roles (role catalog / definitions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_roles (
    role_slug text PRIMARY KEY,
    label text NOT NULL,
    description text,
    required_skill_slugs text[] NOT NULL DEFAULT '{}',
    preferred_skill_slugs text[] NOT NULL DEFAULT '{}',
    training_requirements text[] NOT NULL DEFAULT '{}',
    default_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
    max_concurrent_assignments integer NOT NULL DEFAULT 3
        CHECK (max_concurrent_assignments >= 1 AND max_concurrent_assignments <= 50),
    supervisor_type text NOT NULL DEFAULT 'coordinator'
        CHECK (supervisor_type IN ('coordinator', 'team_lead', 'self', 'none')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- volunteer_shifts + volunteer_shift_slots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    title text NOT NULL,
    location_text text,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    supervisor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    notes text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'canceled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_shifts_campaign_start_idx
    ON public.volunteer_shifts (campaign_id, starts_at);
CREATE INDEX IF NOT EXISTS volunteer_shifts_event_idx ON public.volunteer_shifts (event_id);

CREATE TABLE IF NOT EXISTS public.volunteer_shift_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id uuid NOT NULL REFERENCES public.volunteer_shifts (id) ON DELETE CASCADE,
    role_slug text NOT NULL REFERENCES public.volunteer_roles (role_slug) ON DELETE RESTRICT,
    sort_order integer NOT NULL DEFAULT 0,
    slots_needed integer NOT NULL DEFAULT 1
        CHECK (slots_needed >= 1 AND slots_needed <= 99),
    backup_slots integer NOT NULL DEFAULT 0
        CHECK (backup_slots >= 0 AND backup_slots <= 20),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_shift_slots_shift_role_unique UNIQUE (shift_id, role_slug, sort_order)
);

CREATE INDEX IF NOT EXISTS volunteer_shift_slots_shift_idx ON public.volunteer_shift_slots (shift_id);

-- ---------------------------------------------------------------------------
-- volunteer_assignments (command layer — distinct from volunteer_task_assignments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    volunteer_id uuid REFERENCES public.volunteers (id) ON DELETE SET NULL,
    role_slug text NOT NULL REFERENCES public.volunteer_roles (role_slug) ON DELETE RESTRICT,
    task_id uuid REFERENCES public.volunteer_tasks (id) ON DELETE SET NULL,
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    shift_id uuid REFERENCES public.volunteer_shifts (id) ON DELETE SET NULL,
    shift_slot_id uuid REFERENCES public.volunteer_shift_slots (id) ON DELETE SET NULL,
    assigned_by uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz,
    due_at timestamptz,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN (
            'open', 'assigned', 'claimed', 'in_progress', 'completed',
            'declined', 'missed', 'canceled'
        )),
    priority text NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    checklist_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
    completion_notes text,
    declined boolean NOT NULL DEFAULT false,
    decline_reason text,
    completed_at timestamptz,
    backup_of_assignment_id uuid REFERENCES public.volunteer_assignments (id) ON DELETE SET NULL,
    checked_in_at timestamptz,
    checked_out_at timestamptz,
    no_show boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_assignments_volunteer_status_idx
    ON public.volunteer_assignments (volunteer_id, status);
CREATE INDEX IF NOT EXISTS volunteer_assignments_shift_idx ON public.volunteer_assignments (shift_id);
CREATE INDEX IF NOT EXISTS volunteer_assignments_event_idx ON public.volunteer_assignments (event_id);
CREATE INDEX IF NOT EXISTS volunteer_assignments_role_idx ON public.volunteer_assignments (role_slug);
CREATE INDEX IF NOT EXISTS volunteer_assignments_open_idx
    ON public.volunteer_assignments (campaign_id, status)
    WHERE status IN ('open', 'assigned', 'claimed', 'in_progress');

-- ---------------------------------------------------------------------------
-- volunteer_training_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_training_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    training_key text NOT NULL,
    status text NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired', 'waived')),
    proof_url text,
    completed_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_training_unique UNIQUE (volunteer_id, training_key)
);

CREATE INDEX IF NOT EXISTS volunteer_training_volunteer_idx ON public.volunteer_training_records (volunteer_id);

-- ---------------------------------------------------------------------------
-- volunteer_activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    action_type text NOT NULL,
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_activity_log_volunteer_created_idx
    ON public.volunteer_activity_log (volunteer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- volunteer_reliability_summaries (materialized metrics; app recomputes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_reliability_summaries (
    volunteer_id uuid PRIMARY KEY REFERENCES public.volunteers (id) ON DELETE CASCADE,
    assignment_claim_rate numeric(6, 4),
    assignment_completion_rate numeric(6, 4),
    no_show_rate numeric(6, 4),
    avg_response_hours numeric(8, 3),
    retention_score numeric(6, 4),
    activity_recency_days integer,
    reliability_category text
        CHECK (reliability_category IS NULL OR reliability_category IN (
            'high_reliability', 'steady', 'developing', 'at_risk', 'inactive'
        )),
    pipeline_stage text,
    last_computed_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- volunteer_reminder_queue (internal workflow; no external send)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_reminder_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL
        CHECK (entity_type IN ('assignment', 'shift', 'volunteer')),
    entity_id uuid NOT NULL,
    reminder_kind text NOT NULL,
    due_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'escalated', 'cleared', 'skipped')),
    escalated_at timestamptz,
    team_lead_notified_at timestamptz,
    coordinator_notified_at timestamptz,
    cleared_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_reminder_queue_due_idx
    ON public.volunteer_reminder_queue (due_at, status)
    WHERE status IN ('pending', 'sent');

-- ---------------------------------------------------------------------------
-- Seed baseline role definitions
-- ---------------------------------------------------------------------------
INSERT INTO public.volunteer_roles (role_slug, label, description, required_skill_slugs, preferred_skill_slugs, training_requirements, default_checklist, max_concurrent_assignments, supervisor_type)
VALUES
    ('greeter', 'Greeter', 'Welcome attendees and orient traffic.', ARRAY[]::text[], ARRAY['communication']::text[], ARRAY[]::text[], '[]'::jsonb, 5, 'team_lead'),
    ('check_in_support', 'Check-in support', 'Support registration and data capture.', ARRAY['data_entry']::text[], ARRAY['communication']::text[], ARRAY['check_in_basics']::text[], '[]'::jsonb, 4, 'team_lead'),
    ('logistics_support', 'Logistics support', 'Moves, supplies, venue coordination.', ARRAY[]::text[], ARRAY['driving', 'lifting']::text[], ARRAY[]::text[], '[]'::jsonb, 4, 'coordinator'),
    ('outreach_support', 'Outreach support', 'Neighbor contact and follow-up.', ARRAY['communication']::text[], ARRAY['canvassing']::text[], ARRAY[]::text[], '[]'::jsonb, 3, 'team_lead'),
    ('host_support', 'Host support', 'Support event host and VIP flow.', ARRAY[]::text[], ARRAY['events']::text[], ARRAY[]::text[], '[]'::jsonb, 3, 'team_lead'),
    ('photographer', 'Photographer', 'Document the event with media guidelines.', ARRAY[]::text[], ARRAY['photography']::text[], ARRAY['media_policy']::text[], '[]'::jsonb, 2, 'coordinator'),
    ('setup_support', 'Setup support', 'Arrive early for layout and setup.', ARRAY[]::text[], ARRAY['lifting']::text[], ARRAY[]::text[], '[]'::jsonb, 4, 'team_lead'),
    ('cleanup_support', 'Cleanup support', 'Strike and venue reset.', ARRAY[]::text[], ARRAY['lifting']::text[], ARRAY[]::text[], '[]'::jsonb, 4, 'team_lead'),
    ('team_lead', 'Team lead', 'Coordinates a pod of volunteers on site.', ARRAY['communication']::text[], ARRAY['leadership']::text[], ARRAY['leadership_101']::text[], '[]'::jsonb, 2, 'coordinator'),
    ('trainer', 'Trainer', 'Runs training segments or onboarding.', ARRAY['communication']::text[], ARRAY['training']::text[], ARRAY['train_the_trainer']::text[], '[]'::jsonb, 2, 'coordinator')
ON CONFLICT (role_slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    required_skill_slugs = EXCLUDED.required_skill_slugs,
    preferred_skill_slugs = EXCLUDED.preferred_skill_slugs,
    training_requirements = EXCLUDED.training_requirements,
    default_checklist = EXCLUDED.default_checklist,
    max_concurrent_assignments = EXCLUDED.max_concurrent_assignments,
    supervisor_type = EXCLUDED.supervisor_type,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_shift_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_reliability_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_reminder_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_volunteer_command_coordinator(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_campaign_event_editor(p_profile_id);
$$;

CREATE OR REPLACE FUNCTION public.volunteer_id_for_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT v.id
    FROM public.volunteers v
    WHERE v.profile_id = p_profile_id
    LIMIT 1;
$$;

-- volunteers
DROP POLICY IF EXISTS volunteers_select_scope ON public.volunteers;
CREATE POLICY volunteers_select_scope ON public.volunteers
    FOR SELECT TO authenticated
    USING (
        profile_id = public.campaign_profile_id_for_auth()
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS volunteers_insert_scope ON public.volunteers;
CREATE POLICY volunteers_insert_scope ON public.volunteers
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id = public.campaign_profile_id_for_auth()
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS volunteers_update_scope ON public.volunteers;
CREATE POLICY volunteers_update_scope ON public.volunteers
    FOR UPDATE TO authenticated
    USING (
        profile_id = public.campaign_profile_id_for_auth()
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        profile_id = public.campaign_profile_id_for_auth()
        OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
    );

-- volunteer_skills / interests — same volunteer scope
DROP POLICY IF EXISTS volunteer_skills_scope ON public.volunteer_skills;
CREATE POLICY volunteer_skills_scope ON public.volunteer_skills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_skills.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_skills.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_interests_scope ON public.volunteer_interests;
CREATE POLICY volunteer_interests_scope ON public.volunteer_interests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_interests.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_interests.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

-- role catalog: readable by all authenticated; write coordinator only
DROP POLICY IF EXISTS volunteer_roles_select ON public.volunteer_roles;
CREATE POLICY volunteer_roles_select ON public.volunteer_roles
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS volunteer_roles_insert_coordinator ON public.volunteer_roles;
CREATE POLICY volunteer_roles_insert_coordinator ON public.volunteer_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_roles_update_coordinator ON public.volunteer_roles;
CREATE POLICY volunteer_roles_update_coordinator ON public.volunteer_roles
    FOR UPDATE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_roles_delete_coordinator ON public.volunteer_roles;
CREATE POLICY volunteer_roles_delete_coordinator ON public.volunteer_roles
    FOR DELETE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

-- shifts & slots: coordinators full; volunteers read shifts they are assigned to
DROP POLICY IF EXISTS volunteer_shifts_select ON public.volunteer_shifts;
CREATE POLICY volunteer_shifts_select ON public.volunteer_shifts
    FOR SELECT TO authenticated
    USING (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR public.campaign_profile_id_for_auth() IS NOT NULL
    );

DROP POLICY IF EXISTS volunteer_shifts_write ON public.volunteer_shifts;
CREATE POLICY volunteer_shifts_write ON public.volunteer_shifts
    FOR INSERT TO authenticated
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_shifts_update ON public.volunteer_shifts;
CREATE POLICY volunteer_shifts_update ON public.volunteer_shifts
    FOR UPDATE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_shifts_delete ON public.volunteer_shifts;
CREATE POLICY volunteer_shifts_delete ON public.volunteer_shifts
    FOR DELETE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_shift_slots_select ON public.volunteer_shift_slots;
CREATE POLICY volunteer_shift_slots_select ON public.volunteer_shift_slots
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS volunteer_shift_slots_insert ON public.volunteer_shift_slots;
CREATE POLICY volunteer_shift_slots_insert ON public.volunteer_shift_slots
    FOR INSERT TO authenticated
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_shift_slots_update ON public.volunteer_shift_slots;
CREATE POLICY volunteer_shift_slots_update ON public.volunteer_shift_slots
    FOR UPDATE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_shift_slots_delete ON public.volunteer_shift_slots;
CREATE POLICY volunteer_shift_slots_delete ON public.volunteer_shift_slots
    FOR DELETE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

-- assignments
DROP POLICY IF EXISTS volunteer_assignments_select ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_select ON public.volunteer_assignments
    FOR SELECT TO authenticated
    USING (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            volunteer_id IS NOT NULL
            AND volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        )
        OR (
            volunteer_id IS NULL
            AND status = 'open'
        )
    );

DROP POLICY IF EXISTS volunteer_assignments_insert ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_insert ON public.volunteer_assignments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_assignments_update ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_update ON public.volunteer_assignments
    FOR UPDATE TO authenticated
    USING (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            volunteer_id IS NOT NULL
            AND volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        )
        OR (
            status = 'open'
            AND volunteer_id IS NULL
        )
    )
    WITH CHECK (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            volunteer_id IS NOT NULL
            AND volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        )
    );

DROP POLICY IF EXISTS volunteer_assignments_delete ON public.volunteer_assignments;
CREATE POLICY volunteer_assignments_delete ON public.volunteer_assignments
    FOR DELETE TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

-- training, activity, reliability: volunteer + coordinator
DROP POLICY IF EXISTS volunteer_training_scope ON public.volunteer_training_records;
CREATE POLICY volunteer_training_scope ON public.volunteer_training_records
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_training_records.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_training_records.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_activity_scope ON public.volunteer_activity_log;
CREATE POLICY volunteer_activity_scope ON public.volunteer_activity_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_activity_log.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_activity_insert ON public.volunteer_activity_log;
CREATE POLICY volunteer_activity_insert ON public.volunteer_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_activity_log.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_reliability_select ON public.volunteer_reliability_summaries;
CREATE POLICY volunteer_reliability_select ON public.volunteer_reliability_summaries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_reliability_summaries.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_reliability_write ON public.volunteer_reliability_summaries;
CREATE POLICY volunteer_reliability_write ON public.volunteer_reliability_summaries
    FOR ALL TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS volunteer_reminder_scope ON public.volunteer_reminder_queue;
CREATE POLICY volunteer_reminder_scope ON public.volunteer_reminder_queue
    FOR ALL TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_interests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_shift_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_training_records TO authenticated;
GRANT SELECT, INSERT ON public.volunteer_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_reliability_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_reminder_queue TO authenticated;
