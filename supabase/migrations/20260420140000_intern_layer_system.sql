-- Intern layer: contact pipeline, assignments, leadership dailies, decline + reassignment.
-- Uses campaign_profile_id throughout (intern / volunteer / coordinator).

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intern_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    volunteer_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assignment_status text NOT NULL DEFAULT 'active'
        CHECK (assignment_status IN ('active', 'reassigned', 'escalated', 'completed')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intern_assignments_intern_active_idx
    ON public.intern_assignments (intern_profile_id, assignment_status);
CREATE INDEX IF NOT EXISTS intern_assignments_volunteer_idx
    ON public.intern_assignments (volunteer_profile_id);

CREATE TABLE IF NOT EXISTS public.volunteer_contact_pipeline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    current_intern_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    first_contact_due_at timestamptz NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    last_attempt_at timestamptz,
    next_action_due_at timestamptz,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'placed', 'inactive', 'escalated')),
    escalation_level smallint NOT NULL DEFAULT 0 CHECK (escalation_level >= 0 AND escalation_level <= 5),
    reassignment_count smallint NOT NULL DEFAULT 0 CHECK (reassignment_count >= 0 AND reassignment_count <= 10),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_contact_pipeline_one_volunteer UNIQUE (volunteer_profile_id)
);

CREATE INDEX IF NOT EXISTS volunteer_contact_pipeline_intern_idx
    ON public.volunteer_contact_pipeline (current_intern_profile_id, status);
CREATE INDEX IF NOT EXISTS volunteer_contact_pipeline_due_idx
    ON public.volunteer_contact_pipeline (first_contact_due_at, status);

CREATE TABLE IF NOT EXISTS public.volunteer_contact_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id uuid NOT NULL REFERENCES public.volunteer_contact_pipeline (id) ON DELETE CASCADE,
    intern_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    attempt_number integer NOT NULL CHECK (attempt_number >= 1),
    contact_method text NOT NULL CHECK (contact_method IN ('call', 'text', 'email')),
    outcome text NOT NULL CHECK (outcome IN ('no_answer', 'left_message', 'spoke', 'scheduled_followup')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_contact_attempts_pipeline_idx
    ON public.volunteer_contact_attempts (pipeline_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.intern_leadership_progress (
    intern_profile_id uuid PRIMARY KEY REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    current_stage text NOT NULL DEFAULT 'building' CHECK (length(trim(current_stage)) > 0 AND length(current_stage) <= 64),
    tasks_completed integer NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    last_activity_at timestamptz,
    readiness_score numeric(6, 2) NOT NULL DEFAULT 0 CHECK (readiness_score >= 0 AND readiness_score <= 100),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intern_leadership_mission_day (
    intern_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    mission_date date NOT NULL,
    assignment_id uuid REFERENCES public.volunteer_task_assignments (id) ON DELETE SET NULL,
    template_key text NOT NULL,
    PRIMARY KEY (intern_profile_id, mission_date)
);

-- ---------------------------------------------------------------------------
-- Task assignments: decline + pipeline link
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS decline_reason text,
    ADD COLUMN IF NOT EXISTS context_pipeline_id uuid REFERENCES public.volunteer_contact_pipeline (id) ON DELETE SET NULL;

ALTER TABLE public.volunteer_task_assignments
    DROP CONSTRAINT IF EXISTS volunteer_task_assignments_status_check;

ALTER TABLE public.volunteer_task_assignments
    ADD CONSTRAINT volunteer_task_assignments_status_check CHECK (
        status IN ('assigned', 'in_progress', 'completed', 'blocked', 'skipped', 'declined')
    );

ALTER TABLE public.volunteer_task_events
    DROP CONSTRAINT IF EXISTS volunteer_task_events_event_type_check;

ALTER TABLE public.volunteer_task_events
    ADD CONSTRAINT volunteer_task_events_event_type_check CHECK (
        event_type IN (
            'assigned',
            'started',
            'claimed',
            'paused',
            'completed',
            'blocked',
            'skipped',
            'reassigned',
            'nudge',
            'declined'
        )
    );

-- ---------------------------------------------------------------------------
-- Pick intern (least active assignments)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intern_pick_round_robin_intern(p_exclude uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT cp.id
    FROM public.campaign_profiles cp
    WHERE lower(trim(coalesce(cp.primary_role, ''))) = 'intern'
      AND (p_exclude IS NULL OR cp.id IS DISTINCT FROM p_exclude)
    ORDER BY (
        SELECT count(*)::integer
        FROM public.intern_assignments ia
        WHERE ia.intern_profile_id = cp.id
          AND ia.assignment_status = 'active'
    ), random()
    LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap pipeline when volunteer sets branch (trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intern_bootstrap_pipeline(p_volunteer uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pid uuid;
    iid uuid;
    aid uuid;
    role text;
BEGIN
    SELECT lower(trim(coalesce(primary_role, ''))) INTO role
    FROM public.campaign_profiles WHERE id = p_volunteer;

    IF role IN ('intern', 'coordinator', 'staff', 'admin') THEN
        RETURN NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.volunteer_contact_pipeline WHERE volunteer_profile_id = p_volunteer
    ) THEN
        SELECT id INTO pid FROM public.volunteer_contact_pipeline
        WHERE volunteer_profile_id = p_volunteer;
        RETURN pid;
    END IF;

    iid := public.intern_pick_round_robin_intern(NULL);

    INSERT INTO public.volunteer_contact_pipeline (
        volunteer_profile_id,
        current_intern_profile_id,
        assigned_at,
        first_contact_due_at,
        next_action_due_at,
        status,
        escalation_level,
        attempt_count,
        reassignment_count,
        updated_at
    )
    VALUES (
        p_volunteer,
        iid,
        now(),
        now() + interval '72 hours',
        now() + interval '72 hours',
        'pending',
        0,
        0,
        0,
        now()
    )
    RETURNING id INTO pid;

    IF iid IS NOT NULL THEN
        INSERT INTO public.intern_assignments (
            intern_profile_id, volunteer_profile_id, assignment_status
        )
        VALUES (iid, p_volunteer, 'active');

        aid := public.volunteer_enqueue_from_template(iid, 'intern_call_new_volunteer', NULL);
        IF aid IS NOT NULL THEN
            UPDATE public.volunteer_task_assignments
            SET context_pipeline_id = pid
            WHERE id = aid;
        END IF;
    END IF;

    RETURN pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_intern_on_volunteer_branch_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.onboarding_branch IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        PERFORM public.intern_bootstrap_pipeline(NEW.id);
    ELSIF OLD.onboarding_branch IS DISTINCT FROM NEW.onboarding_branch THEN
        PERFORM public.intern_bootstrap_pipeline(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_intern_pipeline_on_profile ON public.campaign_profiles;
CREATE TRIGGER tr_intern_pipeline_on_profile
    AFTER INSERT OR UPDATE OF onboarding_branch ON public.campaign_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_intern_on_volunteer_branch_set();

-- ---------------------------------------------------------------------------
-- Contact attempts + pipeline updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intern_log_contact_attempt(
    p_pipeline_id uuid,
    p_contact_method text,
    p_outcome text,
    p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pl public.volunteer_contact_pipeline%ROWTYPE;
    n integer;
    aid uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT * INTO pl FROM public.volunteer_contact_pipeline WHERE id = p_pipeline_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'pipeline not found';
    END IF;

    IF pl.current_intern_profile_id IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    n := pl.attempt_count + 1;

    INSERT INTO public.volunteer_contact_attempts (
        pipeline_id, intern_profile_id, attempt_number, contact_method, outcome, notes
    )
    VALUES (p_pipeline_id, actor, n, p_contact_method, p_outcome, left(coalesce(p_notes, ''), 2000))
    RETURNING id INTO aid;

    UPDATE public.volunteer_contact_pipeline
    SET
        attempt_count = n,
        last_attempt_at = now(),
        updated_at = now(),
        status = CASE
            WHEN p_outcome IN ('spoke', 'scheduled_followup') THEN 'contacted'
            ELSE pl.status
        END,
        next_action_due_at = CASE
            WHEN p_outcome = 'scheduled_followup' THEN now() + interval '48 hours'
            ELSE pl.next_action_due_at
        END
    WHERE id = p_pipeline_id;

    RETURN aid;
END;
$$;

CREATE OR REPLACE FUNCTION public.intern_mark_pipeline_placed(p_pipeline_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pl public.volunteer_contact_pipeline%ROWTYPE;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    SELECT * INTO pl FROM public.volunteer_contact_pipeline WHERE id = p_pipeline_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'not found';
    END IF;
    IF pl.current_intern_profile_id IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_contact_pipeline
    SET status = 'placed', updated_at = now(), next_action_due_at = NULL
    WHERE id = p_pipeline_id;

    UPDATE public.intern_assignments
    SET assignment_status = 'completed'
    WHERE volunteer_profile_id = pl.volunteer_profile_id
      AND intern_profile_id = actor
      AND assignment_status = 'active';
END;
$$;

-- ---------------------------------------------------------------------------
-- Reassign / escalate (deterministic)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intern_reassign_pipeline(p_pipeline_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pl public.volunteer_contact_pipeline%ROWTYPE;
    old_i uuid;
    new_i uuid;
    aid uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT * INTO pl FROM public.volunteer_contact_pipeline WHERE id = p_pipeline_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'not found';
    END IF;

    IF pl.current_intern_profile_id IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, pl.volunteer_profile_id) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    IF pl.status IN ('placed', 'inactive', 'escalated') THEN
        RETURN;
    END IF;

    old_i := pl.current_intern_profile_id;
    new_i := public.intern_pick_round_robin_intern(old_i);

    UPDATE public.intern_assignments
    SET assignment_status = 'reassigned'
    WHERE volunteer_profile_id = pl.volunteer_profile_id
      AND assignment_status = 'active'
      AND intern_profile_id IS NOT DISTINCT FROM old_i;

    UPDATE public.volunteer_contact_pipeline
    SET
        current_intern_profile_id = new_i,
        reassignment_count = pl.reassignment_count + 1,
        first_contact_due_at = now() + interval '72 hours',
        next_action_due_at = now() + interval '72 hours',
        escalation_level = CASE WHEN pl.reassignment_count + 1 >= 1 THEN 1 ELSE pl.escalation_level END,
        updated_at = now()
    WHERE id = p_pipeline_id;

    IF new_i IS NOT NULL THEN
        INSERT INTO public.intern_assignments (intern_profile_id, volunteer_profile_id, assignment_status)
        VALUES (new_i, pl.volunteer_profile_id, 'active');

        aid := public.volunteer_enqueue_from_template(new_i, 'intern_call_new_volunteer', NULL);
        IF aid IS NOT NULL THEN
            UPDATE public.volunteer_task_assignments
            SET context_pipeline_id = p_pipeline_id
            WHERE id = aid;
        END IF;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.intern_escalate_pipeline(p_pipeline_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pl public.volunteer_contact_pipeline%ROWTYPE;
    coord uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT * INTO pl FROM public.volunteer_contact_pipeline WHERE id = p_pipeline_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'not found';
    END IF;

    IF pl.current_intern_profile_id IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, pl.volunteer_profile_id) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.intern_assignments
    SET assignment_status = 'escalated'
    WHERE volunteer_profile_id = pl.volunteer_profile_id AND assignment_status = 'active';

    UPDATE public.volunteer_contact_pipeline
    SET
        status = 'escalated',
        escalation_level = 3,
        current_intern_profile_id = NULL,
        updated_at = now()
    WHERE id = p_pipeline_id;

    SELECT cp.id INTO coord
    FROM public.campaign_profiles cp
    WHERE lower(trim(coalesce(cp.primary_role, ''))) = 'coordinator'
    ORDER BY random()
    LIMIT 1;

    IF coord IS NOT NULL THEN
        PERFORM public.volunteer_enqueue_from_template(coord, 'intern_pipeline_escalated_coordinator', NULL);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.intern_evaluate_pipeline(p_pipeline_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pl public.volunteer_contact_pipeline%ROWTYPE;
    due_reassign timestamptz;
BEGIN
    IF actor IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;

    SELECT * INTO pl FROM public.volunteer_contact_pipeline WHERE id = p_pipeline_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF pl.current_intern_profile_id IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, pl.volunteer_profile_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;

    IF pl.status NOT IN ('pending', 'contacted') THEN
        RETURN jsonb_build_object('ok', true, 'action', 'none', 'status', pl.status);
    END IF;

    due_reassign := pl.first_contact_due_at + interval '24 hours';

    IF pl.attempt_count = 0 AND now() > pl.first_contact_due_at THEN
        UPDATE public.volunteer_contact_pipeline
        SET escalation_level = greatest(escalation_level, 1), updated_at = now()
        WHERE id = p_pipeline_id;
    END IF;

    IF now() > due_reassign AND pl.status = 'pending' AND pl.attempt_count = 0 THEN
        IF pl.reassignment_count >= 3 THEN
            PERFORM public.intern_escalate_pipeline(p_pipeline_id);
            RETURN jsonb_build_object('ok', true, 'action', 'escalated');
        END IF;
        PERFORM public.intern_reassign_pipeline(p_pipeline_id);
        RETURN jsonb_build_object('ok', true, 'action', 'reassigned');
    END IF;

    IF pl.status = 'contacted' AND pl.next_action_due_at IS NOT NULL AND now() > pl.next_action_due_at THEN
        PERFORM public.volunteer_enqueue_from_template(
            pl.current_intern_profile_id,
            'intern_follow_up_volunteer',
            NULL
        );
        UPDATE public.volunteer_contact_pipeline
        SET next_action_due_at = now() + interval '48 hours', updated_at = now()
        WHERE id = p_pipeline_id;
        RETURN jsonb_build_object('ok', true, 'action', 'follow_up_enqueued');
    END IF;

    RETURN jsonb_build_object('ok', true, 'action', 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.intern_evaluate_all_for_actor()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    n integer := 0;
    r record;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    FOR r IN
        SELECT id FROM public.volunteer_contact_pipeline
        WHERE current_intern_profile_id = actor
          AND status IN ('pending', 'contacted')
    LOOP
        PERFORM public.intern_evaluate_pipeline(r.id);
        n := n + 1;
    END LOOP;
    RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Decline intern task → immediate reassignment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_assignment_decline(
    p_assignment_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
    pid uuid;
    tk text;
    n integer;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT a.assignee_profile_id, a.context_pipeline_id, t.template_key
    INTO assignee, pid, tk
    FROM public.volunteer_task_assignments a
    JOIN public.volunteer_tasks t ON t.id = a.task_id
    WHERE a.id = p_assignment_id;

    IF assignee IS NULL THEN
        RAISE EXCEPTION 'not found';
    END IF;

    IF assignee IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET
        status = 'declined',
        decline_reason = left(coalesce(p_reason, ''), 500),
        completed_at = now()
    WHERE id = p_assignment_id AND status IN ('assigned', 'in_progress', 'blocked');

    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
        RETURN;
    END IF;

    INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
    VALUES (
        p_assignment_id,
        'declined',
        actor,
        jsonb_build_object('reason', coalesce(p_reason, ''))
    );

    IF pid IS NOT NULL AND tk LIKE 'intern_%' THEN
        PERFORM public.intern_reassign_pipeline(pid);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Daily leadership mission for interns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intern_ensure_daily_leadership(p_intern uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    d date := (timezone('utc', now()))::date;
    keys text[] := ARRAY[
        'intern_ld_check_in_new_volunteer',
        'intern_ld_mentor_one_volunteer',
        'intern_ld_review_team_progress',
        'intern_ld_help_complete_task',
        'intern_ld_escalate_issue_properly'
    ];
    idx integer;
    tpl text;
    aid uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.campaign_profiles cp
        WHERE cp.id = p_intern AND lower(trim(coalesce(cp.primary_role, ''))) = 'intern'
    ) THEN
        RETURN NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.intern_leadership_mission_day
        WHERE intern_profile_id = p_intern AND mission_date = d
    ) THEN
        SELECT assignment_id INTO aid FROM public.intern_leadership_mission_day
        WHERE intern_profile_id = p_intern AND mission_date = d;
        RETURN aid;
    END IF;

    idx := 1 + (abs(hashtext(p_intern::text || d::text)) % array_length(keys, 1));
    tpl := keys[idx];

    aid := public.volunteer_enqueue_from_template(p_intern, tpl, NULL);

    INSERT INTO public.intern_leadership_mission_day (intern_profile_id, mission_date, assignment_id, template_key)
    VALUES (p_intern, d, aid, tpl)
    ON CONFLICT (intern_profile_id, mission_date) DO NOTHING;

    INSERT INTO public.intern_leadership_progress (intern_profile_id, last_activity_at, updated_at)
    VALUES (p_intern, now(), now())
    ON CONFLICT (intern_profile_id) DO UPDATE SET
        last_activity_at = now(),
        updated_at = now();

    RETURN aid;
END;
$$;

CREATE OR REPLACE FUNCTION public.intern_assign_volunteer_to_intern(
    p_volunteer uuid,
    p_intern uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    pid uuid;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    IF actor IS DISTINCT FROM p_intern
       AND NOT public.volunteer_supervisor_covers_assignee(actor, p_volunteer)
       AND NOT public.volunteer_supervisor_covers_assignee(actor, p_intern) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM volunteer_contact_pipeline WHERE volunteer_profile_id = p_volunteer) THEN
        pid := public.intern_bootstrap_pipeline(p_volunteer);
    ELSE
        SELECT id INTO pid FROM volunteer_contact_pipeline WHERE volunteer_profile_id = p_volunteer;
        UPDATE volunteer_contact_pipeline
        SET current_intern_profile_id = p_intern, updated_at = now()
        WHERE id = pid;
    END IF;

    RETURN pid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Supervisor overview (data layer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.supervisor_intern_overview(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller uuid;
    ok boolean := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT c.id INTO caller FROM public.campaign_profiles c WHERE c.user_id = auth.uid() LIMIT 1;
    IF caller IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT true INTO ok
    FROM public.power5_team_memberships m
    WHERE m.team_id = p_team_id AND m.profile_id = caller
    LIMIT 1;

    IF NOT coalesce(ok, false) THEN
        SELECT true INTO ok
        FROM public.campaign_profiles c2
        WHERE c2.id = caller AND c2.power5_home_team_id IS NOT DISTINCT FROM p_team_id
        LIMIT 1;
    END IF;

    IF NOT coalesce(ok, false) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    RETURN jsonb_build_object(
        'intern_profiles', coalesce((
            SELECT jsonb_agg(cp.id ORDER BY cp.id)
            FROM public.campaign_profiles cp
            WHERE cp.power5_home_team_id = p_team_id
              AND lower(trim(coalesce(cp.primary_role, ''))) = 'intern'
        ), '[]'::jsonb),
        'pipelines_active', (
            SELECT count(*)::integer FROM public.volunteer_contact_pipeline p
            JOIN public.campaign_profiles cp ON cp.id = p.volunteer_profile_id
            WHERE cp.power5_home_team_id = p_team_id
              AND p.status IN ('pending', 'contacted')
        ),
        'pipelines_escalated', (
            SELECT count(*)::integer FROM public.volunteer_contact_pipeline p
            JOIN public.campaign_profiles cp ON cp.id = p.volunteer_profile_id
            WHERE cp.power5_home_team_id = p_team_id
              AND p.status = 'escalated'
        ),
        'overdue_first_contact', (
            SELECT count(*)::integer FROM public.volunteer_contact_pipeline p
            JOIN public.campaign_profiles cp ON cp.id = p.volunteer_profile_id
            WHERE cp.power5_home_team_id = p_team_id
              AND p.status = 'pending'
              AND now() > p.first_contact_due_at
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Templates (intern mission + leadership + coordinator escalation)
-- ---------------------------------------------------------------------------
INSERT INTO public.volunteer_task_templates (
    template_key, title, description, default_task_type, default_priority,
    default_difficulty, default_estimated_minutes, required_role, allow_repeat, is_active, workspace_spec
)
VALUES
    (
        'intern_call_new_volunteer',
        'Call new volunteer',
        'Introduce yourself, confirm their lane interest, offer one clear next step. Keep it human and short.',
        'onboarding', 'high', 3, 20, 'intern', false, true,
        '{"title":"Call script","sections":[{"id":"open","title":"Opener","body":"Hi — I am your intern contact for the campaign. I am here to help you get oriented, not to pressure you.","checklist":["Confirm they have a minute","Thank them for signing up"]},{"id":"discover","title":"Listen","body":"Ask what drew them in and what time they have this week.","checklist":["One open question","Note lane fit (talk / show up / behind scenes / spread word)"]},{"id":"close","title":"Close","body":"Offer one tiny next step and how to reach you if stuck.","checklist":["Confirm follow-up window","Point to dashboard if they are ready"]}]}'::jsonb
    ),
    (
        'intern_follow_up_volunteer',
        'Follow up volunteer',
        'Check in on their last conversation — did they get what they needed?',
        'onboarding', 'medium', 2, 15, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_place_volunteer_in_lane',
        'Place volunteer in lane',
        'Help them pick a lane and one concrete first action that fits their life.',
        'onboarding', 'medium', 3, 25, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_check_in_volunteer',
        'Check in with assigned volunteer',
        'Quick wellness + momentum check. Celebrate; unblock if stuck.',
        'onboarding', 'low', 2, 12, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_ld_check_in_new_volunteer',
        'Leadership: check-in habit',
        'Review one new volunteer you contacted this week — what went well, what to improve?',
        'admin', 'medium', 2, 15, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_ld_mentor_one_volunteer',
        'Leadership: mentor one volunteer',
        'Spend 15 minutes helping one volunteer with a single blocker.',
        'admin', 'medium', 3, 20, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_ld_review_team_progress',
        'Leadership: review team progress',
        'Skim your pod’s wins and one ask for the week — no shame, just clarity.',
        'admin', 'low', 2, 15, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_ld_help_complete_task',
        'Leadership: unblock a task',
        'Pair with someone for 10 minutes to finish one checklist item.',
        'admin', 'medium', 3, 15, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_ld_escalate_issue_properly',
        'Leadership: escalate cleanly',
        'Write a 3-line summary: situation, what you tried, what you need from leadership.',
        'admin', 'high', 2, 15, 'intern', true, true,
        '{}'::jsonb
    ),
    (
        'intern_pipeline_escalated_coordinator',
        'Escalated: new volunteer pipeline',
        'A volunteer contact pipeline hit max reassignments. Review and assign a human path.',
        'admin', 'urgent', 4, 20, 'coordinator', true, true,
        '{}'::jsonb
    )
ON CONFLICT (template_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    default_task_type = EXCLUDED.default_task_type,
    default_priority = EXCLUDED.default_priority,
    default_difficulty = EXCLUDED.default_difficulty,
    default_estimated_minutes = EXCLUDED.default_estimated_minutes,
    required_role = EXCLUDED.required_role,
    allow_repeat = EXCLUDED.allow_repeat,
    is_active = EXCLUDED.is_active,
    workspace_spec = EXCLUDED.workspace_spec;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.intern_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_contact_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_contact_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_leadership_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_leadership_mission_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intern_assignments_select ON public.intern_assignments;
CREATE POLICY intern_assignments_select ON public.intern_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = intern_assignments.intern_profile_id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = intern_assignments.volunteer_profile_id AND cp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS volunteer_contact_pipeline_select ON public.volunteer_contact_pipeline;
CREATE POLICY volunteer_contact_pipeline_select ON public.volunteer_contact_pipeline
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = volunteer_contact_pipeline.volunteer_profile_id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = volunteer_contact_pipeline.current_intern_profile_id AND cp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS volunteer_contact_attempts_select ON public.volunteer_contact_attempts;
CREATE POLICY volunteer_contact_attempts_select ON public.volunteer_contact_attempts
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = volunteer_contact_attempts.intern_profile_id AND cp.user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.volunteer_contact_pipeline p
            JOIN public.campaign_profiles cp ON cp.id = p.volunteer_profile_id
            WHERE p.id = volunteer_contact_attempts.pipeline_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS intern_leadership_progress_select ON public.intern_leadership_progress;
CREATE POLICY intern_leadership_progress_select ON public.intern_leadership_progress
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = intern_leadership_progress.intern_profile_id AND cp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS intern_leadership_mission_day_select ON public.intern_leadership_mission_day;
CREATE POLICY intern_leadership_mission_day_select ON public.intern_leadership_mission_day
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.campaign_profiles cp WHERE cp.id = intern_leadership_mission_day.intern_profile_id AND cp.user_id = auth.uid())
    );

GRANT SELECT ON public.intern_assignments TO authenticated;
GRANT SELECT ON public.volunteer_contact_pipeline TO authenticated;
GRANT SELECT ON public.volunteer_contact_attempts TO authenticated;
GRANT SELECT ON public.intern_leadership_progress TO authenticated;
GRANT SELECT ON public.intern_leadership_mission_day TO authenticated;

GRANT EXECUTE ON FUNCTION public.intern_log_contact_attempt(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_mark_pipeline_placed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_evaluate_pipeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_evaluate_all_for_actor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_reassign_pipeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_escalate_pipeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volunteer_assignment_decline(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_ensure_daily_leadership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intern_assign_volunteer_to_intern(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supervisor_intern_overview(uuid) TO authenticated;
