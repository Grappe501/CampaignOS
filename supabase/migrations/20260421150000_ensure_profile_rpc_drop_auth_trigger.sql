-- Sign-up must not depend on triggers on auth.users (often fails with RLS / role
-- context and surfaces as "Database error saving new user").
-- Create the profile row from the client via RPC after the session exists.

DROP TRIGGER IF EXISTS on_auth_user_created_campaign_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_campaign_profile();

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
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

ALTER FUNCTION public.ensure_campaign_profile() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.ensure_campaign_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_campaign_profile() TO authenticated;
