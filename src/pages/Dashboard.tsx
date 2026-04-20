import { useCallback, useEffect, useRef, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useTasks } from '../hooks/useTasks'
import { useTraining } from '../hooks/useTraining'
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
  isRegisteredArkansasVoterBranch,
  needsOnboardingPath,
  normalizeKey,
  progressionGateMessage,
  REGISTERED_ARKANSAS_VOTER_BRANCH,
} from '../lib/dashboardState'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import FloatingAgentJones from '../components/FloatingAgentJones'
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
import WorkspaceDock from '../components/WorkspaceDock'

const VOTER_WORKSPACE_EXPANDED_KEY = 'campaignos-voter-workspace-expanded'

function readVoterWorkspaceExpanded(): boolean {
  try {
    return sessionStorage.getItem(VOTER_WORKSPACE_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

type DashboardProps = {
  /** Clears the dev-only React session in App (Supabase sign-out alone is not enough). */
  onDevSessionClear?: () => void
}

export default function Dashboard({ onDevSessionClear }: DashboardProps) {
  const { profile, loading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const onVoterMatchDone = useCallback(() => {
    void refetch()
  }, [refetch])
  const voterMatch = useVoterMatch(profileId, {
    onAfterMatch: onVoterMatchDone,
  })
  const tasks = useTasks(profileId)
  const training = useTraining(profileId)
  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    isDevAuthBypassEnabled() ? devBypassDisplayEmail() : null,
  )
  const [agentJonesOpen, setAgentJonesOpen] = useState(false)
  const [voterWorkspaceExpanded, setVoterWorkspaceExpanded] = useState(false)
  const voterMatchReadyRef = useRef(false)
  const prevVoterMatchedRef = useRef(false)

  const toggleVoterWorkspace = useCallback(() => {
    setVoterWorkspaceExpanded((prev) => {
      const next = !prev
      try {
        sessionStorage.setItem(VOTER_WORKSPACE_EXPANDED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

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

  const voterLinked =
    Boolean(voterMatch.matched) ||
    Boolean(
      profile?.linked_voter_id != null && String(profile.linked_voter_id).trim() !== '',
    )
  const voterMatched = voterLinked
  const branchSet = Boolean(normalizeKey(profile?.onboarding_branch))

  useEffect(() => {
    if (isDevAuthBypassEnabled() || !profileId || !voterMatched || branchSet) return
    let cancelled = false
    void supabase
      .from('campaign_profiles')
      .update({ onboarding_branch: REGISTERED_ARKANSAS_VOTER_BRANCH })
      .eq('id', profileId)
      .then(({ error }) => {
        if (!cancelled && !error) void refetch()
      })
    return () => {
      cancelled = true
    }
  }, [profileId, voterMatched, branchSet, refetch])

  useEffect(() => {
    if (voterMatched) {
      void refetch()
      void tasks.refetch()
      void training.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when match flips; avoid tasks/training object identity churn
  }, [voterMatched, refetch, tasks.refetch, training.refetch])

  useEffect(() => {
    if (voterMatch.matchedLoading) return

    if (!voterMatchReadyRef.current) {
      voterMatchReadyRef.current = true
      prevVoterMatchedRef.current = voterMatched
      if (voterMatched) {
        queueMicrotask(() => {
          setVoterWorkspaceExpanded(readVoterWorkspaceExpanded())
        })
      }
      return
    }

    if (voterMatched && !prevVoterMatchedRef.current) {
      queueMicrotask(() => {
        setVoterWorkspaceExpanded(false)
      })
      try {
        sessionStorage.setItem(VOTER_WORKSPACE_EXPANDED_KEY, '0')
      } catch {
        /* ignore */
      }
    }
    prevVoterMatchedRef.current = voterMatched
  }, [voterMatched, voterMatch.matchedLoading])

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

  const structuredTask =
    voterMatch.matchedLoading || tasks.loading ? null : tasks.structured
  const structuredTraining =
    voterMatch.matchedLoading || training.loading ? null : training.structured

  const firstTaskModel = getFirstTaskCardModel({
    slice: progressSlice,
    profile,
    voterLoading: voterMatch.matchedLoading,
    structured: structuredTask,
  })

  const trainingModel = getTrainingCardModel({
    slice: progressSlice,
    profile,
    voterLoading: voterMatch.matchedLoading,
    structured: structuredTraining,
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
        <main className="app-shell">
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        </main>
        <AppFooter />
      </>
    )
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell dashboard-workspace">
        <WorkspaceDock onAgentOpen={() => setAgentJonesOpen(true)} />
        <DashboardGrid>
          <DashboardHeader
            profile={profile}
            email={accountEmail}
            matchedVoter={voterMatch.matched}
          />

          <NextStepCard step={nextStep} />

          {!branchSet ? (
            <OnboardingBranchCard
              profileId={profileId}
              currentBranch={profile?.onboarding_branch}
              onSaved={() => void refetch()}
            />
          ) : null}

          <div
            className={`dash-two-col dash-two-col--compact${voterMatched ? ' dash-two-col--post-match' : ''}`}
          >
            <VoterStatusCard profile={profile} voterMatched={voterMatched} />
            <StatusCard title="Workspace snapshot" id="workspace-summary">
              <dl className="summary-grid">
                <dt>Volunteer path</dt>
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
            className={`voter-workspace-section stack-section${
              voterMatched && !voterWorkspaceExpanded
                ? ' voter-workspace-section--collapsed'
                : ''
            }${voterMatched && voterWorkspaceExpanded ? ' voter-workspace-section--expanded' : ''}`}
            aria-label="Voter look up"
          >
            <h2 className="sr-only">Voter look up</h2>
            {voterMatch.matchedLoading ? (
              <p className="subtitle">Loading voter match…</p>
            ) : voterMatch.matched ? (
              <div className="voter-workspace-panel">
                <div className="voter-workspace-panel-toolbar">
                  <button
                    type="button"
                    className="btn-touch voter-workspace-toggle"
                    onClick={toggleVoterWorkspace}
                    aria-expanded={voterWorkspaceExpanded}
                    aria-controls="voter-workspace-panel-body"
                  >
                    {voterWorkspaceExpanded
                      ? 'Collapse voter workspace'
                      : 'Expand voter workspace'}
                  </button>
                </div>
                <div
                  id="voter-workspace-panel-body"
                  className="voter-workspace-panel-body"
                >
                  <VoterWidget
                    voter={voterMatch.matched}
                    panelMode={
                      voterWorkspaceExpanded ? 'expanded' : 'compact'
                    }
                  />
                </div>
              </div>
            ) : profile?.linked_voter_id ? (
              <div className="card voter-resync-hint">
                <p className="subtitle" style={{ margin: 0 }}>
                  Voter link saved to your profile (
                  <code>{String(profile.linked_voter_id)}</code>). Loading full
                  record…
                </p>
                <button
                  type="button"
                  className="btn-touch"
                  style={{ marginTop: 10 }}
                  onClick={() => void voterMatch.reloadMatched()}
                >
                  Refresh voter display
                </button>
              </div>
            ) : !branchSet ? (
              <div className="card voter-resync-hint">
                <p className="subtitle" style={{ margin: 0 }}>
                  Choose your volunteer path above. Registered Arkansas voters can
                  look up their voter ID next; other paths use roster exception.
                </p>
              </div>
            ) : isRegisteredArkansasVoterBranch(profile) ? (
              <VoterMatchForm vm={voterMatch} campaignProfileId={profileId} />
            ) : (
              <div className="card voter-resync-hint">
                <p className="subtitle" style={{ margin: 0 }}>
                  For your path, coordinators clear your roster via the exception
                  request below — not the voter file lookup.
                </p>
              </div>
            )}
          </section>

          <ExceptionRequestCard
            profileId={profileId}
            status={profile?.exception_request_status}
            note={profile?.exception_request_note}
            voterMatched={voterMatched}
            onSubmitted={() => void refetch()}
          />

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

          <div id="agent-jones" className="agent-jones-anchor" aria-hidden="true" />
        </DashboardGrid>
        <FloatingAgentJones
          key={`${progressSlice}-${voterMatch.matchedLoading}-${normalizeKey(
            profile?.onboarding_branch,
          )}-${normalizeKey(profile?.exception_request_status)}-${
            progressSlice === 'matched_ready' && needsOnboardingPath(profile)
              ? 'orient'
              : 'x'
          }-${tasks.structured?.title ?? ''}-${training.structured?.title ?? ''}`}
          open={agentJonesOpen}
          onOpenChange={setAgentJonesOpen}
          progressSlice={progressSlice}
          profile={profile}
          voterLoading={voterMatch.matchedLoading}
          voterMatched={voterMatched}
          matchedVoter={voterMatch.matched}
        />
      </main>
      <AppFooter />
    </>
  )
}
