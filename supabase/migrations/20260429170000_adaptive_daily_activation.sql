-- Adaptive Daily Activation: lane metrics, behavior signals, lane scores, weighted templates,
-- multi-task missions (same lane allowed), deterministic weighted assignment. Communications always included.
-- MUST run after 20260429160000_daily_activation_engine.sql (creates daily_* tables + user_scores).

-- ---------------------------------------------------------------------------
-- Template weighting & progression
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_task_templates
    ADD COLUMN IF NOT EXISTS lane_weight numeric(8, 4) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS difficulty_multiplier numeric(8, 4) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS progression_level text NOT NULL DEFAULT 'new';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'daily_task_templates_progression_level_check'
    ) THEN
        ALTER TABLE public.daily_task_templates
            ADD CONSTRAINT daily_task_templates_progression_level_check
            CHECK (progression_level IN ('new', 'intermediate', 'advanced'));
    END IF;
END $$;

UPDATE public.daily_task_templates
SET
    difficulty_multiplier = round((1 + (difficulty - 1) * 0.12)::numeric, 4),
    lane_weight = round((0.85 + (difficulty - 1) * 0.08)::numeric, 4),
    progression_level = CASE
        WHEN difficulty <= 2 THEN 'new'
        WHEN difficulty = 3 THEN 'intermediate'
        ELSE 'advanced'
    END
WHERE difficulty_multiplier = 1 AND lane_weight = 1 AND progression_level = 'new';

-- ---------------------------------------------------------------------------
-- daily_tasks: timing + drop one-task-per-lane (allow 4–6 tasks, duplicate lanes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_tasks
    ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.daily_tasks DROP CONSTRAINT IF EXISTS daily_tasks_mission_lane_unique;

CREATE INDEX IF NOT EXISTS daily_tasks_mission_lane_idx
    ON public.daily_tasks (mission_id, lane);

-- ---------------------------------------------------------------------------
-- user_lane_metrics (campaign_profile_id = app "user" linkage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lane_metrics (
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    lane text NOT NULL CHECK (lane IN ('communications', 'voter', 'events', 'leadership')),
    tasks_completed integer NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    tasks_assigned integer NOT NULL DEFAULT 0 CHECK (tasks_assigned >= 0),
    completion_rate numeric(8, 6) NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 1),
    avg_completion_time_seconds numeric(14, 4),
    last_activity_at timestamptz,
    PRIMARY KEY (campaign_profile_id, lane)
);

CREATE INDEX IF NOT EXISTS user_lane_metrics_profile_idx
    ON public.user_lane_metrics (campaign_profile_id);

-- ---------------------------------------------------------------------------
-- user_behavior_signals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_behavior_signals (
    campaign_profile_id uuid PRIMARY KEY REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    reliability_score numeric(8, 2) NOT NULL DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    consistency_score numeric(8, 2) NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
    momentum_score numeric(8, 2) NOT NULL DEFAULT 0 CHECK (momentum_score >= 0 AND momentum_score <= 100),
    last_updated timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_lane_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lane_scores (
    campaign_profile_id uuid PRIMARY KEY REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    communications_score numeric(8, 2) NOT NULL DEFAULT 25 CHECK (communications_score >= 0 AND communications_score <= 100),
    voter_score numeric(8, 2) NOT NULL DEFAULT 25 CHECK (voter_score >= 0 AND voter_score <= 100),
    events_score numeric(8, 2) NOT NULL DEFAULT 25 CHECK (events_score >= 0 AND events_score <= 100),
    leadership_score numeric(8, 2) NOT NULL DEFAULT 25 CHECK (leadership_score >= 0 AND leadership_score <= 100),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Helpers: metrics bump
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_lane_metric_bump_assigned(p_profile_id uuid, p_lane text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_lane_metrics (
        campaign_profile_id, lane, tasks_assigned, tasks_completed, completion_rate
    )
    VALUES (p_profile_id, p_lane, 1, 0, 0)
    ON CONFLICT (campaign_profile_id, lane) DO UPDATE SET
        tasks_assigned = public.user_lane_metrics.tasks_assigned + 1,
        completion_rate = CASE
            WHEN public.user_lane_metrics.tasks_assigned + 1 > 0
            THEN (
                public.user_lane_metrics.tasks_completed::numeric
                / (public.user_lane_metrics.tasks_assigned + 1)::numeric
            )
            ELSE 0
        END;
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_lane_metric_bump_completed(
    p_profile_id uuid,
    p_lane text,
    p_seconds numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n integer;
BEGIN
    UPDATE public.user_lane_metrics
    SET
        tasks_completed = public.user_lane_metrics.tasks_completed + 1,
        completion_rate = (public.user_lane_metrics.tasks_completed + 1)::numeric
            / NULLIF(public.user_lane_metrics.tasks_assigned, 0)::numeric,
        avg_completion_time_seconds = CASE
            WHEN avg_completion_time_seconds IS NULL THEN round(p_seconds::numeric, 4)
            ELSE round((avg_completion_time_seconds * 0.65 + p_seconds * 0.35)::numeric, 4)
        END,
        last_activity_at = now()
    WHERE campaign_profile_id = p_profile_id AND lane = p_lane;

    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
        INSERT INTO public.user_lane_metrics (
            campaign_profile_id, lane, tasks_assigned, tasks_completed,
            completion_rate, avg_completion_time_seconds, last_activity_at
        )
        VALUES (
            p_profile_id, p_lane, 1, 1, 1,
            round(p_seconds::numeric, 4), now()
        );
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Recompute derived scores (deterministic heuristics)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_recompute_lane_scores(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    streak_days integer;
    n_recruits integer;
    sc_comm numeric := 25;
    sc_voter numeric := 25;
    sc_events numeric := 25;
    sc_lead numeric := 25;
    r record;
    recency_boost numeric;
    lb numeric;
BEGIN
    INSERT INTO public.user_lane_scores (campaign_profile_id)
    VALUES (p_profile_id)
    ON CONFLICT (campaign_profile_id) DO NOTHING;

    SELECT coalesce(us.activation_streak_days, 0) INTO streak_days
    FROM public.user_scores us WHERE us.campaign_profile_id = p_profile_id;

    SELECT count(*)::integer INTO n_recruits
    FROM public.power5_relationship_nodes n
    WHERE n.owner_profile_id = p_profile_id;

    streak_days := coalesce(streak_days, 0);
    n_recruits := coalesce(n_recruits, 0);

    FOR r IN
        SELECT * FROM public.user_lane_metrics WHERE campaign_profile_id = p_profile_id
    LOOP
        recency_boost := CASE
            WHEN r.last_activity_at IS NOT NULL
                AND r.last_activity_at > (timezone('utc', now()) - interval '7 days')
            THEN 12::numeric
            ELSE 0::numeric
        END;
        lb := least(22::numeric, n_recruits * 2.2);

        IF r.lane = 'communications' THEN
            sc_comm := least(
                100::numeric,
                greatest(
                    18::numeric,
                    coalesce(r.completion_rate, 0) * 52
                        + least(r.tasks_completed, 35)::numeric * 0.75
                        + recency_boost
                        + least(12::numeric, streak_days::numeric * 0.85)
                )
            );
        ELSIF r.lane = 'voter' THEN
            sc_voter := least(
                100::numeric,
                greatest(
                    12::numeric,
                    coalesce(r.completion_rate, 0) * 58
                        + least(r.tasks_completed, 40)::numeric * 0.9
                        + recency_boost
                        + least(14::numeric, streak_days::numeric * 0.9)
                )
            );
        ELSIF r.lane = 'events' THEN
            sc_events := least(
                100::numeric,
                greatest(
                    12::numeric,
                    coalesce(r.completion_rate, 0) * 58
                        + least(r.tasks_completed, 40)::numeric * 0.85
                        + recency_boost
                        + least(12::numeric, streak_days::numeric * 0.85)
                )
            );
        ELSIF r.lane = 'leadership' THEN
            sc_lead := least(
                100::numeric,
                greatest(
                    12::numeric,
                    coalesce(r.completion_rate, 0) * 50
                        + least(r.tasks_completed, 40)::numeric * 0.8
                        + recency_boost
                        + lb
                        + least(15::numeric, streak_days::numeric * 0.95)
                )
            );
        END IF;
    END LOOP;

    UPDATE public.user_lane_scores
    SET
        communications_score = round(sc_comm, 2),
        voter_score = round(sc_voter, 2),
        events_score = round(sc_events, 2),
        leadership_score = round(sc_lead, 2),
        updated_at = now()
    WHERE campaign_profile_id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_sync_activation_scores(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM public.campaign_profiles
           WHERE id = p_profile_id AND user_id = auth.uid()
       ) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;
    PERFORM public.daily_recompute_lane_scores(p_profile_id);
    PERFORM public.daily_recompute_behavior_signals(p_profile_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_recompute_behavior_signals(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    avg_cr numeric;
    act_days integer;
    wpts integer;
    dpts integer;
BEGIN
    SELECT coalesce(avg(m.completion_rate), 0) INTO avg_cr
    FROM public.user_lane_metrics m
    WHERE m.campaign_profile_id = p_profile_id AND m.tasks_assigned > 0;

    SELECT count(DISTINCT dm.mission_date)::integer INTO act_days
    FROM public.daily_missions dm
    INNER JOIN public.daily_tasks t ON t.mission_id = dm.id AND t.status = 'completed'
    WHERE dm.campaign_profile_id = p_profile_id;

    wpts := coalesce((
        SELECT weekly_points FROM public.user_scores WHERE campaign_profile_id = p_profile_id
    ), 0);
    dpts := coalesce((
        SELECT daily_points FROM public.user_scores WHERE campaign_profile_id = p_profile_id
    ), 0);

    INSERT INTO public.user_behavior_signals (campaign_profile_id, reliability_score, consistency_score, momentum_score, last_updated)
    VALUES (
        p_profile_id,
        round(least(100, avg_cr * 100)::numeric, 2),
        round(least(100, avg_cr * 65 + least(act_days * 2.5, 35))::numeric, 2),
        round(least(100, wpts::numeric / 2.2 + dpts::numeric / 1.5)::numeric, 2),
        now()
    )
    ON CONFLICT (campaign_profile_id) DO UPDATE SET
        reliability_score = EXCLUDED.reliability_score,
        consistency_score = EXCLUDED.consistency_score,
        momentum_score = EXCLUDED.momentum_score,
        last_updated = now();
END;
$$;

-- ---------------------------------------------------------------------------
-- Template pick: rotation + progression bands + easy/hard bias
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_pick_template_filtered(
    p_profile_id uuid,
    p_lane text,
    p_day date,
    p_progression_max text,
    p_bias text
) RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    tid uuid;
    max_ord smallint;
BEGIN
    max_ord := CASE p_progression_max
        WHEN 'new' THEN 0
        WHEN 'intermediate' THEN 1
        ELSE 2
    END;

    SELECT dt.id INTO tid
    FROM public.daily_task_templates dt
    WHERE dt.lane = p_lane
      AND dt.is_active
      AND CASE dt.progression_level
          WHEN 'new' THEN 0
          WHEN 'intermediate' THEN 1
          ELSE 2
      END <= max_ord
      AND (
          dt.platform_hint IS NULL
          OR EXISTS (
              SELECT 1 FROM public.user_social_platforms usp
              WHERE usp.campaign_profile_id = p_profile_id
                AND usp.is_active
                AND lower(usp.platform) = lower(dt.platform_hint)
          )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.daily_tasks tsk
          INNER JOIN public.daily_missions dm ON dm.id = tsk.mission_id
          WHERE dm.campaign_profile_id = p_profile_id
            AND dm.mission_date >= p_day - 6
            AND tsk.task_template_id = dt.id
      )
    ORDER BY
        CASE p_bias
            WHEN 'easy' THEN dt.difficulty
            WHEN 'hard' THEN -dt.difficulty
            ELSE 0
        END,
        (dt.lane_weight * (0.5 + random())) DESC,
        random()
    LIMIT 1;

    IF tid IS NULL THEN
        tid := public.daily_pick_template(p_profile_id, p_lane, p_day);
    END IF;

    RETURN tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_insert_task_from_template(
    p_mission_id uuid,
    p_profile_id uuid,
    p_lane text,
    p_tpl uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pts integer;
BEGIN
    IF p_tpl IS NULL THEN
        RETURN;
    END IF;
    SELECT
        least(50, greatest(1, round(t.base_points * t.difficulty_multiplier)::integer))
    INTO pts
    FROM public.daily_task_templates t
    WHERE t.id = p_tpl;

    INSERT INTO public.daily_tasks (
        mission_id, lane, task_template_id, title, description, points, status, assigned_at
    )
    SELECT
        p_mission_id,
        p_lane,
        p_tpl,
        t.title,
        t.description,
        coalesce(pts, t.base_points),
        'pending',
        now()
    FROM public.daily_task_templates t
    WHERE t.id = p_tpl;

    PERFORM public.daily_lane_metric_bump_assigned(p_profile_id, p_lane);
END;
$$;

-- ---------------------------------------------------------------------------
-- Adaptive mission builder
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_ensure_mission_for_profile(
    p_profile_id uuid,
    p_mission_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    mid uuid;
    d date := coalesce(p_mission_date, (timezone('utc', now()))::date);
    ex text;
    tpl uuid;
    activation_days integer;
    total_done integer;
    stage text;
    prog_cap text;
    v_score numeric;
    e_score numeric;
    l_score numeric;
    top_l text;
    weak_l text;
    mid_l text;
    n_recruits integer;
    leadership_ok boolean;
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM public.campaign_profiles
           WHERE id = p_profile_id AND user_id = auth.uid()
       ) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT id INTO mid
    FROM public.daily_missions
    WHERE campaign_profile_id = p_profile_id AND mission_date = d;

    IF FOUND THEN
        RETURN mid;
    END IF;

    SELECT lower(trim(coalesce(exception_request_status, ''))) INTO ex
    FROM public.campaign_profiles WHERE id = p_profile_id;

    IF ex = 'pending' THEN
        RETURN NULL;
    END IF;

    PERFORM public.daily_recompute_lane_scores(p_profile_id);

    SELECT count(DISTINCT dm.mission_date)::integer INTO activation_days
    FROM public.daily_missions dm
    INNER JOIN public.daily_tasks t ON t.mission_id = dm.id AND t.status = 'completed'
    WHERE dm.campaign_profile_id = p_profile_id;

    SELECT coalesce(sum(m.tasks_completed), 0)::integer INTO total_done
    FROM public.user_lane_metrics m
    WHERE m.campaign_profile_id = p_profile_id;

    IF activation_days < 4 OR total_done < 12 THEN
        stage := 'new';
    ELSE
        SELECT
            greatest(communications_score, voter_score, events_score, leadership_score)
        INTO v_score
        FROM public.user_lane_scores
        WHERE campaign_profile_id = p_profile_id;

        IF coalesce(v_score, 0) >= 72 THEN
            stage := 'advanced';
        ELSE
            stage := 'active';
        END IF;
    END IF;

    prog_cap := CASE stage
        WHEN 'new' THEN 'new'
        WHEN 'active' THEN 'intermediate'
        ELSE 'advanced'
    END;

    INSERT INTO public.daily_missions (campaign_profile_id, mission_date)
    VALUES (p_profile_id, d)
    RETURNING id INTO mid;

    tpl := public.daily_pick_template(p_profile_id, 'communications', d);
    PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'communications', tpl);

    IF stage = 'new' THEN
        tpl := public.daily_pick_template_filtered(p_profile_id, 'voter', d, prog_cap, 'any');
        PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'voter', tpl);
        tpl := public.daily_pick_template_filtered(p_profile_id, 'events', d, prog_cap, 'any');
        PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'events', tpl);
        tpl := public.daily_pick_template_filtered(p_profile_id, 'leadership', d, prog_cap, 'any');
        PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'leadership', tpl);
    ELSE
        SELECT
            voter_score,
            events_score,
            leadership_score
        INTO v_score, e_score, l_score
        FROM public.user_lane_scores
        WHERE campaign_profile_id = p_profile_id;

        v_score := coalesce(v_score, 25);
        e_score := coalesce(e_score, 25);
        l_score := coalesce(l_score, 25);

        IF v_score >= e_score AND v_score >= l_score THEN
            top_l := 'voter';
        ELSIF e_score >= v_score AND e_score >= l_score THEN
            top_l := 'events';
        ELSE
            top_l := 'leadership';
        END IF;

        IF v_score <= e_score AND v_score <= l_score THEN
            weak_l := 'voter';
        ELSIF e_score <= v_score AND e_score <= l_score THEN
            weak_l := 'events';
        ELSE
            weak_l := 'leadership';
        END IF;

        IF top_l = weak_l THEN
            tpl := public.daily_pick_template_filtered(p_profile_id, 'voter', d, prog_cap, 'any');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'voter', tpl);
            tpl := public.daily_pick_template_filtered(p_profile_id, 'events', d, prog_cap, 'any');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'events', tpl);
            tpl := public.daily_pick_template_filtered(p_profile_id, 'leadership', d, prog_cap, 'any');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'leadership', tpl);
        ELSE
            mid_l := CASE
                WHEN top_l = 'voter' AND weak_l = 'events' THEN 'leadership'
                WHEN top_l = 'voter' AND weak_l = 'leadership' THEN 'events'
                WHEN top_l = 'events' AND weak_l = 'voter' THEN 'leadership'
                WHEN top_l = 'events' AND weak_l = 'leadership' THEN 'voter'
                WHEN top_l = 'leadership' AND weak_l = 'voter' THEN 'events'
                ELSE 'voter'
            END;

            tpl := public.daily_pick_template_filtered(p_profile_id, weak_l, d, prog_cap, 'easy');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, weak_l, tpl);

            tpl := public.daily_pick_template_filtered(p_profile_id, top_l, d, prog_cap, 'hard');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, top_l, tpl);

            SELECT count(*)::integer INTO n_recruits
            FROM public.power5_relationship_nodes n
            WHERE n.owner_profile_id = p_profile_id;

            leadership_ok := l_score >= 45 OR coalesce(n_recruits, 0) >= 3;

            IF leadership_ok AND top_l <> 'leadership' AND weak_l <> 'leadership' THEN
                tpl := public.daily_pick_template_filtered(p_profile_id, 'leadership', d, prog_cap, 'any');
                PERFORM public.daily_insert_task_from_template(mid, p_profile_id, 'leadership', tpl);
            ELSE
                tpl := public.daily_pick_template_filtered(p_profile_id, mid_l, d, prog_cap, 'any');
                PERFORM public.daily_insert_task_from_template(mid, p_profile_id, mid_l, tpl);
            END IF;
        END IF;

        IF stage = 'active' AND top_l IS DISTINCT FROM weak_l THEN
            tpl := public.daily_pick_template_filtered(p_profile_id, top_l, d, prog_cap, 'hard');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, top_l, tpl);
        END IF;

        IF stage = 'advanced' AND top_l IS DISTINCT FROM weak_l THEN
            tpl := public.daily_pick_template_filtered(p_profile_id, top_l, d, 'advanced', 'hard');
            PERFORM public.daily_insert_task_from_template(mid, p_profile_id, top_l, tpl);
        END IF;
    END IF;

    RETURN mid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Complete task: metrics + recomputes (points unchanged from row)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_complete_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := (
        SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
    );
    pid uuid;
    pts integer;
    n integer;
    ln text;
    secs numeric;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT
        dm.campaign_profile_id,
        dt.points,
        dt.lane,
        extract(epoch FROM (now() - dt.assigned_at))
    INTO pid, pts, ln, secs
    FROM public.daily_tasks dt
    INNER JOIN public.daily_missions dm ON dm.id = dt.mission_id
    WHERE dt.id = p_task_id;

    IF pid IS NULL THEN
        RAISE EXCEPTION 'not found';
    END IF;

    IF pid IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.daily_tasks
    SET status = 'completed', completed_at = now()
    WHERE id = p_task_id AND status = 'pending';

    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
        PERFORM public.daily_apply_points(pid, pts);
        PERFORM public.daily_lane_metric_bump_completed(pid, ln, coalesce(secs, 0));
        PERFORM public.daily_recompute_lane_scores(pid);
        PERFORM public.daily_recompute_behavior_signals(pid);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Supervisor / coach data layer (team-scoped; membership or home team)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.supervisor_activation_insights(p_team_id uuid)
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

    SELECT c.id INTO caller
    FROM public.campaign_profiles c
    WHERE c.user_id = auth.uid()
    LIMIT 1;

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
        'top_per_lane',
        jsonb_build_object(
            'communications', coalesce((
                SELECT jsonb_agg(x.profile_id ORDER BY x.communications_score DESC)
                FROM (
                    SELECT s.campaign_profile_id AS profile_id, s.communications_score
                    FROM public.user_lane_scores s
                    INNER JOIN public.campaign_profiles cp ON cp.id = s.campaign_profile_id
                    WHERE cp.power5_home_team_id = p_team_id
                    ORDER BY s.communications_score DESC NULLS LAST
                    LIMIT 5
                ) x
            ), '[]'::jsonb),
            'voter', coalesce((
                SELECT jsonb_agg(x.profile_id ORDER BY x.voter_score DESC)
                FROM (
                    SELECT s.campaign_profile_id AS profile_id, s.voter_score
                    FROM public.user_lane_scores s
                    INNER JOIN public.campaign_profiles cp ON cp.id = s.campaign_profile_id
                    WHERE cp.power5_home_team_id = p_team_id
                    ORDER BY s.voter_score DESC NULLS LAST
                    LIMIT 5
                ) x
            ), '[]'::jsonb),
            'events', coalesce((
                SELECT jsonb_agg(x.profile_id ORDER BY x.events_score DESC)
                FROM (
                    SELECT s.campaign_profile_id AS profile_id, s.events_score
                    FROM public.user_lane_scores s
                    INNER JOIN public.campaign_profiles cp ON cp.id = s.campaign_profile_id
                    WHERE cp.power5_home_team_id = p_team_id
                    ORDER BY s.events_score DESC NULLS LAST
                    LIMIT 5
                ) x
            ), '[]'::jsonb),
            'leadership', coalesce((
                SELECT jsonb_agg(x.profile_id ORDER BY x.leadership_score DESC)
                FROM (
                    SELECT s.campaign_profile_id AS profile_id, s.leadership_score
                    FROM public.user_lane_scores s
                    INNER JOIN public.campaign_profiles cp ON cp.id = s.campaign_profile_id
                    WHERE cp.power5_home_team_id = p_team_id
                    ORDER BY s.leadership_score DESC NULLS LAST
                    LIMIT 5
                ) x
            ), '[]'::jsonb)
        ),
        'emerging_leaders', coalesce((
            SELECT jsonb_agg(q.campaign_profile_id ORDER BY q.leadership_score DESC)
            FROM (
                SELECT s.campaign_profile_id, s.leadership_score
                FROM public.user_lane_scores s
                INNER JOIN public.user_behavior_signals b ON b.campaign_profile_id = s.campaign_profile_id
                INNER JOIN public.campaign_profiles cp ON cp.id = s.campaign_profile_id
                WHERE cp.power5_home_team_id = p_team_id
                  AND s.leadership_score >= 58
                  AND b.reliability_score >= 52
                ORDER BY s.leadership_score DESC NULLS LAST
                LIMIT 8
            ) q
        ), '[]'::jsonb),
        'low_engagement', coalesce((
            SELECT jsonb_agg(q.id ORDER BY q.wk ASC, q.tot ASC)
            FROM (
                SELECT
                    cp.id,
                    coalesce(us.weekly_points, 0) AS wk,
                    coalesce(us.total_points, 0) AS tot
                FROM public.campaign_profiles cp
                LEFT JOIN public.user_scores us ON us.campaign_profile_id = cp.id
                WHERE cp.power5_home_team_id = p_team_id
                  AND coalesce(us.weekly_points, 0) < 8
                ORDER BY coalesce(us.weekly_points, 0) ASC, coalesce(us.total_points, 0) ASC
                LIMIT 10
            ) q
        ), '[]'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_activation_progress_stats(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM public.campaign_profiles
           WHERE id = p_profile_id AND user_id = auth.uid()
       ) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    RETURN jsonb_build_object(
        'activation_days_completed', (
            SELECT count(DISTINCT dm.mission_date)::integer
            FROM public.daily_missions dm
            INNER JOIN public.daily_tasks t ON t.mission_id = dm.id AND t.status = 'completed'
            WHERE dm.campaign_profile_id = p_profile_id
        ),
        'tasks_completed_sum', (
            SELECT coalesce(sum(m.tasks_completed), 0)::integer
            FROM public.user_lane_metrics m
            WHERE m.campaign_profile_id = p_profile_id
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.supervisor_activation_insights(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_sync_activation_scores(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_activation_progress_stats(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_lane_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lane_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_lane_metrics_select_own ON public.user_lane_metrics;
CREATE POLICY user_lane_metrics_select_own ON public.user_lane_metrics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_lane_metrics.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS user_behavior_signals_select_own ON public.user_behavior_signals;
CREATE POLICY user_behavior_signals_select_own ON public.user_behavior_signals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_behavior_signals.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS user_lane_scores_select_own ON public.user_lane_scores;
CREATE POLICY user_lane_scores_select_own ON public.user_lane_scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_lane_scores.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

GRANT SELECT ON public.user_lane_metrics TO authenticated;
GRANT SELECT ON public.user_behavior_signals TO authenticated;
GRANT SELECT ON public.user_lane_scores TO authenticated;
