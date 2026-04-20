-- Guided momentum onboarding (Agent Jones–driven; no wizard UI).
-- States: new → exploring → committed → engaged (optional progression; dashboard never blocked).

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS onboarding_momentum_state text NOT NULL DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS onboarding_direction_key text,
    ADD COLUMN IF NOT EXISTS onboarding_micro_commitment_key text;

COMMENT ON COLUMN public.campaign_profiles.onboarding_momentum_state IS
    'new | exploring | committed | engaged — Agent Jones guided momentum.';
COMMENT ON COLUMN public.campaign_profiles.onboarding_direction_key IS
    'Directional entry: talk_to_people | show_up_locally | help_behind_scenes | spread_the_word';
COMMENT ON COLUMN public.campaign_profiles.onboarding_micro_commitment_key IS
    'Last chosen micro-commitment id from client catalog.';
