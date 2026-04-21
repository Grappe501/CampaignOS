-- Voter contact / relational turnout conversion layer (DB truth + RLS).
-- Integrates with raw_vr, campaign_profiles, power5_relationship_nodes.

-- ---------------------------------------------------------------------------
-- Contact attempts (append-only audit; state derived via trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voter_conversion_contact_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id text NOT NULL REFERENCES public.raw_vr (voter_id) ON DELETE CASCADE,
    recorded_by_profile_id uuid NOT NULL REFERENCES public.campaign_profiles (id) ON DELETE CASCADE,
    power5_node_id uuid REFERENCES public.power5_relationship_nodes (id) ON DELETE SET NULL,
    contact_method text NOT NULL DEFAULT 'unknown'
        CHECK (contact_method IN (
            'face_to_face', 'phone_call', 'zoom', 'social_media', 'text', 'other', 'unknown'
        )),
    disposition text NOT NULL
        CHECK (disposition IN (
            'no_answer',
            'wrong_contact',
            'supporter',
            'persuadable',
            'opposed',
            'volunteer_interest',
            'event_invite_candidate',
            'needs_relational_followup',
            'commitment_asked',
            'commitment_secured',
            'ballot_plan_needed',
            'ballot_plan_recorded',
            'chase_later',
            'do_not_contact',
            'not_target',
            'engaged_neutral'
        )),
    support_signal text
        CHECK (support_signal IS NULL OR support_signal IN (
            'lean_support', 'firm_support', 'unknown', 'soft_oppose', 'firm_oppose'
        )),
    follow_up_needed boolean NOT NULL DEFAULT false,
    follow_up_owner_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    route_hint text,
    notes text,
    county_snapshot text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voter_conv_attempts_voter_created_idx
    ON public.voter_conversion_contact_attempts (voter_id, created_at ASC);

CREATE INDEX IF NOT EXISTS voter_conv_attempts_recorded_by_idx
    ON public.voter_conversion_contact_attempts (recorded_by_profile_id, created_at DESC);

COMMENT ON TABLE public.voter_conversion_contact_attempts IS
    'Append-only voter contact log; voter_conversion_state is recomputed chronologically.';

-- ---------------------------------------------------------------------------
-- Conversion state (one row per voter on file; maintained by trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voter_conversion_state (
    voter_id text PRIMARY KEY REFERENCES public.raw_vr (voter_id) ON DELETE CASCADE,
    lifecycle_stage text NOT NULL DEFAULT 'unknown'
        CHECK (lifecycle_stage IN (
            'unknown',
            'identified',
            'contacted',
            'engaged',
            'leaning_support',
            'supporter',
            'persuadable',
            'opposed',
            'relationally_linked',
            'commitment_requested',
            'committed_to_vote',
            'needs_chase',
            'ballot_plan_recorded',
            'turnout_risk',
            'unreachable',
            'do_not_contact',
            'inactive_cooldown'
        )),
    support_level text
        CHECK (support_level IS NULL OR support_level IN (
            'unknown', 'lean_support', 'supporter', 'persuadable', 'opposed'
        )),
    commitment_status text NOT NULL DEFAULT 'none'
        CHECK (commitment_status IN ('none', 'asked', 'secured', 'declined')),
    ballot_plan_status text NOT NULL DEFAULT 'unknown'
        CHECK (ballot_plan_status IN ('unknown', 'needed', 'recorded', 'waived')),
    chase_sequence_state text NOT NULL DEFAULT 'none'
        CHECK (chase_sequence_state IN (
            'none',
            'reminder_queued',
            'relational_queued',
            'commitment_ask_pending',
            'ballot_plan_pending',
            'reminder_sequence_queued',
            'chase_needed',
            'high_risk_commitment'
        )),
    turnout_risk text
        CHECK (turnout_risk IS NULL OR turnout_risk IN ('low', 'medium', 'high')),
    relational_owner_profile_id uuid REFERENCES public.campaign_profiles (id) ON DELETE SET NULL,
    primary_power5_node_id uuid REFERENCES public.power5_relationship_nodes (id) ON DELETE SET NULL,
    last_contact_attempt_id uuid,
    last_contact_at timestamptz,
    contact_attempt_count integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voter_conv_state_lifecycle_idx
    ON public.voter_conversion_state (lifecycle_stage);

CREATE INDEX IF NOT EXISTS voter_conv_state_chase_idx
    ON public.voter_conversion_state (chase_sequence_state);

ALTER TABLE public.voter_conversion_state
    DROP CONSTRAINT IF EXISTS voter_conversion_state_last_attempt_fkey;

ALTER TABLE public.voter_conversion_state
    ADD CONSTRAINT voter_conversion_state_last_attempt_fkey
    FOREIGN KEY (last_contact_attempt_id) REFERENCES public.voter_conversion_contact_attempts (id) ON DELETE SET NULL;

COMMENT ON TABLE public.voter_conversion_state IS
    'Materialized turnout conversion posture per voter; recomputed from attempts (no standalone volunteer writes).';

-- ---------------------------------------------------------------------------
-- Fold attempts → state (chronological; sticky commitment / ballot plan)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.voter_conversion_fold_state(p_voter_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r public.voter_conversion_contact_attempts%ROWTYPE;
    lifecycle text := 'unknown';
    support text := NULL;
    commitment text := 'none';
    ballot text := 'unknown';
    chase text := 'none';
    risk text := NULL;
    rel_owner uuid := NULL;
    pnode uuid := NULL;
    last_id uuid := NULL;
    last_at timestamptz := NULL;
    cnt int := 0;
    sticky_commit boolean := false;
    sticky_ballot boolean := false;
BEGIN
    FOR r IN
        SELECT * FROM public.voter_conversion_contact_attempts
        WHERE voter_id = p_voter_id
        ORDER BY created_at ASC, id ASC
    LOOP
        cnt := cnt + 1;
        last_id := r.id;
        last_at := r.created_at;

        IF r.follow_up_owner_profile_id IS NOT NULL THEN
            rel_owner := r.follow_up_owner_profile_id;
        END IF;
        IF r.power5_node_id IS NOT NULL THEN
            pnode := r.power5_node_id;
        END IF;

        CASE r.disposition
            WHEN 'no_answer' THEN
                IF lifecycle = 'unknown' THEN
                    lifecycle := 'contacted';
                END IF;
                chase := 'reminder_queued';
            WHEN 'wrong_contact' THEN
                lifecycle := 'unreachable';
                sticky_commit := false;
                sticky_ballot := false;
                commitment := 'none';
                ballot := 'unknown';
            WHEN 'supporter' THEN
                lifecycle := 'supporter';
                support := 'supporter';
            WHEN 'persuadable' THEN
                lifecycle := 'persuadable';
                support := 'persuadable';
            WHEN 'opposed' THEN
                lifecycle := 'opposed';
                support := 'opposed';
            WHEN 'volunteer_interest' THEN
                IF lifecycle = 'unknown' THEN
                    lifecycle := 'engaged';
                ELSE
                    lifecycle := 'engaged';
                END IF;
            WHEN 'event_invite_candidate' THEN
                lifecycle := 'engaged';
                chase := 'relational_queued';
            WHEN 'needs_relational_followup' THEN
                lifecycle := 'relationally_linked';
                chase := 'relational_queued';
            WHEN 'commitment_asked' THEN
                lifecycle := 'commitment_requested';
                commitment := 'asked';
                chase := 'commitment_ask_pending';
            WHEN 'commitment_secured' THEN
                lifecycle := 'committed_to_vote';
                commitment := 'secured';
                sticky_commit := true;
                chase := 'ballot_plan_pending';
            WHEN 'ballot_plan_needed' THEN
                ballot := 'needed';
                chase := 'ballot_plan_pending';
                IF lifecycle IN ('committed_to_vote', 'supporter', 'engaged', 'commitment_requested') THEN
                    lifecycle := 'committed_to_vote';
                END IF;
            WHEN 'ballot_plan_recorded' THEN
                ballot := 'recorded';
                lifecycle := 'ballot_plan_recorded';
                sticky_ballot := true;
                chase := 'reminder_sequence_queued';
            WHEN 'chase_later' THEN
                lifecycle := 'needs_chase';
                chase := 'chase_needed';
            WHEN 'do_not_contact' THEN
                lifecycle := 'do_not_contact';
                sticky_commit := false;
                sticky_ballot := false;
                commitment := 'none';
                ballot := 'unknown';
                chase := 'none';
            WHEN 'not_target' THEN
                lifecycle := 'inactive_cooldown';
            WHEN 'engaged_neutral' THEN
                IF lifecycle = 'unknown' THEN
                    lifecycle := 'engaged';
                ELSE
                    lifecycle := 'engaged';
                END IF;
            ELSE
                NULL;
        END CASE;

        IF r.support_signal IS NOT NULL THEN
            support := CASE r.support_signal
                WHEN 'firm_support' THEN 'supporter'
                WHEN 'lean_support' THEN 'lean_support'
                WHEN 'unknown' THEN 'unknown'
                WHEN 'soft_oppose' THEN 'persuadable'
                WHEN 'firm_oppose' THEN 'opposed'
                ELSE support
            END;
        END IF;

        IF sticky_commit THEN
            commitment := 'secured';
            IF lifecycle NOT IN ('do_not_contact', 'unreachable', 'inactive_cooldown', 'ballot_plan_recorded') THEN
                lifecycle := 'committed_to_vote';
            END IF;
        END IF;

        IF sticky_ballot THEN
            ballot := 'recorded';
            IF lifecycle NOT IN ('do_not_contact', 'unreachable', 'inactive_cooldown') THEN
                lifecycle := 'ballot_plan_recorded';
            END IF;
        END IF;

        IF r.disposition = 'commitment_secured' AND ballot <> 'recorded' THEN
            chase := 'ballot_plan_pending';
        END IF;

        IF r.disposition = 'no_answer' AND sticky_commit AND ballot <> 'recorded' THEN
            chase := 'ballot_plan_pending';
        END IF;
    END LOOP;

    IF cnt = 0 THEN
        DELETE FROM public.voter_conversion_state WHERE voter_id = p_voter_id;
        RETURN;
    END IF;

    INSERT INTO public.voter_conversion_state (
        voter_id,
        lifecycle_stage,
        support_level,
        commitment_status,
        ballot_plan_status,
        chase_sequence_state,
        turnout_risk,
        relational_owner_profile_id,
        primary_power5_node_id,
        last_contact_attempt_id,
        last_contact_at,
        contact_attempt_count,
        updated_at
    )
    VALUES (
        p_voter_id,
        lifecycle,
        support,
        commitment,
        ballot,
        chase,
        risk,
        rel_owner,
        pnode,
        last_id,
        last_at,
        cnt,
        now()
    )
    ON CONFLICT (voter_id) DO UPDATE SET
        lifecycle_stage = EXCLUDED.lifecycle_stage,
        support_level = EXCLUDED.support_level,
        commitment_status = EXCLUDED.commitment_status,
        ballot_plan_status = EXCLUDED.ballot_plan_status,
        chase_sequence_state = EXCLUDED.chase_sequence_state,
        turnout_risk = EXCLUDED.turnout_risk,
        relational_owner_profile_id = EXCLUDED.relational_owner_profile_id,
        primary_power5_node_id = EXCLUDED.primary_power5_node_id,
        last_contact_attempt_id = EXCLUDED.last_contact_attempt_id,
        last_contact_at = EXCLUDED.last_contact_at,
        contact_attempt_count = EXCLUDED.contact_attempt_count,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_voter_conversion_after_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.voter_conversion_fold_state(NEW.voter_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_voter_conversion_after_attempt_ins ON public.voter_conversion_contact_attempts;
CREATE TRIGGER tr_voter_conversion_after_attempt_ins
    AFTER INSERT ON public.voter_conversion_contact_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_voter_conversion_after_attempt();

-- ---------------------------------------------------------------------------
-- Leadership rollups (no row-level PII beyond aggregates; editors only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.voter_conversion_leadership_rollups()
RETURNS TABLE (
    county text,
    tracked_voters bigint,
    supporters bigint,
    committed bigint,
    ballot_recorded bigint,
    needs_chase bigint,
    relational_linked bigint,
    commitment_ask_pending bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        coalesce(rv.county, '') AS county,
        count(*)::bigint AS tracked_voters,
        count(*) FILTER (WHERE v.lifecycle_stage = 'supporter')::bigint AS supporters,
        count(*) FILTER (WHERE v.commitment_status = 'secured')::bigint AS committed,
        count(*) FILTER (WHERE v.ballot_plan_status = 'recorded')::bigint AS ballot_recorded,
        count(*) FILTER (WHERE v.chase_sequence_state IN ('chase_needed', 'reminder_queued', 'relational_queued'))::bigint AS needs_chase,
        count(*) FILTER (WHERE v.lifecycle_stage = 'relationally_linked')::bigint AS relational_linked,
        count(*) FILTER (WHERE v.chase_sequence_state = 'commitment_ask_pending')::bigint AS commitment_ask_pending
    FROM public.voter_conversion_state v
    JOIN public.raw_vr rv ON rv.voter_id = v.voter_id
    WHERE public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
    GROUP BY coalesce(rv.county, '')
    ORDER BY county;
$$;

REVOKE ALL ON FUNCTION public.voter_conversion_leadership_rollups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.voter_conversion_leadership_rollups() TO authenticated;

REVOKE ALL ON FUNCTION public.voter_conversion_fold_state(text) FROM PUBLIC;
-- fold only used by trigger internally

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.voter_conversion_contact_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voter_conv_attempts_select ON public.voter_conversion_contact_attempts;
CREATE POLICY voter_conv_attempts_select ON public.voter_conversion_contact_attempts
    FOR SELECT TO authenticated
    USING (
        recorded_by_profile_id = public.campaign_profile_id_for_auth()
        OR public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
        OR EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.owner_profile_id = public.campaign_profile_id_for_auth()
              AND n.linked_voter_id = voter_conversion_contact_attempts.voter_id
        )
    );

DROP POLICY IF EXISTS voter_conv_attempts_insert ON public.voter_conversion_contact_attempts;
CREATE POLICY voter_conv_attempts_insert ON public.voter_conversion_contact_attempts
    FOR INSERT TO authenticated
    WITH CHECK (recorded_by_profile_id = public.campaign_profile_id_for_auth());

DROP POLICY IF EXISTS voter_conv_attempts_delete ON public.voter_conversion_contact_attempts;
CREATE POLICY voter_conv_attempts_delete ON public.voter_conversion_contact_attempts
    FOR DELETE TO authenticated
    USING (public.is_campaign_event_editor(public.campaign_profile_id_for_auth()));

ALTER TABLE public.voter_conversion_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voter_conv_state_select ON public.voter_conversion_state;
CREATE POLICY voter_conv_state_select ON public.voter_conversion_state
    FOR SELECT TO authenticated
    USING (
        public.is_campaign_event_editor(public.campaign_profile_id_for_auth())
        OR EXISTS (
            SELECT 1 FROM public.power5_relationship_nodes n
            WHERE n.owner_profile_id = public.campaign_profile_id_for_auth()
              AND n.linked_voter_id = voter_conversion_state.voter_id
        )
        OR EXISTS (
            SELECT 1 FROM public.voter_conversion_contact_attempts a
            WHERE a.voter_id = voter_conversion_state.voter_id
              AND a.recorded_by_profile_id = public.campaign_profile_id_for_auth()
        )
    );

GRANT SELECT ON public.voter_conversion_state TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.voter_conversion_contact_attempts TO authenticated;
