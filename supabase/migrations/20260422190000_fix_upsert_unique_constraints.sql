-- Databases that created campaign_profiles / voter_match_links before baseline
-- migrations (or without full DDL) can miss UNIQUE constraints. Upserts then fail with:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".

-- ensure_campaign_profile: always safe to conflict on primary key
CREATE OR REPLACE FUNCTION public.ensure_campaign_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.campaign_profiles (id, user_id)
    VALUES (uid, uid)
    ON CONFLICT (id) DO NOTHING;
END;
$$;

ALTER FUNCTION public.ensure_campaign_profile() OWNER TO postgres;

-- voter_match_links: required by confirm_voter_self_match ON CONFLICT (campaign_profile_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'voter_match_links'
          AND c.conname = 'voter_match_links_profile_unique'
    ) THEN
        ALTER TABLE public.voter_match_links
            ADD CONSTRAINT voter_match_links_profile_unique UNIQUE (campaign_profile_id);
    END IF;
END $$;

-- campaign_profiles: one row per auth user (handles legacy handle_new_campaign_profile upserts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'campaign_profiles'
          AND c.conname = 'campaign_profiles_user_id_key'
    ) THEN
        ALTER TABLE public.campaign_profiles
            ADD CONSTRAINT campaign_profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;
