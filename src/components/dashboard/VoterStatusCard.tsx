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
    raw != null && String(raw).trim() !== '' ? String(raw) : '—'
  const ex = normalizeKey(profile?.exception_request_status) || 'none'
  const vid = profile?.linked_voter_id
    ? String(profile.linked_voter_id).trim()
    : ''

  return (
    <StatusCard
      title="Voter status"
      compact
      className={voterMatched ? 'voter-status-card--matched' : undefined}
    >
      <p className="voter-status-strip">
        <strong>{voterMatched ? 'Verified' : 'Not verified'}</strong>
        {vid ? (
          <>
            <span className="voter-status-sep">·</span>
            <span className="voter-status-mono">{vid}</span>
          </>
        ) : null}
        <span className="voter-status-sep">·</span>
        <span>Exception: {humanException(ex)}</span>
      </p>
      <dl className="summary-grid voter-status-dl">
        <dt>Profile note</dt>
        <dd>{label}</dd>
      </dl>
    </StatusCard>
  )
}
