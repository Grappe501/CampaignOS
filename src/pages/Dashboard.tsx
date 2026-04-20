import { useEffect, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useVoterMatch } from '../hooks/useVoterMatch'
import { supabase } from '../lib/supabaseClient'
import { getNextStep } from '../lib/dashboardState'
import AppHeader from '../components/AppHeader'
import AgentJones from '../components/AgentJones'
import VoterMatchForm from '../components/VoterMatchForm'
import VoterWidget from '../components/VoterWidget'
import DashboardGrid from '../components/dashboard/DashboardGrid'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import NextStepCard from '../components/dashboard/NextStepCard'
import PlaceholderCard from '../components/dashboard/PlaceholderCard'
import StatusCard from '../components/dashboard/StatusCard'
import VoterStatusCard from '../components/dashboard/VoterStatusCard'

export default function Dashboard() {
  const { profile, loading } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const voterMatch = useVoterMatch(profileId)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null)
    })
  }, [])

  const voterMatched = Boolean(voterMatch.matched)
  const nextStep = getNextStep({
    profile,
    voterMatched,
    voterLoading: voterMatch.matchedLoading,
  })

  if (loading) {
    return (
      <>
        <AppHeader onSignOut={() => supabase.auth.signOut()} />
        <div className="app-shell">
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AppHeader onSignOut={() => supabase.auth.signOut()} />
      <main className="app-shell">
        <DashboardGrid>
          <DashboardHeader profile={profile} email={accountEmail} />

          <NextStepCard step={nextStep} />

          <div className="dash-two-col">
            <VoterStatusCard profile={profile} voterMatched={voterMatched} />
            <StatusCard title="Workspace snapshot" id="workspace-summary">
              <dl className="summary-grid">
                <dt>Active space</dt>
                <dd>
                  {profile?.active_space != null &&
                  String(profile.active_space).trim() !== ''
                    ? String(profile.active_space)
                    : '—'}
                </dd>
                <dt>Onboarding status</dt>
                <dd>
                  {profile?.onboarding_status != null &&
                  String(profile.onboarding_status).trim() !== ''
                    ? String(profile.onboarding_status)
                    : '—'}
                </dd>
                <dt>Role / team</dt>
                <dd>
                  {String(profile?.primary_role ?? 'Volunteer')} ·{' '}
                  {String(profile?.primary_team ?? 'Unassigned')}
                </dd>
              </dl>
            </StatusCard>
          </div>

          <section
            id="voter-workspace"
            className="voter-workspace-section stack-section"
            aria-label="Voter verification"
          >
            <h2 className="sr-only">Voter verification</h2>
            {voterMatch.matchedLoading ? (
              <p className="subtitle">Loading voter match…</p>
            ) : voterMatch.matched ? (
              <VoterWidget voter={voterMatch.matched} />
            ) : (
              <VoterMatchForm vm={voterMatch} campaignProfileId={profileId} />
            )}
          </section>

          <section
            id="workspace-cards"
            className="workspace-cards-section stack-section"
            aria-labelledby="workspace-cards-title"
          >
            <h2
              id="workspace-cards-title"
              className="page-title"
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw + 0.5rem, 1.5rem)',
                margin: 0,
              }}
            >
              Training, tasks & team
            </h2>
            <p className="subtitle" style={{ marginBottom: 4 }}>
              Placeholders for the next build slices — same layout on phone and
              iPad.
            </p>
            <div className="dash-placeholder-grid">
              <PlaceholderCard
                title="Training"
                description="Videos, walkthroughs, and role play — launch checklist when you are cleared to send mail."
              />
              <PlaceholderCard
                title="Tasks"
                description="Canvass, phone bank, and data tasks assigned to you and your team."
              />
              <PlaceholderCard
                title="Team"
                description="See captains, pods, and shared goals without leaving this workspace."
              />
              <PlaceholderCard
                title="Growth path"
                description="Level up from volunteer to lead with milestones tied to real outcomes."
              />
            </div>
          </section>

          <div id="agent-jones" className="agent-jones-anchor">
            <AgentJones />
          </div>
        </DashboardGrid>
      </main>
    </>
  )
}
