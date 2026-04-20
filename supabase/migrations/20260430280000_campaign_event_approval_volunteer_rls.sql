-- Volunteer event submissions: audit columns + RLS so non-editors can INSERT request rows only.
-- Coordinators approve via RPC (SECURITY DEFINER) or existing editor UPDATE policy.

ALTER TABLE public.campaign_events
    ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
    ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
    ADD COLUMN IF NOT EXISTS approval_notes text;

COMMENT ON COLUMN public.campaign_events.approval_required IS
    'True when this row is a volunteer/neighborhood submission awaiting coordinator approval.';

CREATE INDEX IF NOT EXISTS campaign_events_approval_queue_idx
    ON public.campaign_events (operational_status, status, submitted_for_review_at)
    WHERE approval_required = true;

-- ---------------------------------------------------------------------------
-- RLS: allow non–event-editor profiles to INSERT only structured “request” rows
-- (submitted + approval_needed + requester = self). Editors use the existing policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS campaign_events_insert_volunteer_request ON public.campaign_events;
CREATE POLICY campaign_events_insert_volunteer_request ON public.campaign_events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.campaign_profile_id_for_auth() IS NOT NULL
        AND NOT public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
        AND requester_user_id = public.campaign_profile_id_for_auth()
        AND status = 'submitted'
        AND operational_status = 'approval_needed'
        AND approval_required IS TRUE
        AND campaign_id = 'default'
    );

-- Approve / reject (editors only)
CREATE OR REPLACE FUNCTION public.approve_campaign_event_request(
    p_event_id uuid,
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_actor uuid := public.campaign_profile_id_for_auth();
BEGIN
    IF v_actor IS NULL OR NOT public.is_campaign_event_editor(v_actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.campaign_events
    SET
        status = 'approved',
        operational_status = 'scheduled',
        approval_required = false,
        approved_by_user_id = v_actor,
        approved_at = now(),
        rejected_by_user_id = NULL,
        rejected_at = NULL,
        approval_notes = COALESCE(NULLIF(trim(p_notes), ''), approval_notes)
    WHERE id = p_event_id
      AND approval_required = true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.reject_campaign_event_request(
    p_event_id uuid,
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
        approval_notes = COALESCE(NULLIF(trim(p_notes), ''), approval_notes)
    WHERE id = p_event_id
      AND approval_required = true;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.approve_campaign_event_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_campaign_event_request(uuid, text) TO authenticated;
