-- Ensure public.volunteer_task_assignments exists for projects where earlier migrations did not
-- apply (e.g. ordering issues) or the table was dropped. Requires volunteer_tasks + campaign_profiles.
--
-- App: src/hooks/useVolunteerTasks.ts expects: id, task_id, assignee_profile_id, template_key,
-- status, assigned_at, due_at, claimed_at, checklist_progress, completed_at (+ join to volunteer_tasks).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'volunteer_tasks'
    ) THEN
        RAISE EXCEPTION
            'public.volunteer_tasks must exist before volunteer_task_assignments. Apply migration 20260429120000_volunteer_coordinator_task_system.sql (or full chain) first.';
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.volunteer_task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.volunteer_tasks (id) ON DELETE CASCADE,
    assignee_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    template_key text NOT NULL,
    assigned_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    due_at timestamptz,
    status text NOT NULL DEFAULT 'assigned',
    completion_notes text,
    completed_at timestamptz
);

ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS checklist_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS decline_reason text;

ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS context_pipeline_id uuid;

-- FK to pipeline when that table exists (intern layer migration may have run without this table).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'volunteer_contact_pipeline'
    )
       AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'volunteer_task_assignments_context_pipeline_id_fkey'
    ) THEN
        ALTER TABLE public.volunteer_task_assignments
            ADD CONSTRAINT volunteer_task_assignments_context_pipeline_id_fkey
            FOREIGN KEY (context_pipeline_id)
            REFERENCES public.volunteer_contact_pipeline (id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

ALTER TABLE public.volunteer_task_assignments
    DROP CONSTRAINT IF EXISTS volunteer_task_assignments_status_check;

ALTER TABLE public.volunteer_task_assignments
    ADD CONSTRAINT volunteer_task_assignments_status_check CHECK (
        status IN (
            'assigned',
            'in_progress',
            'completed',
            'blocked',
            'skipped',
            'declined'
        )
    );

CREATE INDEX IF NOT EXISTS volunteer_task_assignments_assignee_status_idx
    ON public.volunteer_task_assignments (assignee_profile_id, status);

DROP INDEX IF EXISTS volunteer_task_one_active_per_template;

CREATE UNIQUE INDEX IF NOT EXISTS volunteer_task_one_active_per_template
    ON public.volunteer_task_assignments (assignee_profile_id, template_key)
    WHERE status IN ('assigned', 'in_progress', 'blocked');

COMMENT ON TABLE public.volunteer_task_assignments IS
    'Assignee workload: one row per volunteer per task instance; status drives inbox.';

COMMENT ON COLUMN public.volunteer_task_assignments.claimed_at IS
    'When the volunteer claimed / started work (in_progress).';

COMMENT ON COLUMN public.volunteer_task_assignments.checklist_progress IS
    'Volunteer checklist state: keys = item ids, values = true when checked.';

ALTER TABLE public.volunteer_task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_task_assignments_select_scope ON public.volunteer_task_assignments;

CREATE POLICY volunteer_task_assignments_select_scope ON public.volunteer_task_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = volunteer_task_assignments.assignee_profile_id
              AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.volunteer_supervisor_teams st
            WHERE st.supervisor_profile_id = (
                SELECT id FROM public.campaign_profiles WHERE user_id = auth.uid() LIMIT 1
            )
            JOIN public.power5_team_memberships m
                ON m.team_id = st.team_id
               AND m.profile_id = volunteer_task_assignments.assignee_profile_id
        )
    );

GRANT SELECT ON public.volunteer_task_assignments TO authenticated;
