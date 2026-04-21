import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import SimulationComparisonTable from '../components/simulation/SimulationComparisonTable'
import SimulationCustomPanel from '../components/simulation/SimulationCustomPanel'
import { useProfile } from '../hooks/useProfile'
import { useSimulationCommandLayer } from '../hooks/useSimulationCommandLayer'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type Props = {
  onDevSessionClear?: () => void
}

export default function SimulationCommandPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()
  const sim = useSimulationCommandLayer(profile?.primary_role)

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
          <div className="leadership-briefing-page" id="simulation-command-root">
            <header className="leadership-briefing-page__hero">
              <div>
                <p className="event-coordinator-desk__eyebrow">Strategy lab</p>
                <h1 className="event-coordinator-desk__title">Campaign simulation</h1>
                <p className="event-coordinator-desk__lede">
                  Compare lever scenarios against the same baseline snapshot (conversion, GOTV, events, finance).
                  Outputs are <strong>readiness indices</strong> for discussion — not ballot predictions.
                </p>
              </div>
            </header>

            {!sim.enabled ? (
              <p className="event-coordinator-desk__placeholder" role="status">
                Simulation command requires coordinator or leadership desk access.
              </p>
            ) : sim.dataLoading ? (
              <p className="event-coordinator-desk__meta" role="status">
                Loading simulation inputs…
              </p>
            ) : sim.error ? (
              <p className="event-coordinator-desk__placeholder" role="alert">
                {sim.error}
              </p>
            ) : (
              <>
                <div className="card card--inner stack-section">
                  <h3 className="power5-subheading">Baseline snapshot</h3>
                  <p className="subtitle">
                    Phase <strong>{sim.baseline.turnout_phase.replace(/_/g, ' ')}</strong> · tracked{' '}
                    <strong>{sim.baseline.conversion.tracked_voters}</strong> · GOTV sites{' '}
                    <strong>{sim.baseline.gotv.total_sites}</strong> (μ coverage{' '}
                    {sim.baseline.gotv.mean_coverage_pct}%) · program events <strong>{sim.baseline.programs.active_event_count}</strong>{' '}
                    · volunteers <strong>{sim.baseline.volunteers.roster_count}</strong> roster /{' '}
                    <strong>{sim.baseline.volunteers.active_pipeline_count}</strong> active pipeline
                  </p>
                  {sim.baseline.data_gaps.length ? (
                    <p className="subtitle">
                      <strong>Data gaps:</strong> {sim.baseline.data_gaps.join(', ')}
                    </p>
                  ) : null}
                  <p className="subtitle">{sim.builtInCompare.recommendation_line}</p>
                </div>

                <SimulationComparisonTable
                  baselineReadiness={sim.builtInCompare.baseline_readiness}
                  rows={sim.builtInCompare.rows}
                />

                <SimulationCustomPanel
                  vars={sim.customVars}
                  onChange={sim.setCustomVars}
                  outputs={sim.customRun.outputs}
                  confidence={sim.customRun.confidence}
                />

                <div className="card card--inner stack-section">
                  <h3 className="power5-subheading">Risk &amp; sensitivity</h3>
                  <p className="subtitle">
                    +1% volunteer lever → readiness Δ <strong>{sim.sensitivity.volunteer_1pct_readiness_delta}</strong>
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                    {sim.risks.map((r) => (
                      <li key={r.id} className="subtitle">
                        <strong>{r.severity}</strong> — {r.line}
                      </li>
                    ))}
                  </ul>
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
