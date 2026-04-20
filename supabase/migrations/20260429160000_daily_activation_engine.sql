-- Daily Activation Engine: four-lane daily missions, scoring, social prefs, team tier (no full leaderboard).

-- ---------------------------------------------------------------------------
-- Templates (catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lane text NOT NULL CHECK (lane IN ('communications', 'voter', 'events', 'leadership')),
    template_key text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    base_points integer NOT NULL DEFAULT 5 CHECK (base_points >= 1 AND base_points <= 50),
    difficulty smallint NOT NULL DEFAULT 2 CHECK (difficulty >= 1 AND difficulty <= 5),
    platform_hint text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_task_templates_lane_idx ON public.daily_task_templates (lane);

-- ---------------------------------------------------------------------------
-- Daily mission header (one row per profile per UTC day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_missions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    mission_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT daily_missions_one_per_day UNIQUE (campaign_profile_id, mission_date)
);

CREATE INDEX IF NOT EXISTS daily_missions_profile_date_idx
    ON public.daily_missions (campaign_profile_id, mission_date DESC);

-- ---------------------------------------------------------------------------
-- Daily tasks (4 lanes max in app; table allows future expansion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id uuid NOT NULL REFERENCES public.daily_missions (id) ON DELETE CASCADE,
    lane text NOT NULL CHECK (lane IN ('communications', 'voter', 'events', 'leadership')),
    task_template_id uuid NOT NULL REFERENCES public.daily_task_templates (id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    points integer NOT NULL DEFAULT 5,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at timestamptz,
    CONSTRAINT daily_tasks_mission_lane_unique UNIQUE (mission_id, lane)
);

CREATE INDEX IF NOT EXISTS daily_tasks_mission_idx ON public.daily_tasks (mission_id);

-- ---------------------------------------------------------------------------
-- Social platform opt-in (filters communications templates with platform_hint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_social_platforms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (length(trim(platform)) > 0 AND length(platform) <= 64),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_social_platforms_unique UNIQUE (campaign_profile_id, platform)
);

CREATE INDEX IF NOT EXISTS user_social_platforms_profile_idx ON public.user_social_platforms (campaign_profile_id);

-- ---------------------------------------------------------------------------
-- Activation scores (separate from volunteer_engagement_scores)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scores (
    campaign_profile_id uuid PRIMARY KEY REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    total_points integer NOT NULL DEFAULT 0,
    daily_points integer NOT NULL DEFAULT 0,
    weekly_points integer NOT NULL DEFAULT 0,
    last_local_date date,
    week_start_date date,
    activation_streak_days integer NOT NULL DEFAULT 0,
    last_activation_date date,
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_scores IS
    'Daily activation points; daily/weekly roll within same UTC calendar day/week on completion RPC.';

-- ---------------------------------------------------------------------------
-- Template picker (rotation: avoid same template in last 6 days; respect platform_hint)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_pick_template(
    p_profile_id uuid,
    p_lane text,
    p_day date
) RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    tid uuid;
BEGIN
    SELECT dt.id INTO tid
    FROM public.daily_task_templates dt
    WHERE dt.lane = p_lane
      AND dt.is_active
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
    ORDER BY random()
    LIMIT 1;

    IF tid IS NULL THEN
        SELECT dt.id INTO tid
        FROM public.daily_task_templates dt
        WHERE dt.lane = p_lane
          AND dt.is_active
          AND dt.platform_hint IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.daily_tasks tsk
              INNER JOIN public.daily_missions dm ON dm.id = tsk.mission_id
              WHERE dm.campaign_profile_id = p_profile_id
                AND dm.mission_date >= p_day - 6
                AND tsk.task_template_id = dt.id
          )
        ORDER BY random()
        LIMIT 1;
    END IF;

    IF tid IS NULL THEN
        SELECT dt.id INTO tid
        FROM public.daily_task_templates dt
        WHERE dt.lane = p_lane AND dt.is_active
        ORDER BY random()
        LIMIT 1;
    END IF;

    RETURN tid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Ensure today’s mission (4 lanes)
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
    lanes text[] := ARRAY['communications', 'voter', 'events', 'leadership'];
    ln text;
    tpl uuid;
    ex text;
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

    INSERT INTO public.daily_missions (campaign_profile_id, mission_date)
    VALUES (p_profile_id, d)
    RETURNING id INTO mid;

    FOREACH ln IN ARRAY lanes LOOP
        tpl := public.daily_pick_template(p_profile_id, ln, d);
        IF tpl IS NULL THEN
            CONTINUE;
        END IF;
        INSERT INTO public.daily_tasks (
            mission_id, lane, task_template_id, title, description, points, status
        )
        SELECT mid, ln, tpl, t.title, t.description, t.base_points, 'pending'
        FROM public.daily_task_templates t
        WHERE t.id = tpl;
    END LOOP;

    RETURN mid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Complete / skip task + score rollups (UTC day / ISO week)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_apply_points(p_profile_id uuid, p_points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today date := (timezone('utc', now()))::date;
    v_week date := date_trunc('week', timezone('utc', now()))::date;
BEGIN
    INSERT INTO public.user_scores (
        campaign_profile_id,
        total_points,
        daily_points,
        weekly_points,
        last_local_date,
        week_start_date,
        activation_streak_days,
        last_activation_date,
        updated_at
    )
    VALUES (
        p_profile_id,
        p_points,
        p_points,
        p_points,
        v_today,
        v_week,
        1,
        v_today,
        now()
    )
    ON CONFLICT (campaign_profile_id) DO UPDATE SET
        total_points = public.user_scores.total_points + p_points,
        daily_points = CASE
            WHEN public.user_scores.last_local_date IS NOT DISTINCT FROM v_today
                THEN public.user_scores.daily_points + p_points
            ELSE p_points
        END,
        weekly_points = CASE
            WHEN public.user_scores.week_start_date IS NOT DISTINCT FROM v_week
                THEN public.user_scores.weekly_points + p_points
            ELSE p_points
        END,
        last_local_date = v_today,
        week_start_date = v_week,
        activation_streak_days = CASE
            WHEN public.user_scores.last_activation_date IS NOT DISTINCT FROM v_today - 1
                THEN public.user_scores.activation_streak_days + 1
            WHEN public.user_scores.last_activation_date IS NOT DISTINCT FROM v_today
                THEN public.user_scores.activation_streak_days
            ELSE 1
        END,
        last_activation_date = v_today,
        updated_at = now();
END;
$$;

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
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT dm.campaign_profile_id, dt.points
    INTO pid, pts
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
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_skip_task(p_task_id uuid)
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
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT dm.campaign_profile_id INTO pid
    FROM public.daily_tasks dt
    INNER JOIN public.daily_missions dm ON dm.id = dt.mission_id
    WHERE dt.id = p_task_id AND dt.status = 'pending';

    IF pid IS NULL OR pid IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.daily_tasks
    SET status = 'skipped', completed_at = now()
    WHERE id = p_task_id AND status = 'pending';
END;
$$;

-- ---------------------------------------------------------------------------
-- Team tier label (Power of 5 home team); no row list returned
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_activation_team_tier(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    my_pts integer;
    team_id uuid;
    rnk integer;
    n integer;
    lbl text;
BEGIN
    SELECT coalesce(us.total_points, 0), cp.power5_home_team_id
    INTO my_pts, team_id
    FROM public.campaign_profiles cp
    LEFT JOIN public.user_scores us ON us.campaign_profile_id = cp.id
    WHERE cp.id = p_profile_id;

    IF team_id IS NULL THEN
        RETURN jsonb_build_object(
            'tier_label', null,
            'rank', null,
            'team_size', null
        );
    END IF;

    SELECT
        count(*) FILTER (WHERE coalesce(us.total_points, 0) > my_pts) + 1,
        count(*)
    INTO rnk, n
    FROM public.campaign_profiles cp
    LEFT JOIN public.user_scores us ON us.campaign_profile_id = cp.id
    WHERE cp.power5_home_team_id = team_id;

    IF n < 3 THEN
        lbl := null;
    ELSIF rnk = 1 THEN
        lbl := '#1';
    ELSIF rnk <= 5 THEN
        lbl := 'Top 5';
    ELSIF rnk <= 10 THEN
        lbl := 'Top 10';
    ELSIF rnk <= greatest(1, ceil(n * 0.25)::integer) THEN
        lbl := 'Top 25';
    ELSE
        lbl := null;
    END IF;

    RETURN jsonb_build_object(
        'tier_label', lbl,
        'rank', rnk,
        'team_size', n
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_task_templates_select ON public.daily_task_templates;
CREATE POLICY daily_task_templates_select ON public.daily_task_templates
    FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS daily_missions_select_own ON public.daily_missions;
CREATE POLICY daily_missions_select_own ON public.daily_missions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = daily_missions.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS daily_tasks_select_own ON public.daily_tasks;
CREATE POLICY daily_tasks_select_own ON public.daily_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.daily_missions dm
            JOIN public.campaign_profiles cp ON cp.id = dm.campaign_profile_id
            WHERE dm.id = daily_tasks.mission_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS user_social_platforms_all_own ON public.user_social_platforms;
CREATE POLICY user_social_platforms_select_own ON public.user_social_platforms
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_social_platforms.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );
CREATE POLICY user_social_platforms_insert_own ON public.user_social_platforms
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_social_platforms.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );
CREATE POLICY user_social_platforms_update_own ON public.user_social_platforms
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_social_platforms.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );
CREATE POLICY user_social_platforms_delete_own ON public.user_social_platforms
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_social_platforms.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS user_scores_select_own ON public.user_scores;
CREATE POLICY user_scores_select_own ON public.user_scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_profiles cp
            WHERE cp.id = user_scores.campaign_profile_id AND cp.user_id = auth.uid()
        )
    );

GRANT SELECT ON public.daily_task_templates TO authenticated;
GRANT SELECT ON public.daily_missions TO authenticated;
GRANT SELECT ON public.daily_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_social_platforms TO authenticated;
GRANT SELECT ON public.user_scores TO authenticated;

GRANT EXECUTE ON FUNCTION public.daily_ensure_mission_for_profile(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_complete_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_skip_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_activation_team_tier(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed templates
-- ---------------------------------------------------------------------------
INSERT INTO public.daily_task_templates (lane, template_key, title, description, base_points, difficulty, platform_hint)
VALUES
    ('communications', 'make_one_post', 'Make one post', 'Share one authentic post — your words, one campaign-approved link max.', 6, 2, null),
    ('communications', 'comment_on_campaign_post', 'Comment on a campaign post', 'Leave one thoughtful public comment on an official post (stay kind, no pile-ons).', 5, 1, null),
    ('communications', 'like_three_posts', 'Like three posts', 'Boost three campaign or ally posts so more neighbors see them.', 4, 1, null),
    ('communications', 'share_one_post', 'Share one post', 'Repost or share one item to your story or feed — personal note optional.', 6, 2, null),
    ('voter', 'call_one_person', 'Call one person', 'Five-minute human check-in: listen first, then share why you are in.', 8, 3, null),
    ('voter', 'text_two_people', 'Text two people', 'Two short personal texts — no blast copy.', 7, 2, null),
    ('voter', 'follow_up_contact', 'Follow up one contact', 'Circle back on a conversation you already started.', 7, 2, null),
    ('voter', 'invite_to_event', 'Invite someone to an event', 'One personal invite — date, place, why it matters.', 8, 3, null),
    ('events', 'rsvp_event', 'RSVP to an event', 'Lock your spot so organizers can plan.', 5, 1, null),
    ('events', 'invite_two_people_event', 'Invite two people to an event', 'Two personal invites with clear logistics.', 8, 3, null),
    ('events', 'confirm_attendance', 'Confirm attendance', 'Reply yes or no so captains are not guessing.', 4, 1, null),
    ('leadership', 'check_in_with_your_5', 'Check in with your five', 'One message or call to someone in your Power of 5 circle.', 7, 2, null),
    ('leadership', 'recruit_one_person', 'Recruit one person', 'Ask one trusted friend to take a tiny step with you.', 9, 3, null),
    ('leadership', 'help_one_person_complete_task', 'Help one teammate', 'Unblock one person on a task — 10 minutes max.', 8, 3, null),
    ('leadership', 'review_team_progress', 'Review team progress', 'Skim your pod’s wins and one next ask for the week.', 6, 2, null)
ON CONFLICT (template_key) DO UPDATE SET
    lane = EXCLUDED.lane,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    base_points = EXCLUDED.base_points,
    difficulty = EXCLUDED.difficulty,
    platform_hint = EXCLUDED.platform_hint;
