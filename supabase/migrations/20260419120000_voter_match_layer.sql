-- Voter self-match: constrained RPCs over raw_vr; no direct client access to voter_match_links required.
--
-- Authorization expects public.campaign_profiles.user_id uuid = auth.uid() for rows keyed by id.
-- If your profiles row is keyed by auth user id instead, replace each
--   (cp.id = auth.uid() OR cp.user_id = auth.uid())
-- with:
--   (cp.id = auth.uid())
-- and add a nullable user_id column if needed for your app.

CREATE OR REPLACE FUNCTION public.search_voter_candidates(
    p_name_last text,
    p_name_first text,
    p_date_of_birth date,
    p_county text DEFAULT NULL
)
RETURNS TABLE (
    voter_id text,
    name_last text,
    name_first text,
    date_of_birth date,
    county text,
    registrant_status text,
    res_city text,
    precinct_name text,
    congressional_district text,
    state_senate_district text,
    state_representative_district text,
    match_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH base_matches AS (
        SELECT
            rv.voter_id,
            rv.name_last,
            rv.name_first,
            rv.date_of_birth::date AS date_of_birth,
            rv.county,
            rv.registrant_status,
            rv.res_city,
            rv.precinct_name,
            rv.congressional_district,
            rv.state_senate_district,
            rv.state_representative_district,
            CASE
                WHEN p_county IS NOT NULL
                     AND trim(lower(rv.county)) = trim(lower(p_county)) THEN 1
                ELSE 2
            END AS county_rank
        FROM public.raw_vr rv
        WHERE trim(lower(rv.name_last)) = trim(lower(p_name_last))
          AND trim(lower(rv.name_first)) = trim(lower(p_name_first))
          AND rv.date_of_birth::date = p_date_of_birth
    )
    SELECT
        bm.voter_id,
        bm.name_last,
        bm.name_first,
        bm.date_of_birth,
        bm.county,
        bm.registrant_status,
        bm.res_city,
        bm.precinct_name,
        bm.congressional_district,
        bm.state_senate_district,
        bm.state_representative_district,
        (row_number() OVER (ORDER BY bm.county_rank, bm.county, bm.voter_id))::integer AS match_rank
    FROM base_matches bm
    ORDER BY bm.county_rank, bm.county, bm.voter_id
    LIMIT 3;
$$;

REVOKE ALL ON FUNCTION public.search_voter_candidates(text, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_voter_candidates(text, text, date, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.voter_match_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    voter_id text NOT NULL,
    match_status text NOT NULL DEFAULT 'unmatched',
    confidence_score numeric NOT NULL DEFAULT 1.0,
    matched_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT voter_match_links_status_check CHECK (
        match_status IN (
            'unmatched',
            'self_claimed',
            'system_matched',
            'verified',
            'exception_pending',
            'exception_approved',
            'exception_denied'
        )
    ),
    CONSTRAINT voter_match_links_profile_unique UNIQUE (campaign_profile_id)
);

ALTER TABLE public.voter_match_links ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.voter_match_links IS
    'Links campaign_profiles to raw_vr voter_id; prefer RPCs for writes/reads that join raw_vr.';

REVOKE ALL ON public.voter_match_links FROM PUBLIC;
REVOKE ALL ON public.voter_match_links FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_voter_self_match(
    p_campaign_profile_id uuid,
    p_voter_id text,
    p_name_last text,
    p_name_first text,
    p_date_of_birth date,
    p_county text DEFAULT NULL,
    p_confidence_score numeric DEFAULT 1.0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.campaign_profiles cp
        WHERE cp.id = p_campaign_profile_id
          AND (cp.id = auth.uid() OR cp.user_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'not authorized for this campaign profile'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.raw_vr rv
        WHERE rv.voter_id = p_voter_id
          AND trim(lower(rv.name_last)) = trim(lower(p_name_last))
          AND trim(lower(rv.name_first)) = trim(lower(p_name_first))
          AND rv.date_of_birth::date = p_date_of_birth
          AND (
              p_county IS NULL
              OR trim(lower(rv.county)) = trim(lower(p_county))
          )
    ) THEN
        RAISE EXCEPTION 'voter_id does not match supplied identity fields'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.voter_match_links (
        campaign_profile_id,
        voter_id,
        match_status,
        confidence_score,
        matched_at
    )
    VALUES (
        p_campaign_profile_id,
        p_voter_id,
        'self_claimed',
        p_confidence_score,
        now()
    )
    ON CONFLICT (campaign_profile_id) DO UPDATE SET
        voter_id = excluded.voter_id,
        match_status = excluded.match_status,
        confidence_score = excluded.confidence_score,
        matched_at = excluded.matched_at;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_voter_self_match(uuid, text, text, text, date, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_voter_self_match(uuid, text, text, text, date, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_matched_voter_display_for_profile(p_campaign_profile_id uuid)
RETURNS TABLE (
    voter_id text,
    name_last text,
    name_first text,
    county text,
    registrant_status text,
    precinct_name text,
    res_city text,
    res_state text,
    res_zip5 text,
    congressional_district text,
    state_senate_district text,
    state_representative_district text,
    match_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        rv.voter_id,
        rv.name_last,
        rv.name_first,
        rv.county,
        rv.registrant_status,
        rv.precinct_name,
        rv.res_city,
        rv.res_state,
        rv.res_zip5,
        rv.congressional_district,
        rv.state_senate_district,
        rv.state_representative_district,
        vml.match_status
    FROM public.campaign_profiles cp
    INNER JOIN public.voter_match_links vml ON vml.campaign_profile_id = cp.id
    INNER JOIN public.raw_vr rv ON rv.voter_id = vml.voter_id
    WHERE cp.id = p_campaign_profile_id
      AND (cp.id = auth.uid() OR cp.user_id = auth.uid())
      AND vml.match_status IN (
          'self_claimed',
          'system_matched',
          'verified',
          'exception_approved'
      )
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_matched_voter_display_for_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matched_voter_display_for_profile(uuid) TO authenticated;
