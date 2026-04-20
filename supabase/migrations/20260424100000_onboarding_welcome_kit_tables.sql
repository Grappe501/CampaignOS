-- Structured onboarding model: Volunteer Welcome Kit (culture/voice) +
-- Volunteer Organization Outline (lanes / ops). Granular tables; authenticated read-only.

-- ---------------------------------------------------------------------------
-- Onboarding flow modules (ordered steps for UI / Agent Jones)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_onboarding_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    module_key text NOT NULL,
    title text NOT NULL,
    summary text,
    sort_order integer NOT NULL DEFAULT 0,
    source_document text NOT NULL DEFAULT 'synthesized'
        CHECK (source_document IN ('welcome_kit', 'org_outline', 'synthesized')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_onboarding_modules_unique UNIQUE (campaign_slug, module_key)
);

CREATE INDEX IF NOT EXISTS campaign_onboarding_modules_slug_sort_idx
    ON public.campaign_onboarding_modules (campaign_slug, sort_order);

-- ---------------------------------------------------------------------------
-- Sections under each module (markdown body)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_onboarding_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    module_id uuid NOT NULL REFERENCES public.campaign_onboarding_modules (id) ON DELETE CASCADE,
    section_key text NOT NULL,
    title text,
    body_md text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_onboarding_sections_unique UNIQUE (module_id, section_key)
);

CREATE INDEX IF NOT EXISTS campaign_onboarding_sections_slug_idx
    ON public.campaign_onboarding_sections (campaign_slug, module_id, sort_order);

-- ---------------------------------------------------------------------------
-- Optional tap / reflection prompts tied to a section
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_onboarding_prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id uuid NOT NULL REFERENCES public.campaign_onboarding_sections (id) ON DELETE CASCADE,
    prompt_text text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_onboarding_prompts_section_idx
    ON public.campaign_onboarding_prompts (section_id, sort_order);

-- ---------------------------------------------------------------------------
-- Campaign culture / values (Welcome Kit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    value_key text NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    source_document text NOT NULL DEFAULT 'welcome_kit'
        CHECK (source_document IN ('welcome_kit', 'org_outline', 'synthesized')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_values_unique UNIQUE (campaign_slug, value_key)
);

CREATE INDEX IF NOT EXISTS campaign_values_slug_idx
    ON public.campaign_values (campaign_slug, sort_order);

-- ---------------------------------------------------------------------------
-- Volunteer operational lanes (Org Outline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_lanes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    lane_key text NOT NULL,
    title text NOT NULL,
    summary text,
    objectives_md text,
    accountability_expectations_md text,
    support_structure_note_md text,
    goal_challenge_mechanics_md text,
    sort_order integer NOT NULL DEFAULT 0,
    related_onboarding_branch_hints text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_lanes_unique UNIQUE (campaign_slug, lane_key)
);

CREATE INDEX IF NOT EXISTS volunteer_lanes_slug_idx
    ON public.volunteer_lanes (campaign_slug, sort_order);

-- ---------------------------------------------------------------------------
-- Lane specialties / sub-focus areas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_lane_specialties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lane_id uuid NOT NULL REFERENCES public.volunteer_lanes (id) ON DELETE CASCADE,
    specialty_key text NOT NULL,
    label text NOT NULL,
    body_md text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_lane_specialties_unique UNIQUE (lane_id, specialty_key)
);

-- ---------------------------------------------------------------------------
-- First actions per lane (concrete next steps)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_first_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lane_id uuid NOT NULL REFERENCES public.volunteer_lanes (id) ON DELETE CASCADE,
    action_key text NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    cta_url text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_first_actions_unique UNIQUE (lane_id, action_key)
);

CREATE INDEX IF NOT EXISTS volunteer_first_actions_lane_idx
    ON public.volunteer_first_actions (lane_id, sort_order);

-- ---------------------------------------------------------------------------
-- Talk tracks / messaging (Welcome Kit voice)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_talk_tracks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    track_key text NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    source_document text NOT NULL DEFAULT 'welcome_kit'
        CHECK (source_document IN ('welcome_kit', 'org_outline', 'synthesized')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_talk_tracks_unique UNIQUE (campaign_slug, track_key)
);

-- ---------------------------------------------------------------------------
-- Accountability expectations (Org Outline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_accountability_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    rule_key text NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    severity text NOT NULL DEFAULT 'normal'
        CHECK (severity IN ('normal', 'important', 'critical')),
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_accountability_rules_unique UNIQUE (campaign_slug, rule_key)
);

-- ---------------------------------------------------------------------------
-- Growth mechanics (Power of 5, pick 1–2, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_growth_paths (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    path_key text NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_growth_paths_unique UNIQUE (campaign_slug, path_key)
);

-- ---------------------------------------------------------------------------
-- Document registry (points to source files for re-ingestion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_onboarding_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_slug text NOT NULL,
    document_key text NOT NULL,
    title text NOT NULL,
    storage_path text,
    source_kind text NOT NULL DEFAULT 'markdown'
        CHECK (source_kind IN ('markdown', 'pptx', 'pdf', 'other')),
    notes text,
    ingested_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_onboarding_documents_unique UNIQUE (campaign_slug, document_key)
);

-- ---------------------------------------------------------------------------
-- RLS: read for authenticated (same pattern as campaign_* knowledge)
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_onboarding_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_onboarding_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_onboarding_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_lane_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_first_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_talk_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_accountability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_growth_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_onboarding_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_onboarding_modules_read ON public.campaign_onboarding_modules;
CREATE POLICY campaign_onboarding_modules_read ON public.campaign_onboarding_modules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campaign_onboarding_sections_read ON public.campaign_onboarding_sections;
CREATE POLICY campaign_onboarding_sections_read ON public.campaign_onboarding_sections
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campaign_onboarding_prompts_read ON public.campaign_onboarding_prompts;
CREATE POLICY campaign_onboarding_prompts_read ON public.campaign_onboarding_prompts
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campaign_values_read ON public.campaign_values;
CREATE POLICY campaign_values_read ON public.campaign_values
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_lanes_read ON public.volunteer_lanes;
CREATE POLICY volunteer_lanes_read ON public.volunteer_lanes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_lane_specialties_read ON public.volunteer_lane_specialties;
CREATE POLICY volunteer_lane_specialties_read ON public.volunteer_lane_specialties
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_first_actions_read ON public.volunteer_first_actions;
CREATE POLICY volunteer_first_actions_read ON public.volunteer_first_actions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_talk_tracks_read ON public.volunteer_talk_tracks;
CREATE POLICY volunteer_talk_tracks_read ON public.volunteer_talk_tracks
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_accountability_rules_read ON public.volunteer_accountability_rules;
CREATE POLICY volunteer_accountability_rules_read ON public.volunteer_accountability_rules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS volunteer_growth_paths_read ON public.volunteer_growth_paths;
CREATE POLICY volunteer_growth_paths_read ON public.volunteer_growth_paths
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campaign_onboarding_documents_read ON public.campaign_onboarding_documents;
CREATE POLICY campaign_onboarding_documents_read ON public.campaign_onboarding_documents
    FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.campaign_onboarding_modules TO authenticated;
GRANT SELECT ON public.campaign_onboarding_sections TO authenticated;
GRANT SELECT ON public.campaign_onboarding_prompts TO authenticated;
GRANT SELECT ON public.campaign_values TO authenticated;
GRANT SELECT ON public.volunteer_lanes TO authenticated;
GRANT SELECT ON public.volunteer_lane_specialties TO authenticated;
GRANT SELECT ON public.volunteer_first_actions TO authenticated;
GRANT SELECT ON public.volunteer_talk_tracks TO authenticated;
GRANT SELECT ON public.volunteer_accountability_rules TO authenticated;
GRANT SELECT ON public.volunteer_growth_paths TO authenticated;
GRANT SELECT ON public.campaign_onboarding_documents TO authenticated;

COMMENT ON TABLE public.campaign_onboarding_modules IS
    'Ordered onboarding chapters (Welcome Kit + org alignment).';
COMMENT ON TABLE public.volunteer_lanes IS
    'Operational lanes from Volunteer Organization Outline; map UI / Agent Jones to lane_key.';
