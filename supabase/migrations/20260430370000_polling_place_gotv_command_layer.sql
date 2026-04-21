-- Polling place / GOTV command layer — sites, shifts, assignments, incidents (additive).

-- ---------------------------------------------------------------------------
-- campaign_polling_places — turnout sites (early vote, election day, polling place)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_polling_places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    site_kind text NOT NULL
        CHECK (site_kind IN ('early_vote', 'election_day', 'polling_place', 'staging')),
    label text NOT NULL,
    address_line text,
    county_id text,
    precinct_id text,
    city text,
    zone_key text,
    importance smallint NOT NULL DEFAULT 50
        CHECK (importance >= 0 AND importance <= 100),
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'closed')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_polling_places_campaign_county_idx
    ON public.campaign_polling_places (campaign_id, county_id);

CREATE INDEX IF NOT EXISTS campaign_polling_places_campaign_status_idx
    ON public.campaign_polling_places (campaign_id, status);

COMMENT ON TABLE public.campaign_polling_places IS
    'Turnout command sites — polling / early vote / election day (trusted path).';

-- ---------------------------------------------------------------------------
-- campaign_turnout_site_shifts — staffing requirements per site
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_turnout_site_shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.campaign_polling_places (id) ON DELETE CASCADE,
    role_slug text NOT NULL,
    shift_start timestamptz NOT NULL,
    shift_end timestamptz NOT NULL,
    slots_needed integer NOT NULL DEFAULT 1
        CHECK (slots_needed >= 0 AND slots_needed <= 500),
    notes text,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'filled', 'canceled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_turnout_site_shifts_site_idx
    ON public.campaign_turnout_site_shifts (site_id, shift_start);

COMMENT ON TABLE public.campaign_turnout_site_shifts IS
    'GOTV shift requirements (captain, greeter, runner, etc.).';

-- ---------------------------------------------------------------------------
-- campaign_turnout_site_assignments — volunteer coverage rows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_turnout_site_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id uuid NOT NULL REFERENCES public.campaign_turnout_site_shifts (id) ON DELETE CASCADE,
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    assignment_status text NOT NULL DEFAULT 'invited'
        CHECK (
            assignment_status IN (
                'invited',
                'confirmed',
                'checked_in',
                'no_show',
                'released'
            )
        ),
    confirmed_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_turnout_site_assignments_shift_idx
    ON public.campaign_turnout_site_assignments (shift_id);

CREATE INDEX IF NOT EXISTS campaign_turnout_site_assignments_profile_idx
    ON public.campaign_turnout_site_assignments (campaign_profile_id);

COMMENT ON TABLE public.campaign_turnout_site_assignments IS
    'Volunteer assignments to turnout shifts (confirm / no-show tracked).';

-- ---------------------------------------------------------------------------
-- campaign_turnout_incidents — election-day disruption log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_turnout_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    site_id uuid NOT NULL REFERENCES public.campaign_polling_places (id) ON DELETE CASCADE,
    incident_kind text NOT NULL,
    severity text NOT NULL
        CHECK (severity IN ('info', 'watch', 'high', 'critical')),
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'owned', 'resolved', 'escalated')),
    owner_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    message text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_turnout_incidents_site_idx
    ON public.campaign_turnout_incidents (site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_turnout_incidents_campaign_idx
    ON public.campaign_turnout_incidents (campaign_id, created_at DESC);

COMMENT ON TABLE public.campaign_turnout_incidents IS
    'Operational incidents at turnout sites (mobile-log friendly).';

-- ---------------------------------------------------------------------------
-- campaign_turnout_intervention_log — append-only coordination audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_turnout_intervention_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    site_id uuid REFERENCES public.campaign_polling_places (id) ON DELETE SET NULL,
    intervention_kind text NOT NULL,
    message text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_turnout_intervention_log_campaign_idx
    ON public.campaign_turnout_intervention_log (campaign_id, created_at DESC);

COMMENT ON TABLE public.campaign_turnout_intervention_log IS
    'Append-only turnout command interventions (auditable).';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campaign_polling_places_updated_at ON public.campaign_polling_places;
CREATE TRIGGER trg_campaign_polling_places_updated_at
    BEFORE UPDATE ON public.campaign_polling_places
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_turnout_site_shifts_updated_at ON public.campaign_turnout_site_shifts;
CREATE TRIGGER trg_campaign_turnout_site_shifts_updated_at
    BEFORE UPDATE ON public.campaign_turnout_site_shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_turnout_site_assignments_updated_at ON public.campaign_turnout_site_assignments;
CREATE TRIGGER trg_campaign_turnout_site_assignments_updated_at
    BEFORE UPDATE ON public.campaign_turnout_site_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_turnout_incidents_updated_at ON public.campaign_turnout_incidents;
CREATE TRIGGER trg_campaign_turnout_incidents_updated_at
    BEFORE UPDATE ON public.campaign_turnout_incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_polling_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_turnout_site_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_turnout_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_turnout_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_turnout_intervention_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_polling_places_select ON public.campaign_polling_places;
CREATE POLICY campaign_polling_places_select ON public.campaign_polling_places
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_polling_places_write ON public.campaign_polling_places;
CREATE POLICY campaign_polling_places_write ON public.campaign_polling_places
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_turnout_site_shifts_select ON public.campaign_turnout_site_shifts;
CREATE POLICY campaign_turnout_site_shifts_select ON public.campaign_turnout_site_shifts
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_turnout_site_shifts_write ON public.campaign_turnout_site_shifts;
CREATE POLICY campaign_turnout_site_shifts_write ON public.campaign_turnout_site_shifts
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_turnout_site_assignments_select ON public.campaign_turnout_site_assignments;
CREATE POLICY campaign_turnout_site_assignments_select ON public.campaign_turnout_site_assignments
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_turnout_site_assignments_write ON public.campaign_turnout_site_assignments;
CREATE POLICY campaign_turnout_site_assignments_write ON public.campaign_turnout_site_assignments
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_turnout_incidents_select ON public.campaign_turnout_incidents;
CREATE POLICY campaign_turnout_incidents_select ON public.campaign_turnout_incidents
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_turnout_incidents_write ON public.campaign_turnout_incidents;
CREATE POLICY campaign_turnout_incidents_write ON public.campaign_turnout_incidents
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_turnout_intervention_log_select ON public.campaign_turnout_intervention_log;
CREATE POLICY campaign_turnout_intervention_log_select ON public.campaign_turnout_intervention_log
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_turnout_intervention_log_insert ON public.campaign_turnout_intervention_log;
CREATE POLICY campaign_turnout_intervention_log_insert ON public.campaign_turnout_intervention_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_polling_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_turnout_site_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_turnout_site_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_turnout_incidents TO authenticated;
GRANT SELECT, INSERT ON public.campaign_turnout_intervention_log TO authenticated;

-- ---------------------------------------------------------------------------
-- Open coverage helper view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.campaign_turnout_open_shift_slots_v1 AS
SELECT
    s.id AS shift_id,
    p.id AS site_id,
    p.campaign_id,
    p.label AS site_label,
    p.county_id,
    p.site_kind,
    s.role_slug,
    s.shift_start,
    s.shift_end,
    s.slots_needed,
    COALESCE(a.filled, 0) AS slots_filled,
    GREATEST(0, s.slots_needed - COALESCE(a.filled, 0)) AS slots_open
FROM public.campaign_turnout_site_shifts s
JOIN public.campaign_polling_places p ON p.id = s.site_id
LEFT JOIN (
    SELECT
        shift_id,
        COUNT(*) FILTER (
            WHERE assignment_status IN ('invited', 'confirmed', 'checked_in')
        ) AS filled
    FROM public.campaign_turnout_site_assignments
    GROUP BY shift_id
) a ON a.shift_id = s.id
WHERE s.status = 'open'
  AND p.status = 'active';

COMMENT ON VIEW public.campaign_turnout_open_shift_slots_v1 IS
    'Turnout shifts with open slot counts (command desk).';

GRANT SELECT ON public.campaign_turnout_open_shift_slots_v1 TO authenticated;
