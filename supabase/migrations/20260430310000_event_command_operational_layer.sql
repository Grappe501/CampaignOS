-- Step 3.1B — Event command operational layer: health history, approval audit, governance fields.

-- ---------------------------------------------------------------------------
-- Event health score history (explainability + trends)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_health_score_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    current_score integer NOT NULL
        CONSTRAINT event_health_score_history_score_range CHECK (
            current_score >= 0 AND current_score <= 100
        ),
    prior_score integer
        CONSTRAINT event_health_score_history_prior_range CHECK (
            prior_score IS NULL OR (prior_score >= 0 AND prior_score <= 100)
        ),
    score_change integer,
    health_status text NOT NULL
        CONSTRAINT event_health_score_history_status_check CHECK (
            health_status IN ('READY', 'AT_RISK', 'CRITICAL')
        ),
    trend text
        CONSTRAINT event_health_score_history_trend_check CHECK (
            trend IS NULL
            OR trend IN ('improving', 'stable', 'declining', 'critical_drop')
        ),
    components jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
    changed_factors text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_health_score_history_event_created_idx
    ON public.event_health_score_history (event_id, created_at DESC);

COMMENT ON TABLE public.event_health_score_history IS
    'Append-only snapshots for event command health scoring (trends, drill-down).';

-- ---------------------------------------------------------------------------
-- Approval review audit trail (governance / timeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_approval_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    action text NOT NULL
        CONSTRAINT campaign_event_approval_audit_action_check CHECK (
            action IN (
                'request_submitted',
                'note_added',
                'approved',
                'approved_with_conditions',
                'rejected',
                'revision_requested',
                'under_review'
            )
        ),
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_event_approval_audit_event_idx
    ON public.campaign_event_approval_audit (event_id, created_at DESC);

COMMENT ON TABLE public.campaign_event_approval_audit IS
    'Append-only approval workflow events for coordinator review discipline.';

-- ---------------------------------------------------------------------------
-- campaign_events — governance + operational touch
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_events
    ADD COLUMN IF NOT EXISTS approval_review_state text
        CONSTRAINT campaign_events_approval_review_state_check CHECK (
            approval_review_state IS NULL
            OR approval_review_state IN (
                'request_submitted',
                'awaiting_review',
                'under_review',
                'revision_requested',
                'approved',
                'rejected',
                'approved_with_conditions'
            )
        ),
    ADD COLUMN IF NOT EXISTS approval_risk_level text
        CONSTRAINT campaign_events_approval_risk_level_check CHECK (
            approval_risk_level IS NULL
            OR approval_risk_level IN ('low', 'medium', 'high')
        ),
    ADD COLUMN IF NOT EXISTS approval_precheck_snapshot jsonb,
    ADD COLUMN IF NOT EXISTS request_origin_surface text,
    ADD COLUMN IF NOT EXISTS approval_residual_conditions text,
    ADD COLUMN IF NOT EXISTS approval_followup_required boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_operational_touch_at timestamptz;

COMMENT ON COLUMN public.campaign_events.approval_residual_conditions IS
    'When approval is granted with conditions, residual obligations remain visible until cleared.';

-- ---------------------------------------------------------------------------
-- Approve RPC — optional conditions mode (approved_with_conditions)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_campaign_event_request(
    p_event_id uuid,
    p_notes text DEFAULT NULL,
    p_conditions text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_actor uuid := public.campaign_profile_id_for_auth();
    v_has_conditions boolean := p_conditions IS NOT NULL AND length(trim(p_conditions)) > 0;
BEGIN
    IF v_actor IS NULL OR NOT public.is_campaign_event_editor(v_actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF v_has_conditions THEN
        UPDATE public.campaign_events
        SET
            status = 'approved',
            operational_status = 'scheduled',
            approval_required = false,
            approved_by_user_id = v_actor,
            approved_at = now(),
            rejected_by_user_id = NULL,
            rejected_at = NULL,
            approval_notes = COALESCE(NULLIF(trim(p_notes), ''), approval_notes),
            approval_residual_conditions = NULLIF(trim(p_conditions), ''),
            approval_followup_required = true,
            approval_review_state = 'approved_with_conditions',
            last_operational_touch_at = now()
        WHERE id = p_event_id
          AND approval_required = true;
    ELSE
        UPDATE public.campaign_events
        SET
            status = 'approved',
            operational_status = 'scheduled',
            approval_required = false,
            approved_by_user_id = v_actor,
            approved_at = now(),
            rejected_by_user_id = NULL,
            rejected_at = NULL,
            approval_notes = COALESCE(NULLIF(trim(p_notes), ''), approval_notes),
            approval_residual_conditions = NULL,
            approval_followup_required = false,
            approval_review_state = 'approved',
            last_operational_touch_at = now()
        WHERE id = p_event_id
          AND approval_required = true;
    END IF;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- RLS — new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_health_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_approval_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_health_score_history_select_auth ON public.event_health_score_history;
CREATE POLICY event_health_score_history_select_auth ON public.event_health_score_history
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS event_health_score_history_insert_editors ON public.event_health_score_history;
CREATE POLICY event_health_score_history_insert_editors ON public.event_health_score_history
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_approval_audit_select_auth ON public.campaign_event_approval_audit;
CREATE POLICY campaign_event_approval_audit_select_auth ON public.campaign_event_approval_audit
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_approval_audit_insert_editors ON public.campaign_event_approval_audit;
CREATE POLICY campaign_event_approval_audit_insert_editors ON public.campaign_event_approval_audit
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT ON public.event_health_score_history TO authenticated;
GRANT SELECT, INSERT ON public.campaign_event_approval_audit TO authenticated;

-- Align reject RPC with explicit review state
CREATE OR REPLACE FUNCTION public.reject_campaign_event_request(
    p_event_id uuid,
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rej$
DECLARE
    v_actor uuid := public.campaign_profile_id_for_auth();
BEGIN
    IF v_actor IS NULL OR NOT public.is_campaign_event_editor(v_actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.campaign_events
    SET
        status = 'draft',
        operational_status = 'draft',
        approval_required = false,
        rejected_by_user_id = v_actor,
        rejected_at = now(),
        approval_notes = COALESCE(NULLIF(trim(p_notes), ''), approval_notes),
        approval_review_state = 'rejected',
        approval_followup_required = false,
        approval_residual_conditions = NULL,
        last_operational_touch_at = now()
    WHERE id = p_event_id
      AND approval_required = true;
END;
$rej$;
