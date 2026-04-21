import type { VoterCommitmentStatus, VoterLifecycleStage } from './voterConversionDomain'

export function needsCommitmentAsk(input: {
  lifecycle: VoterLifecycleStage
  commitment: VoterCommitmentStatus
}): boolean {
  if (input.commitment === 'secured' || input.commitment === 'declined') return false
  return input.lifecycle === 'supporter' || input.lifecycle === 'engaged'
}

export function commitmentOperationalLabel(status: VoterCommitmentStatus): string {
  switch (status) {
    case 'asked':
      return 'Confirm commitment on next touch'
    case 'secured':
      return 'Commitment secured — move to ballot plan'
    case 'declined':
      return 'Commitment declined — adjust plan'
    default:
      return 'Commitment not yet recorded'
  }
}
