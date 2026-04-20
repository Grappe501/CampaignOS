-- Blueprint 15 — Migration 4: summary-oriented indexes, helper for listing upcoming events (RPC-ready).
-- Widgets and Agent Jones can call this from the client once wired; dev fixtures remain until then.

COMMENT ON TABLE public.campaign_events IS
    'Primary event row (blueprint 15). Summary RPCs: upcoming by role, pressure counts, Mobilize queue, follow-up, county coverage — add as SECURITY DEFINER functions when productizing.';

-- Cover common coordinator filters on title (optional trigram later).
CREATE INDEX IF NOT EXISTS campaign_events_title_search_idx
    ON public.campaign_events (campaign_id, lower(title));

-- Task instances: template + event for idempotent upserts from config.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_event_task_instances_event_template_key
    ON public.campaign_event_task_instances (event_id, template_slug);

-- Logistics: one row per slug per event.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_event_logistics_event_slug_key
    ON public.campaign_event_logistics_items (event_id, logistics_slug);

-- ---------------------------------------------------------------------------
-- Upcoming events (minimal read API; expand RLS inside function when scoping by county/visibility)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.campaign_events_upcoming(
    p_campaign_id text DEFAULT 'default',
    p_limit integer DEFAULT 25,
    p_after timestamptz DEFAULT now()
)
RETURNS SETOF public.campaign_events
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT e.*
    FROM public.campaign_events e
    WHERE e.campaign_id = p_campaign_id
      AND e.start_at >= p_after
      AND e.status NOT IN ('canceled', 'archived')
    ORDER BY e.start_at ASC
    LIMIT greatest(1, least(p_limit, 200));
$$;

COMMENT ON FUNCTION public.campaign_events_upcoming(text, integer, timestamptz) IS
    'Invoker reads via RLS; returns upcoming non-canceled events for calendar strips.';

GRANT EXECUTE ON FUNCTION public.campaign_events_upcoming(text, integer, timestamptz) TO authenticated;
