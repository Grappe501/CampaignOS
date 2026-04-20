import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import VolunteerCommandNav from '../components/volunteer-command/VolunteerCommandNav'
import { useProfile } from '../hooks/useProfile'
import { useVolunteerTeamLead } from '../hooks/useVolunteerTeamLead'
import { supabase } from '../lib/supabaseClient'

type Props = { onDevSessionClear?: () => void }

export default function VolunteerCommandTeamLeadPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()
  const profileId = profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const desk = useVolunteerTeamLead(profileId)

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
          <div className="event-coordinator-desk volunteer-command-page" id="volunteer-command-team-lead">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Volunteer operations</p>
              <h1 className="event-coordinator-desk__title">Team lead desk</h1>
              <p className="event-coordinator-desk__lede">
                Scoped to volunteers on your Power5 team when you are listed in{' '}
                <code>volunteer_supervisor_teams</code>.
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
                Loading…
              </p>
            ) : null}

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">My volunteers</h2>
              {desk.myVolunteers.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">
                  No team-scoped volunteers yet, or supervisor linkage missing.
                </p>
              ) : (
                <ul className="volunteer-command__list">
                  {desk.myVolunteers.map((v) => (
                    <li key={v.id}>
                      {v.displayName ?? v.email} — {v.onboardingStatus}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">My team assignments</h2>
              <ul className="volunteer-command__list">
                {desk.assignments.slice(0, 40).map((a) => (
                  <li key={a.id}>
                    <strong>{a.roleSlug}</strong> · {a.status}
                    {a.dueAt ? ` · ${new Date(a.dueAt).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">Claim gaps (campaign)</h2>
              <p className="event-coordinator-desk__meta">{desk.claimGaps.length} open</p>
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">Coverage gaps</h2>
              {desk.coverageRows.filter((r) => r.gap > 0).length === 0 ? (
                <p className="event-coordinator-desk__placeholder">No gaps in view.</p>
              ) : (
                <ul className="volunteer-command__list">
                  {desk.coverageRows
                    .filter((r) => r.gap > 0)
                    .map((r, i) => (
                      <li key={`${r.shiftId}-${i}`}>
                        {r.title} · {r.roleSlug} · gap {r.gap}
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">No-show / missed (team)</h2>
              <ul className="volunteer-command__list">
                {desk.noShowRisks.length === 0 ? (
                  <li>None in scope.</li>
                ) : (
                  desk.noShowRisks.map((a) => (
                    <li key={a.id}>
                      {a.roleSlug} · {a.status}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="event-coordinator-desk__section">
              <h2 className="event-coordinator-desk__h2">Ready for more responsibility</h2>
              <ul className="volunteer-command__list">
                {desk.readyForMore.map((v) => (
                  <li key={v.id}>{v.displayName ?? v.email}</li>
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
