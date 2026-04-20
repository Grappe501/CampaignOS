import type { CampaignProfile } from '../../hooks/useProfile'
import { normalizeKey } from '../../lib/dashboardState'
import StatusCard from './StatusCard'

function humanException(st: string) {
  if (st === 'pending') return 'Pending review'
  if (st === 'approved') return 'Approved'
  if (st === 'denied') return 'Denied'
  return 'None'
}

function formatMatchStatus(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return '—'
  const k = String(raw).trim().toLowerCase().replace(/-/g, '_')
  switch (k) {
    case 'self_claimed':
      return 'Self-confirmed match'
    case 'system_matched':
      return 'System matched'
    case 'verified':
      return 'Verified'
    case 'exception_approved':
      return 'Exception approved'
    case 'exception_pending':
      return 'Exception pending'
    case 'exception_denied':
      return 'Exception denied'
    case 'unmatched':
      return 'Not linked'
    default:
      return String(raw).replace(/_/g, ' ')
  }
}

/** True when roster linkage exists — profile row and RPC can briefly disagree. */
function isRosterLinked(
  voterMatched: boolean,
  linkedVoterId: string,
  matchStatus: string | null | undefined,
): boolean {
  if (voterMatched || Boolean(linkedVoterId)) return true
  const ms = matchStatus?.trim().toLowerCase() ?? ''
  return (
    ms !== '' &&
    ms !== 'unmatched' &&
    ms !== 'exception_denied'
  )
}

export default function VoterStatusCard({
  profile,
  voterMatched,
  matchStatus,
}: {
  profile: CampaignProfile | null
  voterMatched: boolean
  /** From `get_matched_voter_display_for_profile` when available (authoritative vs stale profile.voter_status). */
  matchStatus?: string | null
}) {
  const raw = profile?.voter_status
  const legacyLabel =
    raw != null && String(raw).trim() !== '' ? String(raw).trim() : ''
  const ex = normalizeKey(profile?.exception_request_status) || 'none'
  const vid = profile?.linked_voter_id
    ? String(profile.linked_voter_id).trim()
    : ''

  const linked = isRosterLinked(voterMatched, vid, matchStatus)
  const legacyLower = legacyLabel.toLowerCase()

  const profileNote = (() => {
    if (linked) {
      if (matchStatus) return formatMatchStatus(matchStatus)
      if (legacyLabel && legacyLower !== 'unmatched') return legacyLabel
      return 'Linked to voter file'
    }
    return legacyLabel || '—'
  })()

  return (
    <StatusCard
      title="Voter status"
      compact
      className={linked ? 'voter-status-card--matched' : undefined}
    >
      <p className="voter-status-strip">
        <strong>{linked ? 'Verified' : 'Not verified'}</strong>
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
        <dt>Match status</dt>
        <dd>{profileNote}</dd>
      </dl>
    </StatusCard>
  )
}
