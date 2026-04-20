import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import VolunteerCommandNav from '../components/volunteer-command/VolunteerCommandNav'
import { useProfile } from '../hooks/useProfile'
import { useVolunteerCommandCoordinator } from '../hooks/useVolunteerCommandCoordinator'
import { supabase } from '../lib/supabaseClient'

type Props = { onDevSessionClear?: () => void }

export default function VolunteerCommandCoordinatorPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()
  const desk = useVolunteerCommandCoordinator('default')

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status">
            Loading…
          </div>
        ) : (
          <div className="event-coordinator-desk volunteer-command-page" id="volunteer-command-coordinator">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Volunteer operations</p>
              <h1 className="event-coordinator-desk__title">Coordinator command center</h1>
              <p className="event-coordinator-desk__lede">
                Live roster, onboarding funnel, coverage, and recommendations. Requires coordinator or
                supervisor scope in Supabase policies.
              </p>
              <VolunteerCommandNav />
            </header>

            {desk.error ? (
              <p className="event-coordinator-desk__placeholder" role="alert">
                {desk.error.message}
              </p>
            ) : null}

            {desk.loading ? (
              <p className="event-coordinator-desk__meta" role="status">
                Loading volunteer command data…
              </p>
            ) : null}

            {!desk.loading && !desk.error && desk.volunteers.length === 0 ? (
              <p className="event-coordinator-desk__placeholder">
                No volunteer profiles in this campaign yet. Add volunteers through intake or roster tools
                to populate this command center.
              </p>
            ) : null}

            <section className="event-coordinator-desk__section" aria-labelledby="vc-funnel">
              <h2 id="vc-funnel" className="event-coordinator-desk__h2">
                Onboarding funnel
              </h2>
              <ul className="volunteer-command__stat-grid">
                <li>
                  <strong>{desk.funnel.new}</strong> new
                </li>
                <li>
                  <strong>{desk.funnel.contacted}</strong> contacted
                </li>
                <li>
                  <strong>{desk.funnel.onboarding}</strong> onboarding
                </li>
                <li>
                  <strong>{desk.funnel.ready}</strong> ready
                </li>
                <li>
                  <strong>{desk.funnel.active}</strong> active
                </li>
                <li>
                  <strong>{desk.funnel.paused}</strong> paused
                </li>
              </ul>
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-active">
              <h2 id="vc-active" className="event-coordinator-desk__h2">
                Active volunteers
              </h2>
              <p className="event-coordinator-desk__meta">
                <strong>{desk.volunteers.length}</strong> profiles in campaign
              </p>
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-open">
              <h2 id="vc-open" className="event-coordinator-desk__h2">
                Unfilled / open assignments
              </h2>
              {desk.unfilledOpen.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">No open slots.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {desk.unfilledOpen.map((a) => (
                    <li key={a.id}>
                      <strong>{a.roleSlug}</strong> · {a.priority} · due{' '}
                      {a.dueAt ? new Date(a.dueAt).toLocaleString() : '—'}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-cov">
              <h2 id="vc-cov" className="event-coordinator-desk__h2">
                Shift coverage
              </h2>
              {desk.coverageRows.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">
                  No shift slots or shifts not yet configured.
                </p>
              ) : (
                <div className="event-record-desk__table-wrap">
                  <table className="event-record-desk__table">
                    <thead>
                      <tr>
                        <th>Shift</th>
                        <th>Role</th>
                        <th>Target</th>
                        <th>Filled</th>
                        <th>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desk.coverageRows.map((r, i) => (
                        <tr key={`${r.shiftId}-${r.roleSlug}-${i}`}>
                          <td>{r.title}</td>
                          <td>
                            <code>{r.roleSlug}</code>
                          </td>
                          <td>{r.target}</td>
                          <td>{r.filled}</td>
                          <td>
                            {r.gap}
                            {r.atRisk ? ' · at-risk window' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-rem">
              <h2 id="vc-rem" className="event-coordinator-desk__h2">
                Reminder queue (internal)
              </h2>
              <p className="event-coordinator-desk__meta">
                Pending: <strong>{desk.reminderSummary.pending}</strong> · Escalated:{' '}
                <strong>{desk.reminderSummary.escalated}</strong>
                {desk.reminderSummary.nextDue
                  ? ` · next due ${new Date(desk.reminderSummary.nextDue).toLocaleString()}`
                  : ''}
              </p>
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-asg-rem">
              <h2 id="vc-asg-rem" className="event-coordinator-desk__h2">
                Assignment reminders (scheduled)
              </h2>
              {desk.assignmentReminders.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">No pending assignment reminders.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {desk.assignmentReminders.slice(0, 25).map((r) => (
                    <li key={r.id}>
                      <code>{r.reminderType}</code> · assignment {r.assignmentId.slice(0, 8)}… ·{' '}
                      {new Date(r.scheduledFor).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-rel">
              <h2 id="vc-rel" className="event-coordinator-desk__h2">
                Reliability snapshot
              </h2>
              <ul className="volunteer-command__list">
                {desk.reliabilityPreview.slice(0, 15).map((r) => (
                  <li key={r.volunteer.id}>
                    {r.volunteer.displayName ?? r.volunteer.email ?? r.volunteer.id.slice(0, 8)} —{' '}
                    <strong>{r.category}</strong> · pipeline: {r.pipeline}
                  </li>
                ))}
              </ul>
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-el">
              <h2 id="vc-el" className="event-coordinator-desk__h2">
                Emerging leader candidates
              </h2>
              {desk.emergingLeaders.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">None flagged yet.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {desk.emergingLeaders.map((v) => (
                    <li key={v.id}>
                      {v.displayName ?? v.email} — leadership {v.leadershipPotential ?? '—'} · rel{' '}
                      {v.reliabilityScore ?? '—'}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vc-rec">
              <h2 id="vc-rec" className="event-coordinator-desk__h2">
                Match preview (greeter)
              </h2>
              <p className="event-coordinator-desk__placeholder">
                Explainable scores — top factors listed per volunteer.
              </p>
              <ul className="volunteer-command__list">
                {desk.recommendForRole('greeter').map((rec) => (
                  <li key={rec.volunteerId}>
                    <strong>{rec.displayLabel}</strong> — score {(rec.score * 100).toFixed(0)}
                    <ul>
                      {rec.reasons.slice(0, 4).map((x) => (
                        <li key={x.code + x.detail}>
                          {x.code}: {x.detail}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
