-- Sign-in audit (risk / compliance signal only — not used for auth decisions).
-- Trusted device/session scaffolding for future low-friction re-auth (no IP-only bypass).

CREATE TABLE IF NOT EXISTS public.auth_signin_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    user_agent text,
    client_observed_ip text,
    ip_source text NOT NULL DEFAULT 'client_reported'
        CHECK (ip_source IN ('client_reported', 'edge', 'unknown')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auth_signin_events_user_occurred_idx
    ON public.auth_signin_events (user_id, occurred_at DESC);

COMMENT ON TABLE public.auth_signin_events IS
    'Audit trail for successful sign-ins. IP is a signal only; true client IP should be captured via edge/Netlify later.';

ALTER TABLE public.auth_signin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_signin_events_select_own ON public.auth_signin_events;
CREATE POLICY auth_signin_events_select_own ON public.auth_signin_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

REVOKE ALL ON public.auth_signin_events FROM PUBLIC;
GRANT SELECT ON public.auth_signin_events TO authenticated;

-- Trusted devices (remember-device scaffold; does not bypass password auth).
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL,
    label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    last_ip text,
    last_user_agent text,
    revoked_at timestamptz,
    CONSTRAINT trusted_devices_user_fp UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS trusted_devices_user_idx ON public.trusted_devices (user_id);

COMMENT ON TABLE public.trusted_devices IS
    'Optional remembered devices for future UX; never used as sole authentication.';

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trusted_devices_select_own ON public.trusted_devices;
CREATE POLICY trusted_devices_select_own ON public.trusted_devices
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

REVOKE ALL ON public.trusted_devices FROM PUBLIC;
GRANT SELECT ON public.trusted_devices TO authenticated;

-- Session scaffold rows (pair with device + refresh strategy in a later pass).
CREATE TABLE IF NOT EXISTS public.trusted_session_scaffold (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    trusted_device_id uuid REFERENCES public.trusted_devices (id) ON DELETE SET NULL,
    session_label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    last_ip text,
    last_user_agent text,
    expires_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS trusted_session_scaffold_user_idx
    ON public.trusted_session_scaffold (user_id, last_seen_at DESC);

COMMENT ON TABLE public.trusted_session_scaffold IS
    'Placeholder for trusted session records; wire to refresh/reauth policy in a later migration.';

ALTER TABLE public.trusted_session_scaffold ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trusted_session_scaffold_select_own ON public.trusted_session_scaffold;
CREATE POLICY trusted_session_scaffold_select_own ON public.trusted_session_scaffold
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

REVOKE ALL ON public.trusted_session_scaffold FROM PUBLIC;
GRANT SELECT ON public.trusted_session_scaffold TO authenticated;

CREATE OR REPLACE FUNCTION public.record_signin_audit_event(
    p_user_agent text DEFAULT NULL,
    p_client_observed_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.auth_signin_events (
        user_id,
        user_agent,
        client_observed_ip,
        ip_source
    )
    VALUES (
        auth.uid(),
        NULLIF(trim(p_user_agent), ''),
        NULLIF(trim(p_client_observed_ip), ''),
        'client_reported'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_signin_audit_event(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_signin_audit_event(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_trusted_device_scaffold(
    p_device_fingerprint text,
    p_user_agent text DEFAULT NULL,
    p_client_observed_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_device_fingerprint IS NULL OR trim(p_device_fingerprint) = '' THEN
        RAISE EXCEPTION 'device fingerprint required' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.trusted_devices (
        user_id,
        device_fingerprint,
        label,
        last_seen_at,
        last_ip,
        last_user_agent
    )
    VALUES (
        auth.uid(),
        trim(p_device_fingerprint),
        'This device',
        now(),
        NULLIF(trim(p_client_observed_ip), ''),
        NULLIF(trim(p_user_agent), '')
    )
    ON CONFLICT (user_id, device_fingerprint) DO UPDATE SET
        last_seen_at = now(),
        last_ip = COALESCE(EXCLUDED.last_ip, public.trusted_devices.last_ip),
        last_user_agent = COALESCE(EXCLUDED.last_user_agent, public.trusted_devices.last_user_agent)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_trusted_device_scaffold(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_trusted_device_scaffold(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_trusted_session_scaffold(
    p_trusted_device_id uuid,
    p_user_agent text DEFAULT NULL,
    p_client_observed_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.trusted_session_scaffold (
        user_id,
        trusted_device_id,
        session_label,
        last_seen_at,
        last_ip,
        last_user_agent
    )
    VALUES (
        auth.uid(),
        p_trusted_device_id,
        'browser',
        now(),
        NULLIF(trim(p_client_observed_ip), ''),
        NULLIF(trim(p_user_agent), '')
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_trusted_session_scaffold(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_trusted_session_scaffold(uuid, text, text) TO authenticated;
