-- Program owner: full campaign permissions via canonical `admin` primary_role.
-- Aligns with is_campaign_event_editor, KPI mission editors, signup sheet reviewers,
-- and EVENT_ROLE_PERMISSION_MATRIX `admin` row.

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS primary_role text;

COMMENT ON COLUMN public.campaign_profiles.primary_role IS
    'Canonical workspace role slug (e.g. admin, campaign_manager, volunteer).';

UPDATE public.campaign_profiles cp
SET
    primary_role = 'admin',
    updated_at = now()
FROM auth.users u
WHERE cp.user_id = u.id
  AND lower(trim(coalesce(u.email, ''))) = lower(trim('grappe4arkansas@gmail.com'));
