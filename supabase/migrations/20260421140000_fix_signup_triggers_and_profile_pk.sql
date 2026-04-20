-- Fix "Database error saving new user" on email/password sign-up:
-- 1) Profile row uses id = auth.users.id (Supabase default pattern; avoids FK/RLS edge cases).
-- 2) Trigger functions owned by postgres so SECURITY DEFINER bypasses RLS on inserts.

CREATE OR REPLACE FUNCTION public.handle_new_campaign_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.campaign_profiles (id, user_id)
    VALUES (NEW.id, NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_campaign_profile() OWNER TO postgres;

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

ALTER FUNCTION public.workspace_seed_profile_defaults() OWNER TO postgres;

GRANT INSERT ON TABLE public.campaign_profiles TO postgres;
GRANT INSERT ON TABLE public.workspace_profile_tasks TO postgres;
GRANT INSERT ON TABLE public.workspace_profile_training TO postgres;
