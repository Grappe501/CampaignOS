import type { UserConnectedAccountRow } from '../../lib/outreachModel'
import { OUTREACH_PLATFORM_LABELS } from '../../lib/outreachModel'

export default function ConnectedAccountsScaffold({
  accounts,
  loading,
  onOptInToggle,
}: {
  accounts: UserConnectedAccountRow[]
  loading: boolean
  onOptInToggle: (platform: string, next: 'not_connected' | 'pending') => void | Promise<void>
}) {
  return (
    <div className="power5-connected-accounts" aria-labelledby="power5-connected-title">
      <h3 id="power5-connected-title" className="power5-connected-title">
        Your channels (opt-in)
      </h3>
      <p className="subtitle power5-connected-lede">
        Phase 1: choose where you prefer to reach people. No messages are sent from CampaignOS —
        we only open your apps and help you track outreach you do yourself.
      </p>
      {loading ? (
        <p className="subtitle">Loading…</p>
      ) : (
        <ul className="power5-connected-list">
          {accounts.map((a) => (
            <li key={a.id} className="power5-connected-row">
              <span className="power5-connected-name">
                {OUTREACH_PLATFORM_LABELS[a.platform] ?? a.platform}
              </span>
              <span className="power5-connected-status" data-status={a.connection_status}>
                {a.connection_status === 'connected'
                  ? 'Interested'
                  : a.connection_status === 'pending'
                    ? 'Pending'
                    : 'Not connected'}
              </span>
              {a.connection_status === 'not_connected' ? (
                <button
                  type="button"
                  className="btn-touch power5-connected-btn"
                  onClick={() => void onOptInToggle(a.platform, 'pending')}
                >
                  I may use this
                </button>
              ) : a.connection_status === 'pending' ? (
                <button
                  type="button"
                  className="btn-touch power5-connected-btn power5-connected-btn--ghost"
                  onClick={() => void onOptInToggle(a.platform, 'not_connected')}
                >
                  Undo
                </button>
              ) : (
                <span className="power5-connected-hint">Full connect coming later</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
