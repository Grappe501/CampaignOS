-- Rich task workspace (stored specs, checklists), claim tracking, checklist persistence.

ALTER TABLE public.volunteer_task_templates
    ADD COLUMN IF NOT EXISTS workspace_spec jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.volunteer_tasks
    ADD COLUMN IF NOT EXISTS workspace_spec jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.volunteer_task_assignments
    ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
    ADD COLUMN IF NOT EXISTS checklist_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volunteer_task_templates.workspace_spec IS
    'Structured playbook: intro, sections with body + checklist items (JSON). Copied to task row on create.';
COMMENT ON COLUMN public.volunteer_task_assignments.claimed_at IS
    'When the volunteer claimed / started work (in_progress).';
COMMENT ON COLUMN public.volunteer_task_assignments.checklist_progress IS
    'Volunteer checklist state: keys = item ids, values = true when checked.';

-- ---------------------------------------------------------------------------
-- Copy template workspace into new task rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_tasks_copy_workspace_from_template()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        IF NEW.workspace_spec IS NULL
           OR NEW.workspace_spec = '{}'::jsonb
           OR NEW.workspace_spec = 'null'::jsonb THEN
            SELECT COALESCE(t.workspace_spec, '{}'::jsonb)
            INTO NEW.workspace_spec
            FROM public.volunteer_task_templates t
            WHERE t.id = NEW.template_id;
        END IF;
    END IF;
    IF NEW.workspace_spec IS NULL THEN
        NEW.workspace_spec := '{}'::jsonb;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_volunteer_tasks_copy_workspace ON public.volunteer_tasks;
CREATE TRIGGER tr_volunteer_tasks_copy_workspace
    BEFORE INSERT ON public.volunteer_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.volunteer_tasks_copy_workspace_from_template();

-- ---------------------------------------------------------------------------
-- Event types: add claimed
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_task_events
    DROP CONSTRAINT IF EXISTS volunteer_task_events_event_type_check;

ALTER TABLE public.volunteer_task_events
    ADD CONSTRAINT volunteer_task_events_event_type_check CHECK (
        event_type IN (
            'assigned',
            'started',
            'claimed',
            'paused',
            'completed',
            'blocked',
            'skipped',
            'reassigned',
            'nudge'
        )
    );

-- ---------------------------------------------------------------------------
-- Claim = move to in_progress + timestamp + audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_assignment_mark_started(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
    n integer;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL THEN
        RAISE EXCEPTION 'assignment not found';
    END IF;

    IF assignee IS DISTINCT FROM actor
       AND NOT public.volunteer_supervisor_covers_assignee(actor, assignee) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    UPDATE public.volunteer_task_assignments
    SET
        status = 'in_progress',
        claimed_at = COALESCE(claimed_at, now())
    WHERE id = p_assignment_id AND status = 'assigned';

    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
        INSERT INTO public.volunteer_task_events (assignment_id, event_type, actor_profile_id, metadata)
        VALUES (p_assignment_id, 'claimed', actor, '{"action":"claim"}'::jsonb);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Persist checklist toggles (assignee only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_assignment_save_checklist(
    p_assignment_id uuid,
    p_progress jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor uuid := public.volunteer_resolve_actor_profile();
    assignee uuid;
    k text;
    cnt integer := 0;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF p_progress IS NULL OR jsonb_typeof(p_progress) <> 'object' THEN
        RAISE EXCEPTION 'invalid checklist payload';
    END IF;

    SELECT assignee_profile_id INTO assignee
    FROM public.volunteer_task_assignments
    WHERE id = p_assignment_id;

    IF assignee IS NULL OR assignee IS DISTINCT FROM actor THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    FOR k IN SELECT jsonb_object_keys(p_progress)
    LOOP
        cnt := cnt + 1;
        IF cnt > 120 OR length(k) > 96 THEN
            RAISE EXCEPTION 'checklist too large';
        END IF;
    END LOOP;

    UPDATE public.volunteer_task_assignments
    SET checklist_progress = p_progress
    WHERE id = p_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.volunteer_assignment_save_checklist(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enrich templates: event / local hosting playbooks (expand over time)
-- ---------------------------------------------------------------------------
UPDATE public.volunteer_task_templates
SET workspace_spec = '{
  "version": 1,
  "intro": "This is your mission workspace — everything for this task lives here. HQ can add run-of-show, scripts, and day-of checks as the campaign grows. Claim the task when you are ready to own it.",
  "sections": [
    {
      "id": "ros",
      "title": "Run of show (2-hour house gathering)",
      "body": "T-30 min: unlock venue, water, seating, signup materials.\nT-15: nametags + one friendly greeter at the door.\nT-0: welcome (2 min) — why we are here, no pressure.\n+10: personal story + one policy touchpoint (keep it human).\n+25: clear ask — sign up, shift, or bring-a-friend.\nRest: conversation, capture follow-ups, thank everyone.",
      "checklist": [
        {"id": "venue", "label": "Venue access + basics confirmed"},
        {"id": "materials", "label": "HQ-approved signup / QR / one-pager ready"},
        {"id": "captain", "label": "Captain / host briefed on data rules"},
        {"id": "safety", "label": "Safety + accessibility scan done"}
      ]
    },
    {
      "id": "dayof",
      "title": "Day-of checklist",
      "body": "Respect opt-out. No voter intimidation. Photos only with consent. Escalate weird interactions to your coordinator.",
      "checklist": [
        {"id": "opener", "label": "Opening line practiced (under 2 min)"},
        {"id": "close", "label": "Thank-you + follow-up owner assigned"},
        {"id": "debrief", "label": "Quick debrief note for HQ (wins + asks)"}
      ]
    }
  ]
}'::jsonb
WHERE template_key = 'event_host_small_gathering';

UPDATE public.volunteer_task_templates
SET workspace_spec = '{
  "version": 1,
  "intro": "Show up prepared — this workspace can hold venue notes, parking, and your personal talking points.",
  "sections": [
    {
      "id": "before",
      "title": "Before you go",
      "body": "Confirm time + place. Bring a charged phone, pen, and a willingness to listen more than you talk.",
      "checklist": [
        {"id": "calendar", "label": "Calendar hold + travel buffer"},
        {"id": "materials", "label": "Any HQ flyer or link saved offline"}
      ]
    },
    {
      "id": "during",
      "title": "While you are there",
      "body": "Introduce yourself honestly. Ask what people care about. Offer one way to stay involved — not five.",
      "checklist": [
        {"id": "listen", "label": "Asked two open questions before pitching"},
        {"id": "respect", "label": "Honored every no / not now"}
      ]
    }
  ]
}'::jsonb
WHERE template_key = 'event_attend_local';
