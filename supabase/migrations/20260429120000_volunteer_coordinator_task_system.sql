-- Volunteer Coordinator mission task system (additive): templates, instances,
-- assignments, events, engagement scoring, supervisor scope, Power5 + onboarding hooks.

-- ---------------------------------------------------------------------------
-- Templates & catalog metadata
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    default_task_type text NOT NULL
        CHECK (default_task_type IN (
            'onboarding', 'outreach', 'training', 'event', 'admin', 'power5'
        )),
    default_priority text NOT NULL DEFAULT 'medium'
        CHECK (default_priority IN ('low', 'medium', 'high', 'urgent')),
    default_difficulty smallint NOT NULL DEFAULT 2
        CHECK (default_difficulty >= 1 AND default_difficulty <= 5),
    default_estimated_minutes integer NOT NULL DEFAULT 15
        CHECK (default_estimated_minutes > 0 AND default_estimated_minutes <= 1440),
    linked_onboarding_state text,
    linked_onboarding_momentum text,
    linked_power5_trigger text,
    linked_training_module_id uuid
        REFERENCES public.workspace_training_modules (id) ON DELETE SET NULL,
    required_role text,
    required_state text,
    allow_repeat boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.volunteer_task_templates IS
    'Mission-driven task templates; instances live in volunteer_tasks + volunteer_task_assignments.';

-- ---------------------------------------------------------------------------
-- Concrete tasks (instances)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES public.volunteer_task_templates (id) ON DELETE SET NULL,
    template_key text NOT NULL,
    title text NOT NULL,
    description text,
    task_type text NOT NULL
        CHECK (task_type IN (
            'onboarding', 'outreach', 'training', 'event', 'admin', 'power5'
        )),
    priority text NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    difficulty smallint NOT NULL DEFAULT 2
        CHECK (difficulty >= 1 AND difficulty <= 5),
    estimated_minutes integer NOT NULL DEFAULT 15,
    required_role text,
    required_state text,
    linked_training_module_id uuid
        REFERENCES public.workspace_training_modules (id) ON DELETE SET NULL,
    created_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_tasks_template_key_idx
    ON public.volunteer_tasks (template_key);

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.volunteer_tasks (id) ON DELETE CASCADE,
    assignee_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    template_key text NOT NULL,
    assigned_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    due_at timestamptz,
    status text NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'in_progress', 'completed', 'blocked', 'skipped')),
    completion_notes text,
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS volunteer_task_assignments_assignee_status_idx
    ON public.volunteer_task_assignments (assignee_profile_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS volunteer_task_one_active_per_template
    ON public.volunteer_task_assignments (assignee_profile_id, template_key)
    WHERE status IN ('assigned', 'in_progress', 'blocked');

-- ---------------------------------------------------------------------------
-- Events / audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_task_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.volunteer_task_assignments (id) ON DELETE CASCADE,
    event_type text NOT NULL
        CHECK (event_type IN (
            'assigned', 'started', 'paused', 'completed', 'blocked', 'skipped', 'reassigned', 'nudge'
        )),
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_task_events_assignment_idx
    ON public.volunteer_task_events (assignment_id);

-- ---------------------------------------------------------------------------
-- Optional grouping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_task_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.volunteer_task_group_items (
    group_id uuid NOT NULL REFERENCES public.volunteer_task_groups (id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES public.volunteer_tasks (id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, task_id)
);

-- ---------------------------------------------------------------------------
-- Engagement scoring (deterministic weights in apply function)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_engagement_scores (
    campaign_profile_id uuid PRIMARY KEY REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    points_total integer NOT NULL DEFAULT 0,
    engagement_readiness integer NOT NULL DEFAULT 0,
    last_active_local_date date,
    last_completion_local_date date,
    streak_active_days integer NOT NULL DEFAULT 0,
    streak_completion_days integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Supervisor ↔ team (deterministic RBAC scope)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_supervisor_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.power5_teams (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_supervisor_teams_unique UNIQUE (supervisor_profile_id, team_id)
);

CREATE INDEX IF NOT EXISTS volunteer_supervisor_teams_team_idx
    ON public.volunteer_supervisor_teams (team_id);

-- ---------------------------------------------------------------------------
-- Helper: points by task_type
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_task_type_points(p_task_type text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE trim(lower(p_task_type))
        WHEN 'onboarding' THEN 5
        WHEN 'outreach' THEN 8
        WHEN 'training' THEN 6
        WHEN 'event' THEN 7
        WHEN 'admin' THEN 4
        WHEN 'power5' THEN 10
        ELSE 4
    END;
$$;

-- ---------------------------------------------------------------------------
-- Core: enqueue from template (dedupe, max 3 active)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_enqueue_from_template(
    p_assignee_profile_id uuid,
    p_template_key text,
    p_assigned_by_profile_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tpl public.volunteer_task_templates%ROWTYPE;
    active_cnt integer;
    aid uuid;
    tsk_id uuid;
BEGIN
    SELECT * INTO tpl
    FROM public.volunteer_task_templates
    WHERE template_key = p_template_key AND is_active;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF NOT tpl.allow_repeat THEN
        IF EXISTS (
            SELECT 1
            FROM public.volunteer_task_assignments a
            JOIN public.volunteer_tasks tk ON tk.id = a.task_id
            WHERE a.assignee_profile_id = p_assignee_profile_id
              AND tk.template_key = p_template_key
              AND a.status = 'completed'
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.volunteer_task_assignments a
        JOIN public.volunteer_tasks tk ON tk.id = a.task_id
        WHERE a.assignee_profile_id = p_assignee_profile_id
          AND tk.template_key = p_template_key
          AND a.status IN ('assigned', 'in_progress', 'blocked')
    ) THEN
        RETURN NULL;
    END IF;

    SELECT count(*)::integer INTO active_cnt
    FROM public.volunteer_task_assignments
    WHERE assignee_profile_id = p_assignee_profile_id
      AND status IN ('assigned', 'in_progress', 'blocked');

    IF active_cnt >= 3 THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.volunteer_tasks (
        template_id,
        template_key,
        title,
        description,
        task_type,
        priority,
        difficulty,
        estimated_minutes,
        required_role,
        required_state,
        linked_training_module_id,
        created_by_profile_id
    )
    VALUES (
        tpl.id,
        tpl.template_key,
        tpl.title,
        tpl.description,
        tpl.default_task_type,
        tpl.default_priority,
        tpl.default_difficulty,
        tpl.default_estimated_minutes,
        tpl.required_role,
        tpl.required_state,
        tpl.linked_training_module_id,
        p_assigned_by_profile_id
    )
    RETURNING id INTO tsk_id;

    INSERT INTO public.volunteer_task_assignments (
        task_id,
        assignee_profile_id,
        template_key,
        assigned_by_profile_id,
        status
    )
    VALUES (
        tsk_id,
        p_assignee_profile_id,
        tpl.template_key,
        p_assigned_by_profile_id,
        'assigned'
    )
    RETURNING id INTO aid;

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (aid, 'assigned', p_assigned_by_profile_id, '{}'::jsonb);

    INSERT INTO public.volunteer_engagement_scores (campaign_profile_id, engagement_readiness, updated_at)
    VALUES (p_assignee_profile_id, 1, now())
    ON CONFLICT (campaign_profile_id) DO UPDATE SET
        engagement_readiness = public.volunteer_engagement_scores.engagement_readiness + 1,
        updated_at = now();

    RETURN aid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply completion scoring + streaks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_apply_task_completion(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pid uuid;
    ttype text;
    pts integer;
    cur_date date := (timezone('utc', now()))::date;
BEGIN
    SELECT a.assignee_profile_id, t.task_type
    INTO pid, ttype
    FROM public.volunteer_task_assignments a
    JOIN public.volunteer_tasks t ON t.id = a.task_id
    WHERE a.id = p_assignment_id;

    IF pid IS NULL THEN
        RETURN;
    END IF;

    pts := public.volunteer_task_type_points(ttype);

    INSERT INTO public.volunteer_engagement_scores (
        campaign_profile_id,
        points_total,
        last_active_local_date,
        last_completion_local_date,
        streak_active_days,
        streak_completion_days,
        updated_at
    )
    VALUES (pid, pts, cur_date, cur_date, 1, 1, now())
    ON CONFLICT (campaign_profile_id) DO UPDATE SET
        points_total = public.volunteer_engagement_scores.points_total + pts,
        last_active_local_date = cur_date,
        last_completion_local_date = cur_date,
        streak_active_days = CASE
            WHEN public.volunteer_engagement_scores.last_active_local_date IS NULL THEN 1
            WHEN public.volunteer_engagement_scores.last_active_local_date = cur_date
                THEN public.volunteer_engagement_scores.streak_active_days
            WHEN public.volunteer_engagement_scores.last_active_local_date = cur_date - 1
                THEN public.volunteer_engagement_scores.streak_active_days + 1
            ELSE 1
        END,
        streak_completion_days = CASE
            WHEN public.volunteer_engagement_scores.last_completion_local_date IS NULL THEN 1
            WHEN public.volunteer_engagement_scores.last_completion_local_date = cur_date
                THEN public.volunteer_engagement_scores.streak_completion_days
            WHEN public.volunteer_engagement_scores.last_completion_local_date = cur_date - 1
                THEN public.volunteer_engagement_scores.streak_completion_days + 1
            ELSE 1
        END,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_sync_tasks_for_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p public.campaign_profiles%ROWTYPE;
    ex text;
    v_momentum text;
    v_dir text;
    v_micro text;
    v_voter_ok boolean;
    node_cnt integer;
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM public.campaign_profiles
           WHERE id = p_profile_id AND user_id = auth.uid()
       ) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT * INTO p FROM public.campaign_profiles WHERE id = p_profile_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    ex := coalesce(lower(trim(p.exception_request_status)), '');
    IF ex = 'pending' THEN
        RETURN;
    END IF;

    v_momentum := coalesce(lower(trim(p.onboarding_momentum_state)), 'new');
    v_dir := nullif(trim(p.onboarding_direction_key), '');
    v_micro := nullif(trim(p.onboarding_micro_commitment_key), '');
    v_voter_ok := p.linked_voter_id IS NOT NULL AND trim(p.linked_voter_id) <> '';

    IF v_momentum = 'new'
       OR (v_momentum = 'exploring' AND v_dir IS NULL) THEN
        PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'onboarding_choose_direction', NULL);
    END IF;

    IF v_voter_ok AND coalesce(trim(p.onboarding_branch), '') <> '' THEN
        PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'onboarding_first_action', NULL);
    END IF;

    IF v_dir IS NOT NULL AND v_micro IS NULL AND v_momentum IN ('exploring', 'committed') THEN
        PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'onboarding_first_micro_commitment', NULL);
    END IF;

    IF v_momentum = 'engaged' AND v_dir IS NOT NULL THEN
        IF v_dir = 'talk_to_people' THEN
            PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'outreach_text_two_people', NULL);
        ELSIF v_dir = 'show_up_locally' THEN
            PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'event_attend_local', NULL);
        ELSIF v_dir = 'help_behind_the_scenes' THEN
            PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'training_complete_lane', NULL);
        ELSIF v_dir = 'spread_the_word' THEN
            PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'training_complete_intro', NULL);
        END IF;
    END IF;

    IF v_voter_ok THEN
        SELECT count(*)::integer INTO node_cnt
        FROM public.power5_relationship_nodes
        WHERE owner_profile_id = p_profile_id;

        IF node_cnt = 0 THEN
            PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'power5_identify_five', NULL);
        END IF;
    END IF;

    IF v_voter_ok AND v_momentum = 'engaged' THEN
        PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'outreach_call_one_person', NULL);
        PERFORM public.volunteer_enqueue_from_template(p_profile_id, 'event_host_small_gathering', NULL);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Volunteer RPCs (auth-safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_resolve_actor_profile()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_supervisor_covers_assignee(
    p_supervisor_profile uuid,
    p_assignee_profile uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volunteer_supervisor_teams st
        JOIN public.power5_team_memberships m
            ON m.team_id = st.team_id AND m.profile_id = p_assignee_profile
        WHERE st.supervisor_profile_id = p_supervisor_profile
    );
$$;

CREATE OR REPLACE FUNCTION public.volunteer_assignment_mark_started(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL THEN
        RAISE EXCEPTION 'assignment not found';
    END IF;

    IF assignee IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, assignee) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET status = 'in_progress'
    WHERE id = p_assignment_id AND status = 'assigned';

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (p_assignment_id, 'started', actor, '{}'::jsonb);
END;
$$;

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
    PERFORM public.volunteer_sync_tasks_for_profile(assignee);
END;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_assignment_skip(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL OR assignee IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET status = 'skipped', completed_at = now()
    WHERE id = p_assignment_id AND status IN ('assigned', 'in_progress');

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (p_assignment_id, 'skipped', actor, '{}'::jsonb);

    PERFORM public.volunteer_sync_tasks_for_profile(assignee);
END;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_supervisor_set_blocked(
    p_assignment_id uuid,
    p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL OR NOT public.volunteer_supervisor_covers_assignee(actor, assignee) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET status = 'blocked'
    WHERE id = p_assignment_id AND status IN ('assigned', 'in_progress');

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (
        p_assignment_id,
        'blocked',
        actor,
        jsonb_build_object('reason', coalesce(left(p_reason, 400), ''))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_supervisor_reassign(
    p_assignment_id uuid,
    p_new_assignee_profile uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    old_assignee uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO old_assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF old_assignee IS NULL
       OR NOT public.volunteer_supervisor_covers_assignee(actor, old_assignee)
       OR NOT public.volunteer_supervisor_covers_assignee(actor, p_new_assignee_profile) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET assignee_profile_id = p_new_assignee_profile
    WHERE id = p_assignment_id;

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (
        p_assignment_id,
        'reassigned',
        actor,
        jsonb_build_object('from_profile', old_assignee, 'to_profile', p_new_assignee_profile)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.volunteer_supervisor_nudge(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL OR NOT public.volunteer_supervisor_covers_assignee(actor, assignee) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (p_assignment_id, 'nudge', actor, '{"channel":"log"}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_volunteer_sync_tasks_campaign_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.onboarding_momentum_state IS DISTINCT FROM OLD.onboarding_momentum_state
           OR NEW.onboarding_direction_key IS DISTINCT FROM OLD.onboarding_direction_key
           OR NEW.onboarding_micro_commitment_key IS DISTINCT FROM OLD.onboarding_micro_commitment_key
           OR NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status
           OR NEW.active_space IS DISTINCT FROM OLD.active_space
           OR NEW.linked_voter_id IS DISTINCT FROM OLD.linked_voter_id
           OR NEW.onboarding_branch IS DISTINCT FROM OLD.onboarding_branch
           OR NEW.exception_request_status IS DISTINCT FROM OLD.exception_request_status THEN
            PERFORM public.volunteer_sync_tasks_for_profile(NEW.id);
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM public.volunteer_sync_tasks_for_profile(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_volunteer_sync_tasks_campaign_profile ON public.campaign_profiles;
CREATE TRIGGER tr_volunteer_sync_tasks_campaign_profile
    AFTER INSERT OR UPDATE ON public.campaign_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_volunteer_sync_tasks_campaign_profile();

CREATE OR REPLACE FUNCTION public.tr_volunteer_power5_node_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cnt integer;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT count(*) INTO cnt
        FROM public.power5_relationship_nodes
        WHERE owner_profile_id = NEW.owner_profile_id;
        IF cnt >= 1 THEN
            PERFORM public.volunteer_enqueue_from_template(
                NEW.owner_profile_id,
                'power5_contact_first_person',
                NULL
            );
        END IF;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.progress_state_key IS DISTINCT FROM OLD.progress_state_key
       AND NEW.progress_state_key IN ('contacted', 'follow_up') THEN
        PERFORM public.volunteer_enqueue_from_template(
            NEW.owner_profile_id,
            'power5_follow_up_contact',
            NULL
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_volunteer_power5_node_tasks ON public.power5_relationship_nodes;
CREATE TRIGGER tr_volunteer_power5_node_tasks
    AFTER INSERT OR UPDATE ON public.power5_relationship_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_volunteer_power5_node_tasks();

CREATE OR REPLACE FUNCTION public.tr_volunteer_recruitment_link_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.volunteer_enqueue_from_template(
        NEW.recruiter_profile_id,
        'power5_invite_to_join',
        NULL
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_volunteer_recruitment_link_tasks ON public.power5_recruitment_links;
CREATE TRIGGER tr_volunteer_recruitment_link_tasks
    AFTER INSERT ON public.power5_recruitment_links
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_volunteer_recruitment_link_tasks();

CREATE OR REPLACE FUNCTION public.tr_volunteer_training_complete_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    aid uuid;
BEGIN
    IF NEW.status = 'completed'
       AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
        FOR aid IN
            SELECT a.id
            FROM public.volunteer_task_assignments a
            JOIN public.volunteer_tasks t ON t.id = a.task_id
            WHERE a.assignee_profile_id = NEW.campaign_profile_id
              AND t.linked_training_module_id = NEW.module_id
              AND a.status IN ('assigned', 'in_progress', 'blocked')
        LOOP
            UPDATE public.volunteer_task_assignments
            SET status = 'completed', completed_at = now()
            WHERE id = aid;

            INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
            VALUES (aid, 'completed', NULL, '{"source":"training_module"}'::jsonb);

            PERFORM public.volunteer_apply_task_completion(aid);
        END LOOP;

        PERFORM public.volunteer_sync_tasks_for_profile(NEW.campaign_profile_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_volunteer_training_complete_tasks ON public.workspace_profile_training;
CREATE TRIGGER tr_volunteer_training_complete_tasks
    AFTER INSERT OR UPDATE ON public.workspace_profile_training
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_volunteer_training_complete_tasks();

-- ---------------------------------------------------------------------------
-- Supervisor reporting view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.volunteer_supervisor_task_assignments_v AS
SELECT
    st.supervisor_profile_id,
    a.id AS assignment_id,
    a.assignee_profile_id,
    a.status,
    a.assigned_at,
    a.due_at,
    a.completed_at,
    t.title,
    t.task_type,
    t.template_key
FROM public.volunteer_supervisor_teams st
JOIN public.power5_team_memberships m
    ON m.team_id = st.team_id
JOIN public.volunteer_task_assignments a
    ON a.assignee_profile_id = m.profile_id
JOIN public.volunteer_tasks t ON t.id = a.task_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_task_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_supervisor_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_task_templates_select ON public.volunteer_task_templates;
CREATE POLICY volunteer_task_templates_select ON public.volunteer_task_templates
    FOR SELECT TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS volunteer_tasks_select_scope ON public.volunteer_tasks;
CREATE POLICY volunteer_tasks_select_scope ON public.volunteer_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.volunteer_task_assignments a
            JOIN public.campaign_profiles cp ON cp.id = a.assignee_profile_id
            WHERE a.task_id = volunteer_tasks.id
              AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.volunteer_task_assignments a
            JOIN public.volunteer_supervisor_teams st ON st.supervisor_profile_id = (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
            )
            JOIN public.power5_team_memberships m
                ON m.team_id = st.team_id AND m.profile_id = a.assignee_profile_id
            WHERE a.task_id = volunteer_tasks.id
        )
    );

DROP POLICY IF EXISTS volunteer_task_assignments_select_scope ON public.volunteer_task_assignments;
CREATE POLICY volunteer_task_assignments_select_scope ON public.volunteer_task_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = volunteer_task_assignments.assignee_profile_id
              AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.volunteer_supervisor_teams st
            WHERE st.supervisor_profile_id = (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
            )
            JOIN public.power5_team_memberships m
                ON m.team_id = st.team_id
               AND m.profile_id = volunteer_task_assignments.assignee_profile_id
        )
    );

DROP POLICY IF EXISTS volunteer_task_events_select_scope ON public.volunteer_task_events;
CREATE POLICY volunteer_task_events_select_scope ON public.volunteer_task_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.volunteer_task_assignments a
            JOIN public.campaign_profiles cp ON cp.id = a.assignee_profile_id
            WHERE a.id = volunteer_task_events.assignment_id
              AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.volunteer_task_assignments a
            JOIN public.volunteer_supervisor_teams st ON st.supervisor_profile_id = (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
            )
            JOIN public.power5_team_memberships m
                ON m.team_id = st.team_id AND m.profile_id = a.assignee_profile_id
            WHERE a.id = volunteer_task_events.assignment_id
        )
    );

DROP POLICY IF EXISTS volunteer_task_groups_select ON public.volunteer_task_groups;
CREATE POLICY volunteer_task_groups_select ON public.volunteer_task_groups
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS volunteer_task_group_items_select ON public.volunteer_task_group_items;
CREATE POLICY volunteer_task_group_items_select ON public.volunteer_task_group_items
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS volunteer_engagement_scores_own ON public.volunteer_engagement_scores;
CREATE POLICY volunteer_engagement_scores_own ON public.volunteer_engagement_scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = volunteer_engagement_scores.campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS volunteer_supervisor_teams_select ON public.volunteer_supervisor_teams;
CREATE POLICY volunteer_supervisor_teams_select ON public.volunteer_supervisor_teams
    FOR SELECT TO authenticated
    USING (
        supervisor_profile_id = (
            SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

GRANT SELECT ON public.volunteer_task_templates TO authenticated;
GRANT SELECT ON public.volunteer_tasks TO authenticated;
GRANT SELECT ON public.volunteer_task_assignments TO authenticated;
GRANT SELECT ON public.volunteer_task_events TO authenticated;
GRANT SELECT ON public.volunteer_task_groups TO authenticated;
GRANT SELECT ON public.volunteer_task_group_items TO authenticated;
GRANT SELECT ON public.volunteer_engagement_scores TO authenticated;
GRANT SELECT ON public.volunteer_supervisor_teams TO authenticated;
GRANT SELECT ON public.volunteer_supervisor_task_assignments_v TO authenticated;

CREATE OR REPLACE FUNCTION public.volunteer_assign_task(
    p_assignee_profile_id uuid,
    p_template_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    IF actor IS DISTINCT FROM p_assignee_profile_id
       AND NOT public.volunteer_supervisor_covers_assignee(actor, p_assignee_profile_id) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    RETURN public.volunteer_enqueue_from_template(
        p_assignee_profile_id,
        p_template_key,
        actor
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.volunteer_sync_tasks_for_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_assign_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_assignment_mark_started(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_assignment_complete(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_assignment_skip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_supervisor_set_blocked(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_supervisor_reassign(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_supervisor_nudge(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed templates (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.volunteer_task_templates (
    template_key, title, description,
    default_task_type, default_priority, default_estimated_minutes,
    linked_onboarding_momentum, linked_power5_trigger, linked_training_module_id,
    allow_repeat
)
VALUES
    (
        'onboarding_first_action',
        'One small win today',
        'Open Agent Jones or your workspace snapshot and confirm you are in — that counts as showing up for the mission.',
        'onboarding', 'high', 5,
        NULL, NULL, NULL, false
    ),
    (
        'onboarding_choose_direction',
        'Choose your lane',
        'Pick how you want to help this week — people, place, behind the scenes, or signal boosting. No wrong answers.',
        'onboarding', 'high', 10,
        'exploring', NULL, NULL, false
    ),
    (
        'onboarding_first_micro_commitment',
        'Lock one micro-commitment',
        'Name a tiny step you can finish in under 30 minutes — text one friend, RSVP to something local, or share one honest post.',
        'onboarding', 'medium', 15,
        'committed', NULL, NULL, false
    ),
    (
        'power5_identify_five',
        'Sketch your Power of 5',
        'Write down five people you actually know — neighbors, coworkers, cousins. We are building trust, not a spreadsheet.',
        'power5', 'high', 20,
        NULL, 'pre_network', NULL, false
    ),
    (
        'power5_contact_first_person',
        'Reach your first person',
        'One honest check-in with someone on your list — voice or text, your words.',
        'power5', 'high', 25,
        NULL, 'first_node', NULL, true
    ),
    (
        'power5_follow_up_contact',
        'Follow up with heart',
        'Circle back on the conversation you started — confirm details, answer a question, or offer a simple next step.',
        'power5', 'medium', 20,
        NULL, 'contact_logged', NULL, true
    ),
    (
        'power5_invite_to_join',
        'Invite someone closer',
        'Share your recruit link or invite them to a small gathering — keep it personal and pressure-free.',
        'power5', 'medium', 15,
        NULL, 'invite_created', NULL, true
    ),
    (
        'training_complete_intro',
        'Finish Volunteer Basics',
        'Skim the intro module so we speak the same language on safety, data, and respectful voter contact.',
        'training', 'medium', 25,
        NULL, NULL,
        (SELECT id FROM public.workspace_training_modules WHERE title = 'Volunteer Basics' LIMIT 1),
        false
    ),
    (
        'training_complete_lane',
        'Complete your lane module',
        'Open the toolkit module that matches how you work — canvass, remote, or HQ support.',
        'training', 'medium', 30,
        NULL, NULL,
        (SELECT id FROM public.workspace_training_modules WHERE title = 'Canvass toolkit' LIMIT 1),
        false
    ),
    (
        'event_attend_local',
        'Show up locally once',
        'Attend a community touchpoint — farmers market, town hall, club meeting. Listen more than you talk.',
        'event', 'medium', 45,
        NULL, NULL, NULL, true
    ),
    (
        'event_host_small_gathering',
        'Host a tiny gathering',
        'Three to five people, coffee or porch — share why this race matters to you.',
        'event', 'low', 60,
        NULL, NULL, NULL, true
    ),
    (
        'outreach_text_two_people',
        'Text two people you trust',
        'Two short, personal messages — no blast copy. One link max if HQ provided it.',
        'outreach', 'medium', 20,
        NULL, NULL, NULL, true
    ),
    (
        'outreach_call_one_person',
        'Call one person on your list',
        'Five-minute human conversation — ask how they are, then share why you are in.',
        'outreach', 'medium', 15,
        NULL, NULL, NULL, true
    )
ON CONFLICT (template_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    default_task_type = EXCLUDED.default_task_type,
    default_priority = EXCLUDED.default_priority,
    default_estimated_minutes = EXCLUDED.default_estimated_minutes,
    linked_onboarding_momentum = EXCLUDED.linked_onboarding_momentum,
    linked_power5_trigger = EXCLUDED.linked_power5_trigger,
    linked_training_module_id = COALESCE(
        EXCLUDED.linked_training_module_id,
        public.volunteer_task_templates.linked_training_module_id
    ),
    allow_repeat = EXCLUDED.allow_repeat;
