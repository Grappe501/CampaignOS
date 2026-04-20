-- Minimal workspace task + training catalog and per-profile progress (additive).
-- No assignment engine: one catalog row surfaced as "current" via sort_order + status.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_training_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_tasks IS
    'Campaign task templates; profile progress in workspace_profile_tasks.';

COMMENT ON TABLE public.workspace_training_modules IS
    'Training module templates; profile progress in workspace_profile_training.';

-- ---------------------------------------------------------------------------
-- Per-profile progress (not a full assignment engine)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_profile_tasks (
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES public.workspace_tasks (id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'not_started',
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workspace_profile_tasks_pk PRIMARY KEY (campaign_profile_id, task_id),
    CONSTRAINT workspace_profile_tasks_status_check CHECK (
        status IN ('not_started', 'in_progress', 'completed', 'blocked')
    )
);

CREATE TABLE IF NOT EXISTS public.workspace_profile_training (
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.workspace_training_modules (id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'not_started',
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workspace_profile_training_pk PRIMARY KEY (campaign_profile_id, module_id),
    CONSTRAINT workspace_profile_training_status_check CHECK (
        status IN ('not_started', 'in_progress', 'completed', 'blocked')
    )
);

CREATE INDEX IF NOT EXISTS workspace_profile_tasks_profile_idx
    ON public.workspace_profile_tasks (campaign_profile_id);

CREATE INDEX IF NOT EXISTS workspace_profile_training_profile_idx
    ON public.workspace_profile_training (campaign_profile_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_profile_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_profile_training ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_tasks_select_active ON public.workspace_tasks;
CREATE POLICY workspace_tasks_select_active ON public.workspace_tasks
    FOR SELECT TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS workspace_training_modules_select_active ON public.workspace_training_modules;
CREATE POLICY workspace_training_modules_select_active ON public.workspace_training_modules
    FOR SELECT TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS workspace_profile_tasks_select_own ON public.workspace_profile_tasks;
CREATE POLICY workspace_profile_tasks_select_own ON public.workspace_profile_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS workspace_profile_tasks_update_own ON public.workspace_profile_tasks;
CREATE POLICY workspace_profile_tasks_update_own ON public.workspace_profile_tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS workspace_profile_training_select_own ON public.workspace_profile_training;
CREATE POLICY workspace_profile_training_select_own ON public.workspace_profile_training
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS workspace_profile_training_update_own ON public.workspace_profile_training;
CREATE POLICY workspace_profile_training_update_own ON public.workspace_profile_training
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = campaign_profile_id
              AND cp.user_id = auth.uid()
        )
    );

GRANT SELECT ON public.workspace_tasks TO authenticated;
GRANT SELECT ON public.workspace_training_modules TO authenticated;
GRANT SELECT, UPDATE ON public.workspace_profile_tasks TO authenticated;
GRANT SELECT, UPDATE ON public.workspace_profile_training TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed catalog + default progress rows for existing profiles
-- ---------------------------------------------------------------------------
INSERT INTO public.workspace_tasks (title, description, sort_order, is_active)
SELECT 'Captain check-in', '15-minute intro with your captain to confirm pod and first shift window.', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_tasks WHERE title = 'Captain check-in');

INSERT INTO public.workspace_tasks (title, description, sort_order, is_active)
SELECT 'Neighborhood welcome packet', 'Review the printed packet and confirm you can distribute within your assigned turf.', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_tasks WHERE title = 'Neighborhood welcome packet');

INSERT INTO public.workspace_training_modules (title, description, sort_order, is_active)
SELECT 'Volunteer Basics', 'Safety, data handling, and respectful voter contact — campaign overview.', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_training_modules WHERE title = 'Volunteer Basics');

INSERT INTO public.workspace_training_modules (title, description, sort_order, is_active)
SELECT 'Canvass toolkit', 'Knock scripts, turf etiquette, and reporting — preview before field day.', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_training_modules WHERE title = 'Canvass toolkit');

INSERT INTO public.workspace_profile_tasks (campaign_profile_id, task_id, status)
SELECT cp.id, wt.id, 'not_started'
FROM public.campaign_profiles cp
CROSS JOIN LATERAL (
    SELECT id
    FROM public.workspace_tasks
    WHERE is_active
    ORDER BY sort_order
    LIMIT 1
) wt
WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspace_profile_tasks x
    WHERE x.campaign_profile_id = cp.id
);

INSERT INTO public.workspace_profile_training (campaign_profile_id, module_id, status)
SELECT cp.id, wm.id, 'not_started'
FROM public.campaign_profiles cp
CROSS JOIN LATERAL (
    SELECT id
    FROM public.workspace_training_modules
    WHERE is_active
    ORDER BY sort_order
    LIMIT 1
) wm
WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspace_profile_training x
    WHERE x.campaign_profile_id = cp.id
);

-- ---------------------------------------------------------------------------
-- New profiles: attach default first task + first module
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspace_seed_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    t_id uuid;
    m_id uuid;
BEGIN
    SELECT id INTO t_id
    FROM public.workspace_tasks
    WHERE is_active
    ORDER BY sort_order
    LIMIT 1;

    SELECT id INTO m_id
    FROM public.workspace_training_modules
    WHERE is_active
    ORDER BY sort_order
    LIMIT 1;

    IF t_id IS NOT NULL THEN
        INSERT INTO public.workspace_profile_tasks (campaign_profile_id, task_id, status)
        VALUES (NEW.id, t_id, 'not_started')
        ON CONFLICT (campaign_profile_id, task_id) DO NOTHING;
    END IF;

    IF m_id IS NOT NULL THEN
        INSERT INTO public.workspace_profile_training (campaign_profile_id, module_id, status)
        VALUES (NEW.id, m_id, 'not_started')
        ON CONFLICT (campaign_profile_id, module_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_workspace_seed_profile_defaults ON public.campaign_profiles;
CREATE TRIGGER tr_workspace_seed_profile_defaults
    AFTER INSERT ON public.campaign_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.workspace_seed_profile_defaults();
