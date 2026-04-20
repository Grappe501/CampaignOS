import type { CampaignProfile } from '../../hooks/useProfile'
import StatusCard from './StatusCard'

export default function VoterStatusCard({
  profile,
  voterMatched,
}: {
  profile: CampaignProfile | null
  voterMatched: boolean
}) {
  const raw = profile?.voter_status
  const label =
    raw != null && String(raw).trim() !== '' ? String(raw) : 'Not set in profile'

  return (
    <StatusCard title="Voter status" id="voter-status-card">
      <dl className="summary-grid">
        <dt>Profile field</dt>
        <dd>{label}</dd>
        <dt>Voter file link</dt>
        <dd>{voterMatched ? 'Linked (self-match)' : 'Not linked yet'}</dd>
      </dl>
    </StatusCard>
  )
}
