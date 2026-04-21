-- Volunteer Throughput Engine — append-only operational event log (metrics derivation + audit).
-- Does not replace existing volunteer_assignments / volunteers / opportunities; supplements them.

CREATE TABLE IF NOT EXISTS public.volunteer_throughput_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    volunteer_id uuid REFERENCES public.volunteers (id) ON DELETE CASCADE,
    throughput_stage text NOT NULL,
    event_kind text NOT NULL
        CHECK (
            event_kind IN (
                'lifecycle',
                'reminder',
                'assignment',
                'opportunity',
                'coordination',
                'system'
            )
        ),
    assignment_id uuid REFERENCES public.volunteer_assignments (id) ON DELETE SET NULL,
    opportunity_id uuid REFERENCES public.volunteer_opportunities (id) ON DELETE SET NULL,
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_throughput_stage_nonempty CHECK (char_length(trim(throughput_stage)) > 0)
);

CREATE INDEX IF NOT EXISTS volunteer_throughput_events_campaign_created_idx
    ON public.volunteer_throughput_events (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS volunteer_throughput_events_volunteer_created_idx
    ON public.volunteer_throughput_events (volunteer_id, created_at DESC)
    WHERE volunteer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS volunteer_throughput_events_stage_idx
    ON public.volunteer_throughput_events (campaign_id, throughput_stage);

ALTER TABLE public.volunteer_throughput_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_throughput_events_select ON public.volunteer_throughput_events;
CREATE POLICY volunteer_throughput_events_select ON public.volunteer_throughput_events
    FOR SELECT TO authenticated
    USING (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            volunteer_id IS NOT NULL
            AND volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        )
    );

DROP POLICY IF EXISTS volunteer_throughput_events_insert ON public.volunteer_throughput_events;
CREATE POLICY volunteer_throughput_events_insert ON public.volunteer_throughput_events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
        OR (
            volunteer_id IS NOT NULL
            AND volunteer_id = public.volunteer_id_for_profile(public.campaign_profile_id_for_auth())
        )
    );

COMMENT ON TABLE public.volunteer_throughput_events IS
    'Append-only throughput lifecycle / touch events for dashboards and rollups.';

GRANT SELECT, INSERT ON public.volunteer_throughput_events TO authenticated;
