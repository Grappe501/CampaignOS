import type { CampaignProfile } from '../../hooks/useProfile'
import { normalizeKey } from '../../lib/dashboardState'
import StatusCard from './StatusCard'

function humanException(st: string) {
  if (st === 'pending') return 'Pending review'
  if (st === 'approved') return 'Approved'
  if (st === 'denied') return 'Denied'
  return 'None'
}

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
  const ex = normalizeKey(profile?.exception_request_status) || 'none'

  return (
    <StatusCard title="Voter status" id="voter-status-card">
      <dl className="summary-grid">
        <dt>Profile field</dt>
        <dd>{label}</dd>
        <dt>Voter file link</dt>
        <dd>{voterMatched ? 'Linked (self-match)' : 'Not linked yet'}</dd>
        <dt>Roster exception</dt>
        <dd>{humanException(ex)}</dd>
      </dl>
    </StatusCard>
  )
}
