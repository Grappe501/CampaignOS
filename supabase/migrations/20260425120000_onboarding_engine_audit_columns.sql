-- Onboarding engine audit fields + canonical direction key migration.

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS onboarding_last_prompt text,
    ADD COLUMN IF NOT EXISTS onboarding_last_action_at timestamptz;

COMMENT ON COLUMN public.campaign_profiles.onboarding_last_prompt IS
    'Last Agent Jones onboarding chip id or prompt key (client-defined).';
COMMENT ON COLUMN public.campaign_profiles.onboarding_last_action_at IS
    'When the volunteer last advanced onboarding engine state.';

UPDATE public.campaign_profiles
SET onboarding_direction_key = 'help_behind_the_scenes'
WHERE onboarding_direction_key = 'help_behind_scenes';
