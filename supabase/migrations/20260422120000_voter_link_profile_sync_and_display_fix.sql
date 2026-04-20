-- Denormalize voter link onto campaign_profiles for reliable UI + fix display when raw_vr row is missing.
-- Replace get_matched_voter_display_for_profile to LEFT JOIN raw_vr so self-match still returns after link insert.

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS linked_voter_id text,
    ADD COLUMN IF NOT EXISTS voter_registration_verified_at timestamptz;

COMMENT ON COLUMN public.campaign_profiles.linked_voter_id IS
    'Voter file id linked via voter_match_links; mirrored for quick profile reads.';

COMMENT ON COLUMN public.campaign_profiles.voter_registration_verified_at IS
    'When the volunteer confirmed their voter file match.';

UPDATE public.campaign_profiles cp
SET
    linked_voter_id = vml.voter_id,
    voter_registration_verified_at = COALESCE(vml.matched_at, now())
FROM public.voter_match_links vml
WHERE vml.campaign_profile_id = cp.id
  AND cp.linked_voter_id IS NULL
  AND vml.match_status IN (
      'self_claimed',
      'system_matched',
      'verified',
      'exception_approved'
  );

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

    UPDATE public.campaign_profiles
    SET
        linked_voter_id = p_voter_id,
        voter_registration_verified_at = now(),
        updated_at = now()
    WHERE id = p_campaign_profile_id;
END;
$$;

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
        vml.voter_id,
        COALESCE(rv.name_last, ''::text) AS name_last,
        COALESCE(rv.name_first, ''::text) AS name_first,
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
    LEFT JOIN public.raw_vr rv ON rv.voter_id = vml.voter_id
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
