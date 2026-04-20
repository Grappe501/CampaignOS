-- Baseline: campaign_profiles, raw_vr shell, RLS, and auth trigger.
-- Apply before 20260419120000_voter_match_layer.sql (order by timestamp).
-- Idempotent where possible; skip or adjust if your project already defines these differently.

-- ---------------------------------------------------------------------------
-- campaign_profiles (one row per auth user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_profiles_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS campaign_profiles_user_id_idx
    ON public.campaign_profiles (user_id);

COMMENT ON TABLE public.campaign_profiles IS
    'Per-user campaign workspace row; extended by later migrations.';

-- ---------------------------------------------------------------------------
-- raw_vr (voter file; load real data via ETL / service role — not from anon)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.raw_vr (
    voter_id text PRIMARY KEY,
    name_last text NOT NULL,
    name_first text NOT NULL,
    date_of_birth date NOT NULL,
    county text,
    registrant_status text,
    res_city text,
    res_state text,
    res_zip5 text,
    precinct_name text,
    congressional_district text,
    state_senate_district text,
    state_representative_district text
);

COMMENT ON TABLE public.raw_vr IS
    'Arkansas VR-style rows; SECURITY DEFINER RPCs read this table.';

-- ---------------------------------------------------------------------------
-- RLS: volunteers manage their own profile row
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_profiles_select_own ON public.campaign_profiles;
CREATE POLICY campaign_profiles_select_own ON public.campaign_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS campaign_profiles_update_own ON public.campaign_profiles;
CREATE POLICY campaign_profiles_update_own ON public.campaign_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.campaign_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- New sign-up → campaign_profiles row (trigger path for dashboard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_campaign_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.campaign_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_campaign_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_campaign_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_campaign_profile();
