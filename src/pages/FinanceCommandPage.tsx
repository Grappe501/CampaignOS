import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import FundraisingDashboardCard from '../components/finance/FundraisingDashboardCard'
import BudgetAllocationPanel from '../components/finance/BudgetAllocationPanel'
import RoiInsightsPanel from '../components/finance/RoiInsightsPanel'
import { useProfile } from '../hooks/useProfile'
import { useFinanceCommandLayer } from '../hooks/useFinanceCommandLayer'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type Props = {
  onDevSessionClear?: () => void
}

export default function FinanceCommandPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()
  const finance = useFinanceCommandLayer(profile?.primary_role)

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  if (!loading && profile && !canAccessEventCoordinatorDesk(profile.primary_role)) {
    return <Navigate to="/events" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <div className="leadership-briefing-page" id="finance-command-root">
            <header className="leadership-briefing-page__hero">
              <div>
                <p className="event-coordinator-desk__eyebrow">Resource command</p>
                <h1 className="event-coordinator-desk__title">Fundraising &amp; allocation</h1>
                <p className="event-coordinator-desk__lede">
                  Revenue, spend, budget envelopes, and ROI-style efficiency from the same tables leadership RPCs use.
                  Advisory view — operational truth stays in finance approvals and accounting.
                </p>
              </div>
            </header>

            {!finance.enabled ? (
              <p className="event-coordinator-desk__placeholder" role="status">
                Finance command is available to event coordinators and leadership roles.
              </p>
            ) : finance.loading || finance.voterConvLoading ? (
              <p className="event-coordinator-desk__meta" role="status">
                Loading finance and conversion context…
              </p>
            ) : finance.error ? (
              <p className="event-coordinator-desk__placeholder" role="alert">
                {finance.error}
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    marginTop: '1rem',
                  }}
                >
                  <FundraisingDashboardCard summary={finance.summary} recentDonations={finance.donations} />
                  <BudgetAllocationPanel budgets={finance.budgets} headroom={finance.headroom} />
                  <RoiInsightsPanel
                    summary={finance.summary}
                    roi={finance.roi}
                    recommendations={finance.recommendations}
                  />
                </div>
                <div className="card card--inner stack-section" style={{ marginTop: '1rem' }}>
                  <h3 className="power5-subheading">Resource deployments (log)</h3>
                  <p className="subtitle">Recent deployment entries tied to events or counties.</p>
                  {finance.deployments.length === 0 ? (
                    <p className="subtitle">No deployment rows yet.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {finance.deployments.slice(0, 12).map((d) => (
                        <li key={d.id} className="subtitle">
                          {d.deployment_kind.replace(/_/g, ' ')} · {d.amount.toLocaleString()}
                          {d.county_id ? ` · ${d.county_id}` : ''}
                          {d.deployed_at ? ` · ${String(d.deployed_at).slice(0, 10)}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
