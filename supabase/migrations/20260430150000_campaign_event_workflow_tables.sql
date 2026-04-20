-- Blueprint 15 — Migration 2: stage tracking, template-derived tasks, staffing, logistics.

-- ---------------------------------------------------------------------------
-- campaign_event_stage_state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_stage_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    stage_slug text NOT NULL,
    is_complete boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    completed_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    blocked_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaign_event_stage_state_event_stage_key UNIQUE (event_id, stage_slug)
);

CREATE INDEX IF NOT EXISTS campaign_event_stage_state_event_idx
    ON public.campaign_event_stage_state (event_id);

DROP TRIGGER IF EXISTS trg_campaign_event_stage_state_updated_at ON public.campaign_event_stage_state;
CREATE TRIGGER trg_campaign_event_stage_state_updated_at
    BEFORE UPDATE ON public.campaign_event_stage_state
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_task_instances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_task_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    template_slug text NOT NULL,
    title text NOT NULL,
    description text,
    stage_slug text NOT NULL,
    required boolean NOT NULL DEFAULT true,
    owner_role text NOT NULL,
    assigned_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'skipped')),
    due_at timestamptz,
    dependency_slugs text[],
    completion_rule text,
    completion_field_key text,
    escalation_after_hours integer,
    notes text,
    completed_at timestamptz,
    completed_by_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_event_task_instances_event_idx
    ON public.campaign_event_task_instances (event_id);

CREATE INDEX IF NOT EXISTS campaign_event_task_instances_status_due_idx
    ON public.campaign_event_task_instances (status, due_at);

DROP TRIGGER IF EXISTS trg_campaign_event_task_instances_updated_at ON public.campaign_event_task_instances;
CREATE TRIGGER trg_campaign_event_task_instances_updated_at
    BEFORE UPDATE ON public.campaign_event_task_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_staffing_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_staffing_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    staff_role_slug text NOT NULL,
    assigned_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    assigned_display_name text,
    shift_label text,
    shift_start_at timestamptz,
    shift_end_at timestamptz,
    status text NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'confirmed', 'declined', 'completed', 'no_show')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_event_staffing_event_idx
    ON public.campaign_event_staffing_assignments (event_id);

DROP TRIGGER IF EXISTS trg_campaign_event_staffing_updated_at ON public.campaign_event_staffing_assignments;
CREATE TRIGGER trg_campaign_event_staffing_updated_at
    BEFORE UPDATE ON public.campaign_event_staffing_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_event_logistics_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_event_logistics_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campaign_events (id) ON DELETE CASCADE,
    logistics_slug text NOT NULL,
    label text NOT NULL,
    required boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'ready', 'blocked', 'n_a')),
    owner_role text,
    assigned_user_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_event_logistics_event_idx
    ON public.campaign_event_logistics_items (event_id);

DROP TRIGGER IF EXISTS trg_campaign_event_logistics_updated_at ON public.campaign_event_logistics_items;
CREATE TRIGGER trg_campaign_event_logistics_updated_at
    BEFORE UPDATE ON public.campaign_event_logistics_items
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_campaign_event_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (mirror parent event: editors get full CRUD; all authenticated read)
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_event_stage_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_staffing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_event_logistics_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_event_stage_state_select ON public.campaign_event_stage_state;
CREATE POLICY campaign_event_stage_state_select ON public.campaign_event_stage_state
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_stage_state_insert ON public.campaign_event_stage_state;
CREATE POLICY campaign_event_stage_state_insert ON public.campaign_event_stage_state
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_stage_state_update ON public.campaign_event_stage_state;
CREATE POLICY campaign_event_stage_state_update ON public.campaign_event_stage_state
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_stage_state_delete ON public.campaign_event_stage_state;
CREATE POLICY campaign_event_stage_state_delete ON public.campaign_event_stage_state
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_task_instances_select ON public.campaign_event_task_instances;
CREATE POLICY campaign_event_task_instances_select ON public.campaign_event_task_instances
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_task_instances_insert ON public.campaign_event_task_instances;
CREATE POLICY campaign_event_task_instances_insert ON public.campaign_event_task_instances
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_task_instances_update ON public.campaign_event_task_instances;
CREATE POLICY campaign_event_task_instances_update ON public.campaign_event_task_instances
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_task_instances_delete ON public.campaign_event_task_instances;
CREATE POLICY campaign_event_task_instances_delete ON public.campaign_event_task_instances
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_staffing_select ON public.campaign_event_staffing_assignments;
CREATE POLICY campaign_event_staffing_select ON public.campaign_event_staffing_assignments
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_staffing_insert ON public.campaign_event_staffing_assignments;
CREATE POLICY campaign_event_staffing_insert ON public.campaign_event_staffing_assignments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_staffing_update ON public.campaign_event_staffing_assignments;
CREATE POLICY campaign_event_staffing_update ON public.campaign_event_staffing_assignments
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_staffing_delete ON public.campaign_event_staffing_assignments;
CREATE POLICY campaign_event_staffing_delete ON public.campaign_event_staffing_assignments
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_logistics_select ON public.campaign_event_logistics_items;
CREATE POLICY campaign_event_logistics_select ON public.campaign_event_logistics_items
    FOR SELECT TO authenticated
    USING (public.campaign_profile_id_for_auth() IS NOT NULL);

DROP POLICY IF EXISTS campaign_event_logistics_insert ON public.campaign_event_logistics_items;
CREATE POLICY campaign_event_logistics_insert ON public.campaign_event_logistics_items
    FOR INSERT TO authenticated
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_logistics_update ON public.campaign_event_logistics_items;
CREATE POLICY campaign_event_logistics_update ON public.campaign_event_logistics_items
    FOR UPDATE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS campaign_event_logistics_delete ON public.campaign_event_logistics_items;
CREATE POLICY campaign_event_logistics_delete ON public.campaign_event_logistics_items
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_stage_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_task_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_staffing_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_event_logistics_items TO authenticated;
