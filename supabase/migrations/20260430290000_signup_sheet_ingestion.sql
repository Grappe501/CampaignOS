-- Signup sheet ingestion: batches, files, rows, import audit, identity match RPC.
-- Identity resolution vs volunteers: county → address → last name → first name.
-- DOB may be captured on paper rows for review/audit only — not used to match profiles
-- (volunteer signup does not collect DOB).

-- ---------------------------------------------------------------------------
-- volunteers: optional normalized county for geographic matching
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteers
    ADD COLUMN IF NOT EXISTS residence_county_normalized text;

CREATE INDEX IF NOT EXISTS volunteers_campaign_county_idx
    ON public.volunteers (campaign_id, residence_county_normalized);

COMMENT ON COLUMN public.volunteers.residence_county_normalized IS
    'Lowercased slug for signup-sheet / ops matching (e.g. pulaski). Optional.';

-- ---------------------------------------------------------------------------
-- signup_sheet_batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signup_sheet_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id text NOT NULL DEFAULT 'default',
    event_id uuid REFERENCES public.campaign_events (id) ON DELETE SET NULL,
    uploaded_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    title text,
    status text NOT NULL DEFAULT 'uploaded'
        CHECK (status IN (
            'uploaded',
            'extracting',
            'ready_for_review',
            'review_in_progress',
            'completed',
            'failed',
            'canceled'
        )),
    row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
    notes_internal text,
    extraction_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_sheet_batches_campaign_idx
    ON public.signup_sheet_batches (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS signup_sheet_batches_event_idx
    ON public.signup_sheet_batches (event_id);

CREATE OR REPLACE FUNCTION public.touch_signup_sheet_batch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_signup_sheet_batches_touch ON public.signup_sheet_batches;
CREATE TRIGGER tr_signup_sheet_batches_touch
    BEFORE UPDATE ON public.signup_sheet_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_signup_sheet_batch_updated_at();

-- ---------------------------------------------------------------------------
-- signup_sheet_files (Supabase Storage object refs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signup_sheet_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES public.signup_sheet_batches (id) ON DELETE CASCADE,
    storage_bucket text NOT NULL DEFAULT 'signup-sheets',
    storage_path text NOT NULL,
    original_filename text,
    content_type text,
    byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT signup_sheet_files_path_unique UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS signup_sheet_files_batch_idx ON public.signup_sheet_files (batch_id);

-- ---------------------------------------------------------------------------
-- signup_sheet_rows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signup_sheet_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES public.signup_sheet_batches (id) ON DELETE CASCADE,
    sheet_row_index integer NOT NULL CHECK (sheet_row_index >= 0),
    raw_cells jsonb NOT NULL DEFAULT '{}'::jsonb,
    extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
    normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
    dob_raw text,
    dob_normalized date,
    review_status text NOT NULL DEFAULT 'pending_review'
        CHECK (review_status IN (
            'pending_extraction',
            'pending_review',
            'confirmed_existing',
            'create_new',
            'unreadable',
            'escalated',
            'skipped',
            'imported',
            'import_failed'
        )),
    confidence numeric(7, 4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    match_reasons text[] NOT NULL DEFAULT '{}',
    match_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
    selected_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    escalation_note text,
    reviewed_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    import_error text,
    imported_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT signup_sheet_rows_batch_index_unique UNIQUE (batch_id, sheet_row_index)
);

CREATE INDEX IF NOT EXISTS signup_sheet_rows_batch_status_idx
    ON public.signup_sheet_rows (batch_id, review_status);

CREATE OR REPLACE FUNCTION public.touch_signup_sheet_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_signup_sheet_rows_touch ON public.signup_sheet_rows;
CREATE TRIGGER tr_signup_sheet_rows_touch
    BEFORE UPDATE ON public.signup_sheet_rows
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_signup_sheet_row_updated_at();

COMMENT ON COLUMN public.signup_sheet_rows.dob_normalized IS
    'Date from paper sheet if parseable; not used for volunteer identity matching.';
COMMENT ON COLUMN public.signup_sheet_rows.match_candidates IS
    'JSON array of {profile_id, volunteer_id, score, reasons[], tier}.';

-- ---------------------------------------------------------------------------
-- Idempotent import outcome per row
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signup_sheet_import_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    signup_sheet_row_id uuid NOT NULL REFERENCES public.signup_sheet_rows (id) ON DELETE CASCADE,
    campaign_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    import_kind text NOT NULL
        CHECK (import_kind IN ('linked_existing', 'staged_new')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    CONSTRAINT signup_sheet_import_links_row_unique UNIQUE (signup_sheet_row_id)
);

CREATE INDEX IF NOT EXISTS signup_sheet_import_links_profile_idx
    ON public.signup_sheet_import_links (campaign_profile_id);

-- ---------------------------------------------------------------------------
-- Access helper: coordinators, admin/staff, interns (role substring 'intern')
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_signup_sheet_operator(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN p_profile_id IS NULL THEN false
        WHEN public.is_campaign_event_editor(p_profile_id) THEN true
        ELSE EXISTS (
            SELECT 1
            FROM public.campaign_profiles cp
            WHERE cp.id = p_profile_id
              AND (
                  lower(coalesce(cp.primary_role, '')) LIKE '%intern%'
                  OR lower(coalesce(cp.primary_role, '')) IN ('admin', 'staff')
              )
        )
    END;
$$;

-- ---------------------------------------------------------------------------
-- Normalize helpers (deterministic; mirrored in app TS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.signup_normalize_county_token(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT nullif(
        lower(
            trim(
                regexp_replace(
                    regexp_replace(coalesce(p_input, ''), '\s+', ' ', 'g'),
                    '\s(county|parish|borough)$',
                    '',
                    'i'
                )
            )
        ),
        ''
    );
$$;

CREATE OR REPLACE FUNCTION public.signup_normalize_name_token(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT nullif(
        lower(trim(regexp_replace(coalesce(p_input, ''), '\s+', ' ', 'g'))),
        ''
    );
$$;

CREATE OR REPLACE FUNCTION public.signup_normalize_address_line(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT nullif(
        lower(
            trim(
                regexp_replace(
                    regexp_replace(coalesce(p_input, ''), '[^a-zA-Z0-9\s]', ' ', 'g'),
                    '\s+',
                    ' ',
                    'g'
                )
            )
        ),
        ''
    );
$$;

-- Simple token sort-of Jaro wrapper: overlap fraction on word sets
CREATE OR REPLACE FUNCTION public.signup_address_overlap_score(a text, b text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
    wa text[];
    wb text[];
    inter int := 0;
    t text;
BEGIN
    IF coalesce(a, '') = '' OR coalesce(b, '') = '' THEN
        RETURN 0;
    END IF;
    IF a = b THEN
        RETURN 1;
    END IF;
    wa := regexp_split_to_array(a, '\s+');
    wb := regexp_split_to_array(b, '\s+');
    FOREACH t IN ARRAY wa LOOP
        IF t <> '' AND t = ANY (wb) THEN
            inter := inter + 1;
        END IF;
    END LOOP;
    RETURN least(1::numeric, (2.0 * inter)::numeric / nullif(array_length(wa, 1) + array_length(wb, 1), 0)::numeric);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.signup_name_similarity(a text, b text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN coalesce(a, '') = '' OR coalesce(b, '') = '' THEN 0::numeric
        WHEN a = b THEN 1::numeric
        WHEN position(a in b) > 0 OR position(b in a) > 0 THEN 0.85::numeric
        ELSE greatest(
            0::numeric,
            1::numeric
                - (abs(length(a) - length(b)))::numeric
                    / greatest(length(a), length(b), 1)::numeric
                * 0.35
        )
    END;
$$;

-- ---------------------------------------------------------------------------
-- Match candidates RPC (SECURITY DEFINER; no DOB vs profile)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.signup_sheet_match_candidates(
    p_campaign_id text,
    p_county text,
    p_address text,
    p_last_name text,
    p_first_name text,
    p_email text,
    p_phone text,
    p_max integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_actor uuid := public.campaign_profile_id_for_auth();
    v_county_n text;
    v_addr_n text;
    v_last_n text;
    v_first_n text;
    v_email_n text;
    v_phone_digits text;
    r RECORD;
    acc jsonb := '[]'::jsonb;
    out jsonb;
    o jsonb;
    score numeric;
    tier text;
    rs text[];
    addr_sim numeric;
    last_sim numeric;
    first_sim numeric;
    n int := 0;
    county_gate text;
BEGIN
    IF NOT public.is_signup_sheet_operator(v_actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    v_county_n := public.signup_normalize_county_token(p_county);
    v_addr_n := public.signup_normalize_address_line(p_address);
    v_last_n := public.signup_normalize_name_token(p_last_name);
    v_first_n := public.signup_normalize_name_token(p_first_name);
    v_email_n := nullif(lower(trim(coalesce(p_email, ''))), '');

    v_phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    IF length(v_phone_digits) < 7 THEN
        v_phone_digits := null;
    END IF;

    FOR r IN
        SELECT
            v.id AS volunteer_id,
            v.profile_id,
            v.display_name,
            v.email,
            v.phone,
            v.location_text,
            v.residence_county_normalized
        FROM public.volunteers v
        WHERE v.campaign_id = p_campaign_id
        ORDER BY v.updated_at DESC NULLS LAST
        LIMIT 4000
    LOOP
        county_gate := 'ok';
        IF v_county_n IS NOT NULL AND r.residence_county_normalized IS NOT NULL THEN
            IF v_county_n <> r.residence_county_normalized THEN
                CONTINUE;
            END IF;
        ELSIF v_county_n IS NOT NULL AND r.residence_county_normalized IS NULL THEN
            county_gate := 'profile_county_missing';
        ELSIF v_county_n IS NULL THEN
            county_gate := 'sheet_county_missing';
        END IF;

        addr_sim := public.signup_address_overlap_score(
            v_addr_n,
            public.signup_normalize_address_line(r.location_text)
        );
        last_sim := public.signup_name_similarity(
            v_last_n,
            public.signup_normalize_name_token(
                CASE
                    WHEN position(' ' in trim(coalesce(r.display_name, ''))) = 0 THEN
                        trim(coalesce(r.display_name, ''))
                    ELSE
                        regexp_replace(trim(coalesce(r.display_name, '')), '^.*\s+', '')
                END
            )
        );

        first_sim := public.signup_name_similarity(
            v_first_n,
            public.signup_normalize_name_token(split_part(trim(coalesce(r.display_name, '')), ' ', 1))
        );

        score := 0::numeric;
        rs := ARRAY[]::text[];

        IF county_gate = 'ok' THEN
            rs := array_append(rs, 'same county (normalized)');
            score := score + 0.28;
        ELSIF county_gate = 'sheet_county_missing' THEN
            rs := array_append(rs, 'county missing on sheet — relying on address and name only');
            score := score + 0.02;
        ELSIF county_gate = 'profile_county_missing' THEN
            rs := array_append(rs, 'sheet county present; profile county missing — weaker match');
            score := score + 0.12;
        END IF;

        IF addr_sim >= 0.65 THEN
            rs := array_append(rs, 'strong address match vs profile location');
            score := score + 0.35 * addr_sim;
        ELSIF addr_sim >= 0.35 THEN
            rs := array_append(rs, 'partial address match');
            score := score + 0.22 * addr_sim;
        ELSIF v_addr_n IS NOT NULL AND coalesce(r.location_text, '') <> '' THEN
            rs := array_append(rs, 'address mismatch or weak — names used with caution');
            score := score + 0.03;
        END IF;

        score := score + 0.22 * last_sim;
        IF last_sim >= 0.9 THEN
            rs := array_append(rs, 'last name match');
        END IF;

        score := score + 0.12 * first_sim;
        IF first_sim >= 0.88 THEN
            rs := array_append(rs, 'first name similarity');
        END IF;

        IF v_email_n IS NOT NULL AND r.email IS NOT NULL AND lower(trim(r.email)) = v_email_n THEN
            score := score + 0.08;
            rs := array_append(rs, 'email exact match');
        END IF;

        IF v_phone_digits IS NOT NULL AND r.phone IS NOT NULL THEN
            IF regexp_replace(r.phone, '\D', '', 'g') = v_phone_digits THEN
                score := score + 0.08;
                rs := array_append(rs, 'phone exact match');
            END IF;
        END IF;

        IF county_gate = 'ok' AND addr_sim >= 0.55 AND last_sim >= 0.88 THEN
            tier := 'high';
        ELSIF score >= 0.55 THEN
            tier := 'medium';
        ELSE
            tier := 'low';
        END IF;

        o := jsonb_build_object(
            'profile_id', r.profile_id,
            'volunteer_id', r.volunteer_id,
            'display_name', r.display_name,
            'score', round(score::numeric, 4),
            'reasons', to_jsonb(rs),
            'tier', tier
        );

        acc := acc || jsonb_build_array(o);
        n := n + 1;
        IF n >= p_max * 3 THEN
            EXIT;
        END IF;
    END LOOP;

    SELECT coalesce(jsonb_agg(x ORDER BY (x->>'score')::numeric DESC), '[]'::jsonb)
    INTO out
    FROM (
        SELECT elem AS x
        FROM jsonb_array_elements(acc) AS elem
        ORDER BY (elem->>'score')::numeric DESC
        LIMIT greatest(1, least(p_max, 50))
    ) s;

    RETURN out;
END;
$fn$;

REVOKE ALL ON FUNCTION public.signup_sheet_match_candidates(text, text, text, text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_sheet_match_candidates(text, text, text, text, text, text, text, integer) TO authenticated;

COMMENT ON FUNCTION public.signup_sheet_match_candidates IS
    'Volunteer match candidates: county + address + names; email/phone boost. DOB excluded.';

CREATE OR REPLACE FUNCTION public.signup_sheet_commit_import(p_row_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_actor uuid := public.campaign_profile_id_for_auth();
    rw public.signup_sheet_rows%ROWTYPE;
BEGIN
    IF NOT public.is_signup_sheet_operator(v_actor) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT * INTO rw FROM public.signup_sheet_rows WHERE id = p_row_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'row_not_found');
    END IF;

    IF rw.review_status = 'imported' THEN
        RETURN jsonb_build_object('ok', true, 'idempotent', true);
    END IF;

    IF rw.review_status NOT IN ('confirmed_existing', 'create_new', 'import_failed') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'blocked_status');
    END IF;

    IF rw.review_status = 'confirmed_existing' AND rw.selected_profile_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'missing_profile');
    END IF;

    INSERT INTO public.signup_sheet_import_links (
        signup_sheet_row_id,
        campaign_profile_id,
        import_kind,
        created_by_profile_id
    )
    VALUES (
        p_row_id,
        rw.selected_profile_id,
        CASE
            WHEN rw.review_status = 'confirmed_existing' THEN 'linked_existing'::text
            WHEN rw.review_status = 'create_new' THEN 'staged_new'::text
            ELSE 'linked_existing'::text
        END,
        v_actor
    )
    ON CONFLICT (signup_sheet_row_id) DO NOTHING;

    UPDATE public.signup_sheet_rows
    SET
        review_status = 'imported',
        imported_at = now(),
        import_error = null,
        updated_at = now()
    WHERE id = p_row_id;

    RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.signup_sheet_commit_import(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_sheet_commit_import(uuid) TO authenticated;

COMMENT ON FUNCTION public.signup_sheet_commit_import IS
    'Auditable import stamp; blocks escalated/unreadable rows. Idempotent when already imported.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.signup_sheet_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_sheet_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_sheet_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_sheet_import_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_sheet_batches_select ON public.signup_sheet_batches;
CREATE POLICY signup_sheet_batches_select ON public.signup_sheet_batches
    FOR SELECT TO authenticated
    USING (
        public.campaign_profile_id_for_auth() IS NOT NULL
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS signup_sheet_batches_insert ON public.signup_sheet_batches;
CREATE POLICY signup_sheet_batches_insert ON public.signup_sheet_batches
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        AND uploaded_by_profile_id = public.campaign_profile_id_for_auth()
    );

DROP POLICY IF EXISTS signup_sheet_batches_update ON public.signup_sheet_batches;
CREATE POLICY signup_sheet_batches_update ON public.signup_sheet_batches
    FOR UPDATE TO authenticated
    USING (public.is_signup_sheet_operator(public.campaign_profile_id_for_auth()))
    WITH CHECK (public.is_signup_sheet_operator(public.campaign_profile_id_for_auth()));

DROP POLICY IF EXISTS signup_sheet_files_all ON public.signup_sheet_files;
CREATE POLICY signup_sheet_files_all ON public.signup_sheet_files
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.signup_sheet_batches b
            WHERE b.id = signup_sheet_files.batch_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.signup_sheet_batches b
            WHERE b.id = signup_sheet_files.batch_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    );

DROP POLICY IF EXISTS signup_sheet_rows_all ON public.signup_sheet_rows;
CREATE POLICY signup_sheet_rows_all ON public.signup_sheet_rows
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.signup_sheet_batches b
            WHERE b.id = signup_sheet_rows.batch_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.signup_sheet_batches b
            WHERE b.id = signup_sheet_rows.batch_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    );

DROP POLICY IF EXISTS signup_sheet_import_links_all ON public.signup_sheet_import_links;
CREATE POLICY signup_sheet_import_links_all ON public.signup_sheet_import_links
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.signup_sheet_rows r
            JOIN public.signup_sheet_batches b ON b.id = r.batch_id
            WHERE r.id = signup_sheet_import_links.signup_sheet_row_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.signup_sheet_rows r
            JOIN public.signup_sheet_batches b ON b.id = r.batch_id
            WHERE r.id = signup_sheet_import_links.signup_sheet_row_id
              AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_sheet_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_sheet_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_sheet_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_sheet_import_links TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('signup-sheets', 'signup-sheets', false)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS signup_sheets_select ON storage.objects;
CREATE POLICY signup_sheets_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'signup-sheets'
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS signup_sheets_insert ON storage.objects;
CREATE POLICY signup_sheets_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'signup-sheets'
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS signup_sheets_update ON storage.objects;
CREATE POLICY signup_sheets_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'signup-sheets'
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    )
    WITH CHECK (
        bucket_id = 'signup-sheets'
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    );

DROP POLICY IF EXISTS signup_sheets_delete ON storage.objects;
CREATE POLICY signup_sheets_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'signup-sheets'
        AND public.is_signup_sheet_operator(public.campaign_profile_id_for_auth())
    );
