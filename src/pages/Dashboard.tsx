import { useEffect, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useVoterMatch } from '../hooks/useVoterMatch'
import {
  devBypassDisplayEmail,
  isDevAuthBypassEnabled,
} from '../lib/devAuth'
import { supabase } from '../lib/supabaseClient'
import {
  getDashboardProgressSlice,
  getFirstTaskCardModel,
  getNextStep,
  getTrainingCardModel,
  hasProgressIdentity,
  normalizeKey,
  progressionGateMessage,
} from '../lib/dashboardState'
import AppHeader from '../components/AppHeader'
import AgentJones from '../components/AgentJones'
import VoterMatchForm from '../components/VoterMatchForm'
import VoterWidget from '../components/VoterWidget'
import DashboardGrid from '../components/dashboard/DashboardGrid'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import ExceptionRequestCard from '../components/dashboard/ExceptionRequestCard'
import FirstTaskCard from '../components/dashboard/FirstTaskCard'
import NextStepCard from '../components/dashboard/NextStepCard'
import OnboardingBranchCard from '../components/dashboard/OnboardingBranchCard'
import PlaceholderCard from '../components/dashboard/PlaceholderCard'
import StatusCard from '../components/dashboard/StatusCard'
import TrainingCard from '../components/dashboard/TrainingCard'
import VoterStatusCard from '../components/dashboard/VoterStatusCard'

type DashboardProps = {
  /** Clears the dev-only React session in App (Supabase sign-out alone is not enough). */
  onDevSessionClear?: () => void
}

export default function Dashboard({ onDevSessionClear }: DashboardProps) {
  const { profile, loading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const voterMatch = useVoterMatch(profileId)
  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    isDevAuthBypassEnabled() ? devBypassDisplayEmail() : null,
  )

  useEffect(() => {
    if (isDevAuthBypassEnabled()) {
      return
    }
    void supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null)
    })
  }, [])

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const voterMatched = Boolean(voterMatch.matched)
  const identity = hasProgressIdentity(
    voterMatched,
    profile?.exception_request_status,
  )
  const branchSet = Boolean(normalizeKey(profile?.onboarding_branch))

  useEffect(() => {
    if (voterMatched) void refetch()
  }, [voterMatched, refetch])

  const nextStep = getNextStep({
    profile,
    voterMatched,
    voterLoading: voterMatch.matchedLoading,
  })

  const progressSlice = getDashboardProgressSlice({
    profile,
    voterMatched,
    voterLoading: voterMatch.matchedLoading,
  })

  const firstTaskModel = getFirstTaskCardModel({
    slice: progressSlice,
    profile,
    voterLoading: voterMatch.matchedLoading,
  })

  const trainingModel = getTrainingCardModel({
    slice: progressSlice,
    profile,
    voterLoading: voterMatch.matchedLoading,
  })

  const gate = progressionGateMessage(
    voterMatched,
    profile?.exception_request_status,
    profile?.primary_role,
  )

  if (loading) {
    return (
      <>
        <AppHeader onSignOut={handleSignOut} />
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
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell">
        <DashboardGrid>
          <DashboardHeader profile={profile} email={accountEmail} />

          <NextStepCard step={nextStep} />

          <div className="dash-two-col">
            <VoterStatusCard profile={profile} voterMatched={voterMatched} />
            <StatusCard title="Workspace snapshot" id="workspace-summary">
              <dl className="summary-grid">
                <dt>Onboarding branch</dt>
                <dd>
                  {profile?.onboarding_branch != null &&
                  String(profile.onboarding_branch).trim() !== ''
                    ? String(profile.onboarding_branch)
                    : '—'}
                </dd>
                <dt>Exception status</dt>
                <dd>
                  {profile?.exception_request_status != null &&
                  String(profile.exception_request_status).trim() !== ''
                    ? String(profile.exception_request_status)
                    : 'none'}
                </dd>
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
              {gate ? (
                <p
                  className="subtitle"
                  role="note"
                  style={{ marginTop: 12, marginBottom: 0, fontWeight: 600 }}
                >
                  {gate}
                </p>
              ) : null}
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

          <ExceptionRequestCard
            profileId={profileId}
            status={profile?.exception_request_status}
            note={profile?.exception_request_note}
            voterMatched={voterMatched}
            onSubmitted={() => void refetch()}
          />

          {identity && !branchSet ? (
            <OnboardingBranchCard
              profileId={profileId}
              currentBranch={profile?.onboarding_branch}
              onSaved={() => void refetch()}
            />
          ) : null}

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
              First task and training follow your roster state; team and growth
              stay on deck — same layout on phone and iPad.
            </p>
            <div className="dash-placeholder-grid">
              <FirstTaskCard model={firstTaskModel} />
              <TrainingCard model={trainingModel} />
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
