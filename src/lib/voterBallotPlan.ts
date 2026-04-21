import type { VoterBallotPlanStatus, VoterLifecycleStage } from './voterConversionDomain'

export function needsBallotPlanCapture(input: {
  lifecycle: VoterLifecycleStage
  ballot: VoterBallotPlanStatus
  commitment: 'none' | 'asked' | 'secured' | 'declined'
}): boolean {
  if (input.ballot === 'recorded' || input.ballot === 'waived') return false
  if (input.commitment !== 'secured') return false
  return input.lifecycle === 'committed_to_vote' || input.lifecycle === 'ballot_plan_recorded'
}

export function ballotPlanOperationalLabel(status: VoterBallotPlanStatus): string {
  switch (status) {
    case 'needed':
      return 'Capture ballot plan'
    case 'recorded':
      return 'Ballot plan on file'
    case 'waived':
      return 'Ballot plan waived'
    default:
      return 'Ballot plan status unknown'
  }
}
