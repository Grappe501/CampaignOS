import { Link } from 'react-router-dom'
import { normalizeKey } from '../../lib/dashboardState'

function formatWhen(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—'
  try {
    return new Date(String(iso)).toLocaleString()
  } catch {
    return String(iso)
  }
}

export default function AdminExceptionsIntervention({
  profileId,
  exceptionStatus,
  exceptionNote,
  exceptionRequestedAt,
  voterMatched,
}: {
  profileId: string | undefined
  exceptionStatus: string | null | undefined
  exceptionNote: string | null | undefined
  exceptionRequestedAt: string | null | undefined
  voterMatched: boolean
}) {
  const st = normalizeKey(exceptionStatus) || 'none'
  const hasNote = exceptionNote != null && String(exceptionNote).trim() !== ''

  let severity: 'clear' | 'watch' | 'action' = 'clear'
  let headline = 'No roster exception flag on this profile'
  let nextActions: string[] = []

  if (st === 'pending') {
    severity = 'action'
    headline = 'Roster exception pending coordinator review'
    nextActions = [
      'Coordinators: use the coordination desk exception panels and your standard operating procedure for inbox review.',
      'Volunteers: they can add context on the dashboard roster exception card while status is pending.',
    ]
  } else if (st === 'approved') {
    severity = 'watch'
    headline = 'Roster exception approved'
    nextActions = voterMatched
      ? [
          'Exception approved; voter match is present — ensure training and mission lanes reflect current roster state.',
        ]
      : [
          'Exception approved without voter-file self-match — orientation should follow coordinator-approved path.',
        ]
  } else if (st !== 'none' && st !== '') {
    severity = 'watch'
    headline = `Exception status: ${st}`
    nextActions = [
      'Confirm meaning of this status with HQ policy — taxonomy may expand as workflows harden.',
    ]
  } else if (!voterMatched && profileId) {
    severity = 'watch'
    headline = 'No voter match — exception path may apply'
    nextActions = [
      'If this account is on a non-voter-file branch, they may submit a roster exception from the dashboard.',
    ]
  }

  return (
    <div className="admin-governance-grid">
      <div
        className={`admin-desk-panel admin-desk-nested admin-exception-queue-card admin-exception-queue-card--${severity}`}
      >
        <h3 className="admin-desk-panel-title">Intervention snapshot (this profile)</h3>
        <p className="admin-exception-queue-headline">{headline}</p>
        <dl className="admin-governance-dl">
          <dt>exception_request_status</dt>
          <dd>
            <strong>{st === '' || st === 'none' ? 'none' : st}</strong>
          </dd>
          <dt>exception_requested_at</dt>
          <dd>{formatWhen(exceptionRequestedAt)}</dd>
        </dl>
        {hasNote ? (
          <div className="admin-exception-note-box">
            <p className="admin-desk-panel-title" style={{ marginBottom: 6 }}>
              Volunteer-submitted note
            </p>
            <p className="admin-exception-note-text">{String(exceptionNote).trim()}</p>
          </div>
        ) : null}
        {nextActions.length > 0 ? (
          <div className="admin-exception-next">
            <p className="admin-desk-panel-title" style={{ marginBottom: 6 }}>
              Suggested next steps
            </p>
            <ul className="admin-desk-list">
              {nextActions.map((line) => (
                <li key={line.slice(0, 48)}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="admin-desk-panel-note">
          <Link to="/dashboard#exception-request">Open roster exception on dashboard</Link>
          {' · '}
          <Link to="/coordinator">Open coordination desk</Link>
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested admin-governance-roadmap">
        <h3 className="admin-desk-panel-title">Organization-wide exception queue</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          Cross-profile exception inboxes (e.g. coordinator-safe RPCs) are specified in architecture
          docs but not wired as a single admin list in this client. Do not assume this page lists
          other volunteers’ requests.
        </p>
        <p className="admin-desk-empty-hint">
          When <code>coordinator_exception_inbox</code> or admin-grade aggregates exist, this block
          becomes the rollup target — until then, coordinators work from their desk tools.
        </p>
      </div>
    </div>
  )
}
