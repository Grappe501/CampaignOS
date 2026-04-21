/**
 * Disposition → state fold (TypeScript mirror of voter_conversion_fold_state).
 * Keep logic aligned with supabase/migrations/20260430380000_voter_contact_relational_turnout_conversion.sql
 */

import type {
  VoterBallotPlanStatus,
  VoterChaseSequenceState,
  VoterCommitmentStatus,
  VoterConversionDisposition,
  VoterLifecycleStage,
  VoterSupportSignal,
} from './voterConversionDomain'

export type VoterConversionAttemptInput = {
  disposition: VoterConversionDisposition
  support_signal?: VoterSupportSignal | null
  follow_up_owner_profile_id?: string | null
  power5_node_id?: string | null
}

export type VoterConversionFoldState = {
  lifecycle_stage: VoterLifecycleStage
  support_level: 'unknown' | 'lean_support' | 'supporter' | 'persuadable' | 'opposed' | null
  commitment_status: VoterCommitmentStatus
  ballot_plan_status: VoterBallotPlanStatus
  chase_sequence_state: VoterChaseSequenceState
  turnout_risk: 'low' | 'medium' | 'high' | null
  relational_owner_profile_id: string | null
  primary_power5_node_id: string | null
}

const DEFAULT_STATE: VoterConversionFoldState = {
  lifecycle_stage: 'unknown',
  support_level: null,
  commitment_status: 'none',
  ballot_plan_status: 'unknown',
  chase_sequence_state: 'none',
  turnout_risk: null,
  relational_owner_profile_id: null,
  primary_power5_node_id: null,
}

function mapSupportSignal(sig: VoterSupportSignal | null | undefined): VoterConversionFoldState['support_level'] {
  if (!sig) return null
  switch (sig) {
    case 'firm_support':
      return 'supporter'
    case 'lean_support':
      return 'lean_support'
    case 'unknown':
      return 'unknown'
    case 'soft_oppose':
      return 'persuadable'
    case 'firm_oppose':
      return 'opposed'
    default:
      return null
  }
}

/** Fold chronological attempts into a single state snapshot (for tests + UI preview). */
export function foldVoterConversionStateFromAttempts(
  attempts: readonly VoterConversionAttemptInput[],
): VoterConversionFoldState {
  if (!attempts.length) return { ...DEFAULT_STATE }

  let lifecycle: VoterLifecycleStage = 'unknown'
  let support: VoterConversionFoldState['support_level'] = null
  let commitment: VoterCommitmentStatus = 'none'
  let ballot: VoterBallotPlanStatus = 'unknown'
  let chase: VoterChaseSequenceState = 'none'
  let relOwner: string | null = null
  let pnode: string | null = null
  let stickyCommit = false
  let stickyBallot = false

  for (const r of attempts) {
    if (r.follow_up_owner_profile_id) relOwner = r.follow_up_owner_profile_id
    if (r.power5_node_id) pnode = r.power5_node_id

    switch (r.disposition) {
      case 'no_answer':
        if (lifecycle === 'unknown') lifecycle = 'contacted'
        chase = 'reminder_queued'
        break
      case 'wrong_contact':
        lifecycle = 'unreachable'
        stickyCommit = false
        stickyBallot = false
        commitment = 'none'
        ballot = 'unknown'
        break
      case 'supporter':
        lifecycle = 'supporter'
        support = 'supporter'
        break
      case 'persuadable':
        lifecycle = 'persuadable'
        support = 'persuadable'
        break
      case 'opposed':
        lifecycle = 'opposed'
        support = 'opposed'
        break
      case 'volunteer_interest':
        lifecycle = 'engaged'
        break
      case 'event_invite_candidate':
        lifecycle = 'engaged'
        chase = 'relational_queued'
        break
      case 'needs_relational_followup':
        lifecycle = 'relationally_linked'
        chase = 'relational_queued'
        break
      case 'commitment_asked':
        lifecycle = 'commitment_requested'
        commitment = 'asked'
        chase = 'commitment_ask_pending'
        break
      case 'commitment_secured':
        lifecycle = 'committed_to_vote'
        commitment = 'secured'
        stickyCommit = true
        chase = 'ballot_plan_pending'
        break
      case 'ballot_plan_needed':
        ballot = 'needed'
        chase = 'ballot_plan_pending'
        if (
          ['committed_to_vote', 'supporter', 'engaged', 'commitment_requested'].includes(lifecycle)
        ) {
          lifecycle = 'committed_to_vote'
        }
        break
      case 'ballot_plan_recorded':
        ballot = 'recorded'
        lifecycle = 'ballot_plan_recorded'
        stickyBallot = true
        chase = 'reminder_sequence_queued'
        break
      case 'chase_later':
        lifecycle = 'needs_chase'
        chase = 'chase_needed'
        break
      case 'do_not_contact':
        lifecycle = 'do_not_contact'
        stickyCommit = false
        stickyBallot = false
        commitment = 'none'
        ballot = 'unknown'
        chase = 'none'
        break
      case 'not_target':
        lifecycle = 'inactive_cooldown'
        break
      case 'engaged_neutral':
        lifecycle = 'engaged'
        break
      default:
        break
    }

    const mapped = mapSupportSignal(r.support_signal)
    if (mapped != null) support = mapped

    if (stickyCommit) {
      commitment = 'secured'
      if (!['do_not_contact', 'unreachable', 'inactive_cooldown', 'ballot_plan_recorded'].includes(lifecycle)) {
        lifecycle = 'committed_to_vote'
      }
    }

    if (stickyBallot) {
      ballot = 'recorded'
      if (!['do_not_contact', 'unreachable', 'inactive_cooldown'].includes(lifecycle)) {
        lifecycle = 'ballot_plan_recorded'
      }
    }

    if (r.disposition === 'commitment_secured' && ballot !== 'recorded') {
      chase = 'ballot_plan_pending'
    }

    if (r.disposition === 'no_answer' && stickyCommit && ballot !== 'recorded') {
      chase = 'ballot_plan_pending'
    }
  }

  return {
    lifecycle_stage: lifecycle,
    support_level: support,
    commitment_status: commitment,
    ballot_plan_status: ballot,
    chase_sequence_state: chase,
    turnout_risk: null,
    relational_owner_profile_id: relOwner,
    primary_power5_node_id: pnode,
  }
}

export function explainDispositionRoute(disposition: VoterConversionDisposition): string {
  switch (disposition) {
    case 'needs_relational_followup':
      return 'Route to relational follow-up owner or Power5 node.'
    case 'commitment_asked':
      return 'Queue commitment confirmation on next touch.'
    case 'commitment_secured':
      return 'Capture ballot plan and schedule reminders.'
    case 'ballot_plan_needed':
      return 'Complete ballot plan before GOTV chase intensifies.'
    case 'chase_later':
      return 'Place on deterministic chase list for countdown phase.'
    case 'do_not_contact':
      return 'Respect cooling-off; no further outreach.'
    default:
      return 'Record next operational step from contact outcome.'
  }
}
