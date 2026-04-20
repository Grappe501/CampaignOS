import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import VolunteerCommandNav from '../components/volunteer-command/VolunteerCommandNav'
import { useProfile } from '../hooks/useProfile'
import { useVolunteerSelfService } from '../hooks/useVolunteerSelfService'
import { supabase } from '../lib/supabaseClient'

type Props = { onDevSessionClear?: () => void }

export default function VolunteerSelfServicePage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()
  const profileId = profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const self = useVolunteerSelfService(profileId)

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
          <div className="event-coordinator-desk volunteer-command-page" id="volunteer-self-service">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Volunteer hub</p>
              <h1 className="event-coordinator-desk__title">My assignments & shifts</h1>
              <p className="event-coordinator-desk__lede">
                Claim open work, complete checklists, and track training. Create your volunteer
                profile once to unlock assignments.
              </p>
              <VolunteerCommandNav />
              <div className="event-coordinator-desk__quick-actions">
                <button
                  type="button"
                  className="btn-touch"
                  disabled={!profileId || self.loading}
                  onClick={() => void self.ensureProfile()}
                >
                  Ensure volunteer profile
                </button>
              </div>
            </header>

            {self.error ? (
              <p className="event-coordinator-desk__placeholder" role="alert">
                {self.error.message}
              </p>
            ) : null}

            {self.loading ? (
              <p className="event-coordinator-desk__meta" role="status">
                Loading…
              </p>
            ) : null}

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">My volunteer record</h2>
              {!self.volunteer ? (
                <p className="event-coordinator-desk__placeholder">
                  No volunteer row yet — tap &quot;Ensure volunteer profile&quot; above.
                </p>
              ) : (
                <p className="event-coordinator-desk__meta">
                  Status: <strong>{self.volunteer.onboardingStatus}</strong> · Active:{' '}
                  <strong>{self.volunteer.activeStatus}</strong>
                  {self.volunteer.reliabilityScore != null
                    ? ` · Reliability ${self.volunteer.reliabilityScore.toFixed(0)}`
                    : ''}
                </p>
              )}
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">Open pool (claim)</h2>
              {self.openPool.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">Nothing open to claim.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {self.openPool.map((a) => (
                    <li key={a.id} className="volunteer-command__claim-row">
                      <div>
                        <strong>{a.roleSlug}</strong> · {a.priority}
                        {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleString()}` : ''}
                      </div>
                      <button
                        type="button"
                        className="btn-touch btn-touch--ghost"
                        disabled={!self.volunteer}
                        onClick={() => void self.claim(a.id)}
                      >
                        Claim
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">My assignments</h2>
              {self.mine.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">No assignments yet.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {self.mine.map((a) => (
                    <li key={a.id} className="volunteer-command__claim-row">
                      <div>
                        <strong>{a.roleSlug}</strong> · {a.status}
                      </div>
                      <div className="volunteer-command__row-actions">
                        {a.status !== 'completed' && a.status !== 'declined' ? (
                          <>
                            <button
                              type="button"
                              className="btn-touch btn-touch--ghost"
                              onClick={() => void self.complete(a.id)}
                            >
                              Mark complete
                            </button>
                            <button
                              type="button"
                              className="btn-touch btn-touch--ghost"
                              onClick={() => {
                                const r = window.prompt('Decline reason?') ?? ''
                                if (r.trim()) void self.decline(a.id, r.trim())
                              }}
                            >
                              Decline
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">Training</h2>
              {self.training.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">No training rows yet.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {self.training.map((t) => (
                    <li key={t.id}>
                      {t.trainingKey} — {t.status}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
