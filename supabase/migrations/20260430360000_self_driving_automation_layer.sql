-- Self-Driving Automation Layer — auditable queue + trigger log (additive).

-- ---------------------------------------------------------------------------
-- campaign_automation_trigger_events — append-only record of evaluations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_automation_trigger_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    trigger_type text NOT NULL,
    dedupe_key text NOT NULL,
    severity text NOT NULL
        CHECK (severity IN ('info', 'watch', 'high', 'critical')),
    confidence text NOT NULL DEFAULT 'medium'
        CHECK (confidence IN ('low', 'medium', 'high')),
    title text NOT NULL,
    explanation text NOT NULL,
    target_type text
        CHECK (
            target_type IS NULL
            OR target_type IN ('event', 'county', 'campaign', 'volunteer', 'none')
        ),
    target_id uuid,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS campaign_automation_trigger_events_campaign_idx
    ON public.campaign_automation_trigger_events (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_automation_trigger_events_type_idx
    ON public.campaign_automation_trigger_events (trigger_type, created_at DESC);

COMMENT ON TABLE public.campaign_automation_trigger_events IS
    'Append-only automation trigger firings (deterministic evaluations; audit).';

-- ---------------------------------------------------------------------------
-- campaign_automation_actions — operational queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_automation_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    dedupe_key text NOT NULL,
    trigger_type text NOT NULL,
    severity text NOT NULL
        CHECK (severity IN ('info', 'watch', 'high', 'critical')),
    confidence text NOT NULL DEFAULT 'medium'
        CHECK (confidence IN ('low', 'medium', 'high')),
    title text NOT NULL,
    explanation text NOT NULL,
    owner_role_hint text,
    intervention_kind text NOT NULL
        CHECK (
            intervention_kind IN (
                'route',
                'task_suggestion',
                'reminder_suggestion',
                'approval_request',
                'escalation',
                'advisory'
            )
        ),
    execution_mode text NOT NULL
        CHECK (
            execution_mode IN (
                'auto_tracked',
                'requires_approval',
                'advisory_only'
            )
        ),
    route_path text,
    target_type text
        CHECK (
            target_type IS NULL
            OR target_type IN ('event', 'county', 'campaign', 'volunteer', 'none')
        ),
    target_id uuid,
    status text NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'snoozed',
                'awaiting_approval',
                'closed'
            )
        ),
    approval_state text NOT NULL DEFAULT 'not_required'
        CHECK (
            approval_state IN (
                'not_required',
                'pending',
                'approved',
                'rejected'
            )
        ),
    snoozed_until timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    closed_reason text
        CHECK (
            closed_reason IS NULL
            OR closed_reason IN (
                'completed',
                'dismissed',
                'failed',
                'superseded',
                'rejected',
                'expired'
            )
        ),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    created_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS campaign_automation_actions_campaign_status_idx
    ON public.campaign_automation_actions (campaign_id, status, severity);

CREATE INDEX IF NOT EXISTS campaign_automation_actions_open_due_idx
    ON public.campaign_automation_actions (campaign_id, status)
    WHERE status IN ('open', 'snoozed', 'awaiting_approval');

CREATE UNIQUE INDEX IF NOT EXISTS campaign_automation_actions_dedupe_open_idx
    ON public.campaign_automation_actions (campaign_id, dedupe_key)
    WHERE status IN ('open', 'snoozed', 'awaiting_approval');

COMMENT ON TABLE public.campaign_automation_actions IS
    'Orchestration queue: deterministic recommendations and approval-gated items.';

DROP TRIGGER IF EXISTS trg_campaign_automation_actions_updated_at ON public.campaign_automation_actions;
CREATE TRIGGER trg_campaign_automation_actions_updated_at
    BEFORE UPDATE ON public.campaign_automation_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_automation_audit_log — decisions & mutations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_automation_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    action_id uuid REFERENCES public.campaign_automation_actions (id) ON DELETE SET NULL,
    event_kind text NOT NULL
        CHECK (
            event_kind IN (
                'trigger_logged',
                'action_created',
                'status_change',
                'approval',
                'snooze',
                'dismiss',
                'complete',
                'sync_eval'
            )
        ),
    actor_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    message text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_automation_audit_log_action_idx
    ON public.campaign_automation_audit_log (action_id, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_automation_audit_log_campaign_idx
    ON public.campaign_automation_audit_log (campaign_id, created_at DESC);

COMMENT ON TABLE public.campaign_automation_audit_log IS
    'Append-only automation governance audit.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_automation_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_automation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_automation_trigger_events_select ON public.campaign_automation_trigger_events;
CREATE POLICY campaign_automation_trigger_events_select ON public.campaign_automation_trigger_events
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_automation_trigger_events_insert ON public.campaign_automation_trigger_events;
CREATE POLICY campaign_automation_trigger_events_insert ON public.campaign_automation_trigger_events
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_automation_actions_select ON public.campaign_automation_actions;
CREATE POLICY campaign_automation_actions_select ON public.campaign_automation_actions
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_automation_actions_insert ON public.campaign_automation_actions;
CREATE POLICY campaign_automation_actions_insert ON public.campaign_automation_actions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_automation_actions_update ON public.campaign_automation_actions;
CREATE POLICY campaign_automation_actions_update ON public.campaign_automation_actions
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_automation_audit_select ON public.campaign_automation_audit_log;
CREATE POLICY campaign_automation_audit_select ON public.campaign_automation_audit_log
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_automation_audit_insert ON public.campaign_automation_audit_log;
CREATE POLICY campaign_automation_audit_insert ON public.campaign_automation_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT ON public.campaign_automation_trigger_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_automation_actions TO authenticated;
GRANT SELECT, INSERT ON public.campaign_automation_audit_log TO authenticated;

-- ---------------------------------------------------------------------------
-- Snapshot view — open queue by severity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.campaign_automation_open_queue_v1 AS
SELECT
    a.id,
    a.campaign_id,
    a.dedupe_key,
    a.trigger_type,
    a.severity,
    a.confidence,
    a.title,
    a.explanation,
    a.owner_role_hint,
    a.intervention_kind,
    a.execution_mode,
    a.route_path,
    a.target_type,
    a.target_id,
    a.status,
    a.approval_state,
    a.snoozed_until,
    a.created_at,
    a.updated_at
FROM public.campaign_automation_actions a
WHERE a.status IN ('open', 'snoozed', 'awaiting_approval');

COMMENT ON VIEW public.campaign_automation_open_queue_v1 IS
    'Open automation actions (orchestration desk).';

GRANT SELECT ON public.campaign_automation_open_queue_v1 TO authenticated;
