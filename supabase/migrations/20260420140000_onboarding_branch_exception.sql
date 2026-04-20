-- Onboarding branch + exception request (progression gating). Apply in Supabase SQL editor or via CLI.

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS onboarding_branch text,
    ADD COLUMN IF NOT EXISTS exception_request_status text DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS exception_request_note text,
    ADD COLUMN IF NOT EXISTS exception_requested_at timestamptz;

UPDATE public.campaign_profiles
SET exception_request_status = 'none'
WHERE exception_request_status IS NULL;

COMMENT ON COLUMN public.campaign_profiles.onboarding_branch IS
    'Campaign onboarding branch: registered_arkansas_voter | eligible_not_registered | under_18_youth | out_of_state_supporter | staff_admin_direct_placement';

COMMENT ON COLUMN public.campaign_profiles.exception_request_status IS
    'none | pending | approved | denied — roster exception for users who cannot self-match voter file.';

COMMENT ON COLUMN public.campaign_profiles.exception_request_note IS
    'Volunteer explanation for exception request (no PII required).';
