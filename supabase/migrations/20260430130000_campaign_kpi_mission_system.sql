-- KPI → Mission → volunteer task linkage: campaign goals, progress audit, mission rows.
-- Completing a volunteer task with kpi_slug + kpi_contribution updates KPI + missions.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_kpis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    target_value numeric NOT NULL CHECK (target_value >= 0),
    current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    unit text NOT NULL
        CHECK (unit IN (
            'volunteers', 'dollars', 'contacts', 'power5_nodes', 'other'
        )),
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_kpis_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS campaign_kpis_active_idx
    ON public.campaign_kpis (is_active, start_date, end_date);

CREATE TABLE IF NOT EXISTS public.kpi_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id uuid NOT NULL REFERENCES public.campaign_kpis (id) ON DELETE CASCADE,
    delta numeric NOT NULL,
    source_type text NOT NULL
        CHECK (source_type IN ('task', 'manual', 'system')),
    source_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_updates_kpi_idx ON public.kpi_updates (kpi_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.campaign_missions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id uuid NOT NULL REFERENCES public.campaign_kpis (id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    target_value numeric NOT NULL CHECK (target_value >= 0),
    current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    assigned_scope text NOT NULL DEFAULT 'global'
        CHECK (assigned_scope IN ('global', 'team', 'role')),
    team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    role_key text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_missions_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS campaign_missions_kpi_idx ON public.campaign_missions (kpi_id);

CREATE TABLE IF NOT EXISTS public.mission_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id uuid NOT NULL REFERENCES public.campaign_missions (id) ON DELETE CASCADE,
    campaign_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    team_id uuid REFERENCES public.power5_teams (id) ON DELETE SET NULL,
    progress_value numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mission_progress_mission_idx
    ON public.mission_progress (mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mission_progress_profile_idx
    ON public.mission_progress (campaign_profile_id);

-- ---------------------------------------------------------------------------
-- Extend volunteer task templates (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_task_templates
    ADD COLUMN IF NOT EXISTS kpi_slug text REFERENCES public.campaign_kpis (slug) ON DELETE SET NULL;

ALTER TABLE public.volunteer_task_templates
    ADD COLUMN IF NOT EXISTS kpi_contribution numeric NOT NULL DEFAULT 0
        CHECK (kpi_contribution >= 0);

COMMENT ON COLUMN public.volunteer_task_templates.kpi_slug IS
    'When set, completing this task contributes kpi_contribution to the matching campaign_kpis row.';
COMMENT ON COLUMN public.volunteer_task_templates.kpi_contribution IS
    'Numeric increment applied to KPI (and linked global missions) on task completion.';

-- ---------------------------------------------------------------------------
-- Leadership helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_campaign_leadership(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = p_profile_id
              AND lower(trim(coalesce(cp.primary_role, ''))) IN (
                  'coordinator',
                  'staff',
                  'admin'
              )
        )
        OR EXISTS (
            SELECT 1
            FROM public.volunteer_supervisor_teams st
            WHERE st.supervisor_profile_id = p_profile_id
        );
$$;

-- ---------------------------------------------------------------------------
-- Apply KPI progress from a completed volunteer assignment (idempotent-friendly)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kpi_apply_volunteer_task_completion(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignee uuid;
    v_slug text;
    v_contrib numeric;
    v_kpi public.campaign_kpis%ROWTYPE;
    v_now date := (timezone('utc', now()))::date;
    m record;
BEGIN
    SELECT
        a.assignee_profile_id,
        tpl.kpi_slug,
        coalesce(tpl.kpi_contribution, 0)::numeric
    INTO v_assignee, v_slug, v_contrib
    FROM public.volunteer_task_assignments a
    JOIN public.volunteer_tasks t ON t.id = a.task_id
    LEFT JOIN public.volunteer_task_templates tpl ON tpl.id = t.template_id
    WHERE a.id = p_assignment_id;

    IF v_assignee IS NULL OR v_slug IS NULL OR trim(v_slug) = '' OR v_contrib <= 0 THEN
        RETURN;
    END IF;

    SELECT * INTO v_kpi
    FROM public.campaign_kpis
    WHERE slug = v_slug
      AND is_active
      AND v_now BETWEEN start_date AND end_date
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.campaign_kpis
    SET current_value = current_value + v_contrib
    WHERE id = v_kpi.id;

    INSERT INTO public.kpi_updates (kpi_id, delta, source_type, source_id)
    VALUES (
        v_kpi.id,
        v_contrib,
        'task',
        p_assignment_id::text
    );

    FOR m IN
        SELECT cm.id, cm.assigned_scope, cm.team_id, cm.role_key, cm.start_date, cm.end_date
        FROM public.campaign_missions cm
        WHERE cm.kpi_id = v_kpi.id
          AND v_now BETWEEN cm.start_date AND cm.end_date
    LOOP
        IF m.assigned_scope = 'global' THEN
            UPDATE public.campaign_missions
            SET current_value = current_value + v_contrib
            WHERE id = m.id;

            INSERT INTO public.mission_progress (
                mission_id,
                campaign_profile_id,
                team_id,
                progress_value
            )
            VALUES (m.id, v_assignee, NULL, v_contrib);
        ELSIF m.assigned_scope = 'team' AND m.team_id IS NOT NULL THEN
            IF EXISTS (
                SELECT 1
                FROM public.power5_team_memberships tm
                WHERE tm.team_id = m.team_id
                  AND tm.profile_id = v_assignee
            ) THEN
                UPDATE public.campaign_missions
                SET current_value = current_value + v_contrib
                WHERE id = m.id;

                INSERT INTO public.mission_progress (
                    mission_id,
                    campaign_profile_id,
                    team_id,
                    progress_value
                )
                VALUES (m.id, v_assignee, m.team_id, v_contrib);
            END IF;
        ELSIF m.assigned_scope = 'role'
              AND m.role_key IS NOT NULL
              AND EXISTS (
                  SELECT 1
                  FROM public.campaign_profiles cp
                  WHERE cp.id = v_assignee
                    AND lower(trim(coalesce(cp.primary_role, ''))) = lower(trim(m.role_key))
              ) THEN
            UPDATE public.campaign_missions
            SET current_value = current_value + v_contrib
            WHERE id = m.id;

            INSERT INTO public.mission_progress (
                mission_id,
                campaign_profile_id,
                team_id,
                progress_value
            )
            VALUES (m.id, v_assignee, NULL, v_contrib);
        END IF;
    END LOOP;
END;
$$;

-- Hook into volunteer task completion
CREATE OR REPLACE FUNCTION public.volunteer_assignment_complete(
    p_assignment_id uuid,
    p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
    st text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id, status INTO assignee, st
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL THEN
        RAISE EXCEPTION 'assignment not found';
    END IF;

    IF assignee IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, assignee) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF st NOT IN ('assigned', 'in_progress', 'blocked') THEN
        RETURN;
    END IF;

    UPDATE public.volunteer_task_assignments
    SET
        status = 'completed',
        completion_notes = left(coalesce(p_notes, ''), 2000),
        completed_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (
        p_assignment_id,
        'completed',
        actor,
        jsonb_build_object('notes', coalesce(left(p_notes, 400), ''))
    );

    PERFORM public.volunteer_apply_task_completion(p_assignment_id);
    PERFORM public.kpi_apply_volunteer_task_completion(p_assignment_id);
    PERFORM public.volunteer_sync_tasks_for_profile(assignee);
END;
$$;

-- ---------------------------------------------------------------------------
-- Leadership RPCs: adjust targets and manual deltas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kpi_leadership_set_target(
    p_kpi_id uuid,
    p_target_value numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
BEGIN
    IF actor IS NULL OR NOT public.is_campaign_leadership(actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF p_target_value IS NULL OR p_target_value < 0 THEN
        RAISE EXCEPTION 'invalid target';
    END IF;

    UPDATE public.campaign_kpis
    SET target_value = p_target_value
    WHERE id = p_kpi_id;

    UPDATE public.campaign_missions
    SET target_value = p_target_value
    WHERE kpi_id = p_kpi_id
      AND assigned_scope = 'global';
END;
$$;

CREATE OR REPLACE FUNCTION public.kpi_leadership_manual_delta(
    p_kpi_id uuid,
    p_delta numeric,
    p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    d numeric;
BEGIN
    IF actor IS NULL OR NOT public.is_campaign_leadership(actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    d := coalesce(p_delta, 0);
    IF d = 0 THEN
        RETURN;
    END IF;

    UPDATE public.campaign_kpis
    SET current_value = greatest(0, current_value + d)
    WHERE id = p_kpi_id;

    INSERT INTO public.kpi_updates (kpi_id, delta, source_type, source_id)
    VALUES (
        p_kpi_id,
        d,
        'manual',
        left(coalesce(p_note, ''), 500)
    );

    UPDATE public.campaign_missions
    SET current_value = greatest(0, current_value + d)
    WHERE kpi_id = p_kpi_id
      AND assigned_scope = 'global';
END;
$$;

GRANT EXECUTE ON FUNCTION public.kpi_leadership_set_target(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_leadership_manual_delta(uuid, numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_kpis_select_auth ON public.campaign_kpis;
CREATE POLICY campaign_kpis_select_auth ON public.campaign_kpis
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kpi_updates_select_auth ON public.kpi_updates;
CREATE POLICY kpi_updates_select_auth ON public.kpi_updates
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campaign_missions_select_auth ON public.campaign_missions;
CREATE POLICY campaign_missions_select_auth ON public.campaign_missions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mission_progress_select_scope ON public.mission_progress;
CREATE POLICY mission_progress_select_scope ON public.mission_progress
    FOR SELECT TO authenticated USING (
        campaign_profile_id = public.volunteer_resolve_actor_profile()
        OR public.is_campaign_leadership(public.volunteer_resolve_actor_profile())
    );

GRANT SELECT ON public.campaign_kpis TO authenticated;
GRANT SELECT ON public.kpi_updates TO authenticated;
GRANT SELECT ON public.campaign_missions TO authenticated;
GRANT SELECT ON public.mission_progress TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed KPIs + missions + template links
-- ---------------------------------------------------------------------------
INSERT INTO public.campaign_kpis (
    slug,
    name,
    description,
    target_value,
    current_value,
    unit,
    start_date,
    end_date,
    is_active
)
VALUES
    (
        'volunteers',
        'Volunteer sign-ups',
        'Distinct volunteers engaged and moving through onboarding.',
        20000,
        0,
        'volunteers',
        date '2026-01-01',
        date '2026-12-31',
        true
    ),
    (
        'fundraising',
        'Grassroots fundraising',
        'Dollars raised through grassroots channels (reported increments).',
        2000000,
        0,
        'dollars',
        date '2026-01-01',
        date '2026-12-31',
        true
    ),
    (
        'voter_contacts',
        'Voter contacts',
        'One-on-one voter conversations logged via outreach tasks.',
        100000,
        0,
        'contacts',
        date '2026-01-01',
        date '2026-12-31',
        true
    ),
    (
        'power5_nodes',
        'Power of 5 relationships',
        'Named relationships advanced in the Power of 5 system.',
        5000,
        0,
        'power5_nodes',
        date '2026-01-01',
        date '2026-12-31',
        true
    )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.campaign_missions (
    kpi_id,
    name,
    description,
    target_value,
    current_value,
    assigned_scope,
    start_date,
    end_date
)
SELECT
    k.id,
    'Field: ' || k.name,
    coalesce(k.description, ''),
    k.target_value,
    0,
    'global',
    k.start_date,
    k.end_date
FROM public.campaign_kpis k
WHERE k.slug IN ('volunteers', 'fundraising', 'voter_contacts', 'power5_nodes')
  AND NOT EXISTS (
      SELECT 1 FROM public.campaign_missions m WHERE m.kpi_id = k.id
  );

UPDATE public.volunteer_task_templates SET kpi_slug = NULL, kpi_contribution = 0 WHERE true;

UPDATE public.volunteer_task_templates
SET kpi_slug = 'volunteers', kpi_contribution = 1
WHERE template_key IN (
    'onboarding_first_action',
    'onboarding_choose_direction',
    'onboarding_first_micro_commitment',
    'training_complete_intro',
    'training_complete_lane'
);

UPDATE public.volunteer_task_templates
SET kpi_slug = 'voter_contacts', kpi_contribution = 2
WHERE template_key = 'outreach_text_two_people';

UPDATE public.volunteer_task_templates
SET kpi_slug = 'voter_contacts', kpi_contribution = 1
WHERE template_key = 'outreach_call_one_person';

UPDATE public.volunteer_task_templates
SET kpi_slug = 'fundraising', kpi_contribution = 50
WHERE template_key = 'event_attend_local';

UPDATE public.volunteer_task_templates
SET kpi_slug = 'fundraising', kpi_contribution = 150
WHERE template_key = 'event_host_small_gathering';

UPDATE public.volunteer_task_templates
SET kpi_slug = 'power5_nodes', kpi_contribution = 1
WHERE template_key IN (
    'power5_identify_five',
    'power5_contact_first_person',
    'power5_follow_up_contact',
    'power5_invite_to_join'
);
