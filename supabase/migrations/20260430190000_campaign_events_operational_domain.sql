-- Step 1 — Event System Domain Expansion: operational fields, geography, goals, intelligence hooks.
-- Keeps legacy `status` for existing CHECK/RPCs; adds `operational_status` for the pipeline model.

ALTER TABLE public.campaign_events
    ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'draft'
        CONSTRAINT campaign_events_operational_status_check CHECK (
            operational_status IN (
                'draft',
                'planning',
                'approval_needed',
                'scheduled',
                'in_prep',
                'ready',
                'live',
                'completed',
                'canceled',
                'archived'
            )
        ),
    ADD COLUMN IF NOT EXISTS event_objective text
        CONSTRAINT campaign_events_event_objective_check CHECK (
            event_objective IS NULL
            OR event_objective IN (
                'recruitment',
                'persuasion',
                'fundraising',
                'visibility',
                'coalition',
                'turnout',
                'listening',
                'volunteer_onboarding',
                'surrogate_amplification'
            )
        ),
    ADD COLUMN IF NOT EXISTS event_scope text
        CONSTRAINT campaign_events_event_scope_check CHECK (
            event_scope IS NULL
            OR event_scope IN (
                'statewide',
                'district',
                'county',
                'precinct',
                'neighborhood'
            )
        ),
    ADD COLUMN IF NOT EXISTS host_type text
        CONSTRAINT campaign_events_host_type_check CHECK (
            host_type IS NULL
            OR host_type IN (
                'campaign',
                'county_lead',
                'precinct_captain',
                'supporter_host',
                'coalition_partner',
                'surrogate'
            )
        ),
    ADD COLUMN IF NOT EXISTS neighborhood_id text,
    ADD COLUMN IF NOT EXISTS parent_event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS readiness_score numeric(5, 2)
        CONSTRAINT campaign_events_readiness_score_range CHECK (
            readiness_score IS NULL OR (readiness_score >= 0 AND readiness_score <= 100)
        ),
    ADD COLUMN IF NOT EXISTS required_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS expected_audience_size integer
        CONSTRAINT campaign_events_expected_audience_nonneg CHECK (
            expected_audience_size IS NULL OR expected_audience_size >= 0
        ),
    ADD COLUMN IF NOT EXISTS actual_audience_size integer
        CONSTRAINT campaign_events_actual_audience_nonneg CHECK (
            actual_audience_size IS NULL OR actual_audience_size >= 0
        ),
    ADD COLUMN IF NOT EXISTS volunteer_goal integer
        CONSTRAINT campaign_events_volunteer_goal_nonneg CHECK (
            volunteer_goal IS NULL OR volunteer_goal >= 0
        ),
    ADD COLUMN IF NOT EXISTS volunteer_outcome integer
        CONSTRAINT campaign_events_volunteer_outcome_nonneg CHECK (
            volunteer_outcome IS NULL OR volunteer_outcome >= 0
        ),
    ADD COLUMN IF NOT EXISTS voter_contact_goal integer
        CONSTRAINT campaign_events_voter_contact_goal_nonneg CHECK (
            voter_contact_goal IS NULL OR voter_contact_goal >= 0
        ),
    ADD COLUMN IF NOT EXISTS voter_contact_outcome integer
        CONSTRAINT campaign_events_voter_contact_outcome_nonneg CHECK (
            voter_contact_outcome IS NULL OR voter_contact_outcome >= 0
        ),
    ADD COLUMN IF NOT EXISTS fundraising_goal numeric(14, 2),
    ADD COLUMN IF NOT EXISTS fundraising_outcome numeric(14, 2),
    ADD COLUMN IF NOT EXISTS issues_captured jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS endorsements_or_influencers_identified jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS followup_completion_score numeric(5, 2)
        CONSTRAINT campaign_events_followup_completion_range CHECK (
            followup_completion_score IS NULL
            OR (followup_completion_score >= 0 AND followup_completion_score <= 100)
        ),
    ADD COLUMN IF NOT EXISTS intelligence_summary text;

COMMENT ON COLUMN public.campaign_events.operational_status IS
    'Pipeline lifecycle: draft → … → archived (distinct from legacy `status` until unified).';

COMMENT ON COLUMN public.campaign_events.required_roles IS
    'JSON array of role slugs (e.g. event_staffing matrix slugs) required for execution.';

COMMENT ON COLUMN public.campaign_events.issues_captured IS
    'Structured issue notes from the field (JSON array of objects or strings).';

COMMENT ON COLUMN public.campaign_events.endorsements_or_influencers_identified IS
    'Structured endorsements / local validators identified at the event.';

CREATE INDEX IF NOT EXISTS campaign_events_operational_status_start_idx
    ON public.campaign_events (operational_status, start_at);

CREATE INDEX IF NOT EXISTS campaign_events_objective_start_idx
    ON public.campaign_events (event_objective, start_at)
    WHERE event_objective IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_events_scope_county_idx
    ON public.campaign_events (event_scope, county_id, start_at)
    WHERE county_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_events_parent_event_idx
    ON public.campaign_events (parent_event_id)
    WHERE parent_event_id IS NOT NULL;

-- Backfill operational_status from legacy status (best-effort mapping).
UPDATE public.campaign_events
SET operational_status = CASE lower(trim(status))
    WHEN 'draft' THEN 'draft'
    WHEN 'submitted' THEN 'planning'
    WHEN 'approved' THEN 'scheduled'
    WHEN 'scheduled' THEN 'scheduled'
    WHEN 'published_internal' THEN 'in_prep'
    WHEN 'published_public' THEN 'ready'
    WHEN 'completed' THEN 'completed'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'archived' THEN 'archived'
    ELSE 'draft'
END
WHERE operational_status = 'draft';
