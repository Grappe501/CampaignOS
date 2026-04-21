-- Fundraising & resource allocation (DB truth for revenue, spend, budgets, deployments).
-- RLS: financial detail restricted to campaign event editors (leadership/finance desk).

-- ---------------------------------------------------------------------------
-- Fund source dimension
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_fund_sources (
    slug text PRIMARY KEY,
    label text NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0
);

INSERT INTO public.campaign_fund_sources (slug, label, sort_order) VALUES
    ('individual_donor', 'Individual donor', 10),
    ('event_fundraiser', 'Event / house party', 20),
    ('digital', 'Digital / online', 30),
    ('major_donor', 'Major donor', 40),
    ('pac_other', 'PAC / other compliance', 50)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Donations (no donor PII — tiers + internal notes only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_donations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    fund_source_slug text NOT NULL REFERENCES public.campaign_fund_sources (slug),
    amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
    donor_amount_tier text NOT NULL DEFAULT 'unknown'
        CHECK (donor_amount_tier IN ('under_100', '100_500', '500_2500', '2500_plus', 'unknown')),
    channel text NOT NULL DEFAULT 'unknown'
        CHECK (channel IN ('online', 'event', 'mail', 'in_person', 'other', 'unknown')),
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    county_id text,
    recorded_by_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    received_at timestamptz NOT NULL DEFAULT now(),
    notes_internal text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_donations_received_idx
    ON public.campaign_donations (received_at DESC);
CREATE INDEX IF NOT EXISTS campaign_donations_event_idx ON public.campaign_donations (event_id);
CREATE INDEX IF NOT EXISTS campaign_donations_county_idx ON public.campaign_donations (county_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    expense_category text NOT NULL
        CHECK (expense_category IN (
            'event', 'staffing', 'media', 'field_ops', 'admin', 'gotv', 'other'
        )),
    amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
    vendor_label text,
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    county_id text,
    recorded_by_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    incurred_at timestamptz NOT NULL DEFAULT now(),
    notes_internal text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_expenses_incurred_idx
    ON public.campaign_expenses (incurred_at DESC);
CREATE INDEX IF NOT EXISTS campaign_expenses_event_idx ON public.campaign_expenses (event_id);
CREATE INDEX IF NOT EXISTS campaign_expenses_category_idx ON public.campaign_expenses (expense_category);

-- ---------------------------------------------------------------------------
-- Budget allocation lines (planned envelopes — not accrual accounting)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_budget_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    period_start date NOT NULL,
    period_end date NOT NULL,
    budget_category text NOT NULL
        CHECK (budget_category IN (
            'event', 'staffing', 'media', 'field_ops', 'admin', 'gotv', 'reserve', 'other'
        )),
    allocated_amount numeric(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    county_id text,
    priority_weight smallint NOT NULL DEFAULT 50 CHECK (priority_weight >= 0 AND priority_weight <= 100),
    notes_internal text,
    recorded_by_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_budget_period_ok CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS campaign_budget_period_idx
    ON public.campaign_budget_allocations (period_start, period_end);

-- ---------------------------------------------------------------------------
-- Resource deployment log (strategic moves — media, field surge, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_resource_deployments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    deployment_kind text NOT NULL
        CHECK (deployment_kind IN (
            'media_buy', 'field_surge', 'staff_capacity', 'event_support', 'gotv_infrastructure', 'tech', 'other'
        )),
    amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
    county_id text,
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    rationale text,
    recorded_by_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    deployed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_resource_deployments_deployed_idx
    ON public.campaign_resource_deployments (deployed_at DESC);

-- ---------------------------------------------------------------------------
-- Leadership summary (aggregates only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_leadership_summary()
RETURNS TABLE (
    total_donations numeric,
    total_expenses numeric,
    donation_count bigint,
    expense_count bigint,
    expense_by_category jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH d AS (
        SELECT coalesce(sum(amount), 0)::numeric(14, 2) AS s, count(*)::bigint AS c
        FROM public.campaign_donations
        WHERE public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
    ),
    e AS (
        SELECT coalesce(sum(amount), 0)::numeric(14, 2) AS s, count(*)::bigint AS c
        FROM public.campaign_expenses
        WHERE public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
    ),
    by_cat AS (
        SELECT expense_category, coalesce(sum(amount), 0)::numeric(14, 2) AS amt
        FROM public.campaign_expenses
        WHERE public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
        GROUP BY expense_category
    )
    SELECT
        d.s AS total_donations,
        e.s AS total_expenses,
        d.c AS donation_count,
        e.c AS expense_count,
        coalesce(
            (SELECT jsonb_object_agg(expense_category, amt) FROM by_cat),
            '{}'::jsonb
        ) AS expense_by_category
    FROM d, e;
$$;

REVOKE ALL ON FUNCTION public.finance_leadership_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_leadership_summary() TO authenticated;

COMMENT ON TABLE public.campaign_donations IS
    'Finance desk: revenue entries — no donor PII; leadership aggregates via finance_leadership_summary.';
COMMENT ON TABLE public.campaign_expenses IS 'Finance desk: expenditure lines tied optionally to events / counties.';

-- ---------------------------------------------------------------------------
-- RLS (editors only for financial rows)
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_fund_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_fund_sources_read ON public.campaign_fund_sources;
CREATE POLICY campaign_fund_sources_read ON public.campaign_fund_sources
    FOR SELECT TO authenticated USING (true);

ALTER TABLE public.campaign_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_donations_editor ON public.campaign_donations;
CREATE POLICY campaign_donations_editor ON public.campaign_donations
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

ALTER TABLE public.campaign_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_expenses_editor ON public.campaign_expenses;
CREATE POLICY campaign_expenses_editor ON public.campaign_expenses
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

ALTER TABLE public.campaign_budget_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_budget_editor ON public.campaign_budget_allocations;
CREATE POLICY campaign_budget_editor ON public.campaign_budget_allocations
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

ALTER TABLE public.campaign_resource_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_resource_deployments_editor ON public.campaign_resource_deployments;
CREATE POLICY campaign_resource_deployments_editor ON public.campaign_resource_deployments
    FOR ALL TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT ON public.campaign_fund_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_budget_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_resource_deployments TO authenticated;
