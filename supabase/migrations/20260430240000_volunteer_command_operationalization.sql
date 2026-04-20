-- Volunteer Command operationalization (Step 2.3): durable onboarding checklist,
-- assignment escalation + reminders, leadership signals on reliability summaries.

-- ---------------------------------------------------------------------------
-- volunteers: onboarding timestamps
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteers
    ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz;

ALTER TABLE public.volunteers
    ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- volunteer_onboarding_checklist_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_onboarding_checklist_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
    checklist_slug text NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    due_at timestamptz,
    completed_at timestamptz,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT volunteer_onboarding_checklist_unique UNIQUE (volunteer_id, checklist_slug)
);

CREATE INDEX IF NOT EXISTS volunteer_onboarding_checklist_volunteer_idx
    ON public.volunteer_onboarding_checklist_items (volunteer_id);

-- ---------------------------------------------------------------------------
-- volunteer_assignments: escalation
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_assignments
    ADD COLUMN IF NOT EXISTS escalation_state text
        CHECK (
            escalation_state IS NULL
            OR escalation_state IN (
                'none', 'pending_reminder', 'reminded', 'escalated_team_lead',
                'escalated_coordinator', 'cleared'
            )
        );

-- ---------------------------------------------------------------------------
-- volunteer_assignment_reminders (per-assignment, durable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_assignment_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.volunteer_assignments (id) ON DELETE CASCADE,
    reminder_type text NOT NULL,
    scheduled_for timestamptz NOT NULL,
    sent_at timestamptz,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'skipped', 'escalated', 'cleared')),
    escalation_target uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_assignment_reminders_assignment_idx
    ON public.volunteer_assignment_reminders (assignment_id);

CREATE INDEX IF NOT EXISTS volunteer_assignment_reminders_scheduled_idx
    ON public.volunteer_assignment_reminders (scheduled_for, status)
    WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- volunteer_reliability_summaries: leadership signals (recommendations, not promotions)
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_reliability_summaries
    ADD COLUMN IF NOT EXISTS leadership_signals text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_onboarding_checklist_scope ON public.volunteer_onboarding_checklist_items;
CREATE POLICY volunteer_onboarding_checklist_scope ON public.volunteer_onboarding_checklist_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_onboarding_checklist_items.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.volunteers v
            WHERE v.id = volunteer_onboarding_checklist_items.volunteer_id
              AND (
                  v.profile_id = public.campaign_profile_id_for_auth()
                  OR public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth())
              )
        )
    );

DROP POLICY IF EXISTS volunteer_assignment_reminders_coordinator ON public.volunteer_assignment_reminders;
CREATE POLICY volunteer_assignment_reminders_coordinator ON public.volunteer_assignment_reminders
    FOR ALL TO authenticated
    USING (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_volunteer_command_coordinator(public.campaign_profile_id_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_onboarding_checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_assignment_reminders TO authenticated;
