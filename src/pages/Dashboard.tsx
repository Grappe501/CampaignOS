import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHdWorkspace } from '../hooks/useHdWorkspace'
import { useProfile } from '../hooks/useProfile'
import { usePublicOfficials } from '../hooks/usePublicOfficials'
import { useTasks } from '../hooks/useTasks'
import { useTraining } from '../hooks/useTraining'
import { useVoterMatch } from '../hooks/useVoterMatch'
import { usePower5Workspace } from '../hooks/usePower5Workspace'
import { usePower5Propagation } from '../hooks/usePower5Propagation'
import { useVolunteerTasks } from '../hooks/useVolunteerTasks'
import { useDailyMission } from '../hooks/useDailyMission'
import { useInternLayer } from '../hooks/useInternLayer'
import { useCampaignKpis } from '../hooks/useCampaignKpis'
import {
  devBypassDisplayEmail,
  isDevAuthBypassEnabled,
} from '../lib/devAuth'
import { supabase } from '../lib/supabaseClient'
import { buildExpandedOfficialsList } from '../lib/api/publicOfficials'
import {
  getDashboardProgressSlice,
  getFirstTaskCardModel,
  getNextStep,
  getTrainingCardModel,
  isRegisteredArkansasVoterBranch,
  normalizeKey,
  progressionGateMessage,
  REGISTERED_ARKANSAS_VOTER_BRANCH,
} from '../lib/dashboardState'
import {
  getBranchSpecialtyCards,
  getVolunteerGlobalCards,
  type VolunteerPathCardsContext,
} from '../lib/volunteerDashboardCards'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import VoterMatchForm from '../components/VoterMatchForm'
import VoterWidget from '../components/VoterWidget'
import DashboardGrid from '../components/dashboard/DashboardGrid'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import DashboardPanelFrame from '../components/dashboard/DashboardPanelFrame'
import ExceptionRequestCard from '../components/dashboard/ExceptionRequestCard'
import FirstTaskCard from '../components/dashboard/FirstTaskCard'
import NextStepCard from '../components/dashboard/NextStepCard'
import OnboardingActivationCard from '../components/dashboard/OnboardingActivationCard'
import OnboardingBranchCard from '../components/dashboard/OnboardingBranchCard'
import PlaceholderCard from '../components/dashboard/PlaceholderCard'
import StatusCard from '../components/dashboard/StatusCard'
import TrainingCard from '../components/dashboard/TrainingCard'
import OfficialContactModal from '../components/dashboard/OfficialContactModal'
import PublicOfficialsCard from '../components/dashboard/PublicOfficialsCard'
import type { PublicOfficialEntry } from '../lib/api/publicOfficials'
import VoterStatusCard from '../components/dashboard/VoterStatusCard'
import WorkspaceDock from '../components/WorkspaceDock'
import {
  WORKSPACE_DOCK_ITEMS,
  type WorkspaceSectionGlyphId,
} from '../components/workspace/workspaceDockModel'
import Power5SummaryCard from '../components/dashboard/Power5SummaryCard'
import TaskListCard from '../components/tasks/TaskListCard'
import DailyMissionCard from '../components/daily/DailyMissionCard'
import CampaignKpisCard from '../components/dashboard/CampaignKpisCard'
import LeadershipKpiScaffold from '../components/dashboard/LeadershipKpiScaffold'
import InternDeskContent from '../components/intern/InternDeskContent'
import VolunteerPathCardGrid from '../components/dashboard/VolunteerPathCardGrid'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCalendarWidgetPack } from '../hooks/useCalendarWidgetPack'
import {
  mapProfileRoleToCalendarWidgetPersona,
  shouldShowCalendarWidgetsOnVolunteerDashboard,
} from '../lib/calendarWidgetData'
import UpcomingCampaignStrip from '../components/calendar-widgets/UpcomingCampaignStrip'
import EventPressureSummaryCard from '../components/calendar-widgets/EventPressureSummaryCard'
import CalendarSnapshotCard from '../components/calendar-widgets/CalendarSnapshotCard'
import MobilizeQueueCard from '../components/calendar-widgets/MobilizeQueueCard'
import CountyEventRailCard from '../components/calendar-widgets/CountyEventRailCard'

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
  const { hdWorkspace, setHdWorkspace } = useHdWorkspace()
  const { profile, loading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const power5Workspace = usePower5Workspace(profileId)
  const power5Propagation = usePower5Propagation(profileId)
  const onVoterMatchDone = useCallback(() => {
    void refetch()
  }, [refetch])
  const voterMatch = useVoterMatch(profileId, {
    onAfterMatch: onVoterMatchDone,
  })
  const { officialsState, officialsLoading } = usePublicOfficials(
    voterMatch.matched ?? null,
  )
  const headerOfficials = useMemo(
    () =>
      buildExpandedOfficialsList(
        officialsState?.districtOfficials,
        officialsState?.officials,
      ),
    [officialsState?.districtOfficials, officialsState?.officials],
  )
  const [contactOfficial, setContactOfficial] = useState<PublicOfficialEntry | null>(
    null,
  )
  const tasks = useTasks(profileId)
  const training = useTraining(profileId)
  const volunteerTasks = useVolunteerTasks(profileId)
  const dailyMission = useDailyMission(profileId)
  const internDesk = useInternLayer(
    profileId,
    profile?.primary_role != null ? String(profile.primary_role) : null,
  )
  const campaignKpis = useCampaignKpis(
    profileId,
    profile?.primary_role != null ? String(profile.primary_role) : null,
  )
  const calendarPersona = mapProfileRoleToCalendarWidgetPersona(
    profile?.primary_role != null ? String(profile.primary_role) : null,
  )
  const calendarPack = useCalendarWidgetPack(calendarPersona)
  const showDashboardCalendar = shouldShowCalendarWidgetsOnVolunteerDashboard(calendarPersona)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.hash !== '#voter-workspace') return
    const id = window.setTimeout(() => {
      document.getElementById('voter-workspace')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 150)
    return () => window.clearTimeout(id)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (location.pathname !== '/intern') return
    if (!internDesk.isIntern) return
    const id = window.setTimeout(() => {
      document.getElementById('intern-desk')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 400)
    return () => window.clearTimeout(id)
  }, [location.pathname, internDesk.isIntern])
  const [accountEmail, setAccountEmail] = useState<string | null>(() =>
    isDevAuthBypassEnabled() ? devBypassDisplayEmail() : null,
  )
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
  const pathCardsContext: VolunteerPathCardsContext = useMemo(
    () => ({
      profile,
      voterLoading: voterMatch.matchedLoading,
      voterMatched,
      hasActiveMissionTasks: volunteerTasks.active.length > 0,
      missionTasksLoading: volunteerTasks.loading,
      hasPendingDailyTask: Boolean(dailyMission.nextPending),
      dailyMissionLoading: dailyMission.loading,
      power5HasNodes: power5Workspace.nodes.length > 0,
      power5Loading: power5Workspace.loading,
    }),
    [
      profile,
      voterMatch.matchedLoading,
      voterMatched,
      volunteerTasks.active.length,
      volunteerTasks.loading,
      dailyMission.nextPending,
      dailyMission.loading,
      power5Workspace.nodes.length,
      power5Workspace.loading,
    ],
  )

  const globalPathCards = useMemo(
    () => getVolunteerGlobalCards(pathCardsContext),
    [pathCardsContext],
  )

  const branchSpecialtyCards = useMemo(
    () => getBranchSpecialtyCards(profile?.onboarding_branch, pathCardsContext),
    [profile?.onboarding_branch, pathCardsContext],
  )

  const workspaceDockVisibleIds = useMemo(() => {
    const ids = new Set<WorkspaceSectionGlyphId>(
      WORKSPACE_DOCK_ITEMS.map((i) => i.id),
    )
    if (!internDesk.isIntern) ids.delete('intern-desk')
    if (!branchSet || branchSpecialtyCards.length === 0) {
      ids.delete('branch-specialty')
    }
    if (!voterMatch.matched) ids.delete('public-officials-card')
    if (branchSet) ids.delete('onboarding-branch')
    const ex = normalizeKey(profile?.exception_request_status)
    if (!profileId || (voterMatched && (ex === '' || ex === 'none'))) {
      ids.delete('exception-request')
    }
    return ids
  }, [
    internDesk.isIntern,
    branchSet,
    branchSpecialtyCards.length,
    voterMatch.matched,
    profileId,
    voterMatched,
    profile?.exception_request_status,
  ])

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
      void volunteerTasks.refetch()
      void dailyMission.refetch()
      void internDesk.refetch()
      void campaignKpis.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when match flips; avoid tasks/training object identity churn
  }, [voterMatched, refetch, tasks.refetch, training.refetch, volunteerTasks.refetch, dailyMission.refetch, internDesk.refetch, campaignKpis.refetch])

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

  useEffect(() => {
    if (isDevAuthBypassEnabled()) return
    if (!profileId || !voterMatched) return
    const rid = profile?.power5_recruiter_profile_id
    if (rid == null || String(rid).trim() === '') return
    void supabase
      .rpc('power5_attach_recruit_membership', {
        p_recruit_profile_id: profileId,
        p_recruiter_profile_id: String(rid),
      })
      .then(({ error }) => {
        if (error) console.warn('power5_attach_recruit_membership:', error.message)
      })
  }, [profileId, voterMatched, profile?.power5_recruiter_profile_id])

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
      <main
        className={`app-shell dashboard-workspace${hdWorkspace ? ' dashboard-workspace--hd' : ''}`}
      >
        <WorkspaceDock
          onAgentOpen={() =>
            window.dispatchEvent(new CustomEvent('campaignos:open-agent-jones'))
          }
          hdWorkspace={hdWorkspace}
          onHdWorkspaceChange={setHdWorkspace}
          visibleSectionIds={workspaceDockVisibleIds}
        />
        <DashboardGrid>
          <DashboardPanelFrame
            storageKey="dash-identity"
            labelCollapsed="Profile"
            sectionGlyph="dash-identity-title"
          >
            <DashboardHeader
              profile={profile}
              email={accountEmail}
              matchedVoter={voterMatch.matched}
              onProfileRefresh={() => void refetch()}
              hdWorkspace={hdWorkspace}
              onHdWorkspaceChange={setHdWorkspace}
              districtOfficials={officialsState?.districtOfficials ?? null}
              headerOfficials={headerOfficials}
              officialsLoading={officialsLoading}
              onOpenOfficial={setContactOfficial}
            />
          </DashboardPanelFrame>

          {showDashboardCalendar ? (
            <DashboardPanelFrame
              scrollId="dash-calendar-widgets"
              storageKey="dash-calendar-widgets"
              labelCollapsed="Campaign calendar"
              sectionGlyph="dash-calendar-widgets"
              defaultExpanded
            >
              <UpcomingCampaignStrip items={calendarPack.strip} />
              {calendarPersona === 'campaign_manager' ? (
                <div className="dash-calendar-widget-grid">
                  <EventPressureSummaryCard pressure={calendarPack.pressure} />
                  <CountyEventRailCard rows={calendarPack.countyRail} />
                  <CalendarSnapshotCard days={calendarPack.snapshotDays} />
                  <MobilizeQueueCard mobilize={calendarPack.mobilize} />
                </div>
              ) : (
                <CalendarSnapshotCard
                  days={calendarPack.snapshotDays}
                  title="Approved opportunities (next week)"
                />
              )}
            </DashboardPanelFrame>
          ) : null}

          <DashboardPanelFrame
            scrollId="next-step-card"
            storageKey="dash-next-step"
            labelCollapsed="Next step"
            sectionGlyph="next-step-card"
          >
            <NextStepCard step={nextStep} />
          </DashboardPanelFrame>

          <DashboardPanelFrame
            scrollId="volunteer-global"
            storageKey="dash-volunteer-global"
            labelCollapsed="Volunteer guide"
            sectionGlyph="volunteer-global"
          >
            <p className="subtitle" style={{ margin: '0 0 12px' }}>
              <Link to="/volunteers/me">Volunteer command hub</Link> — claim open assignments, track
              training, and keep your operational profile current.
            </p>
            <VolunteerPathCardGrid
              headingId="volunteer-global-heading"
              heading="Volunteer playbook"
              intro="Prioritized moves from your roster, orientation, and assignments. Each card can jump to the related section."
              cards={globalPathCards}
            />
          </DashboardPanelFrame>

          {internDesk.isIntern ? (
            <DashboardPanelFrame
              scrollId="intern-desk"
              storageKey="dash-intern-desk"
              labelCollapsed="Team desk"
              sectionGlyph="intern-desk"
            >
              <InternDeskContent
                showDirectRouteHint={location.pathname === '/intern'}
                intern={{
                  pipelines: internDesk.pipelines,
                  loading: internDesk.loading,
                  error: internDesk.error,
                  refetch: internDesk.refetch,
                  overdueCount: internDesk.overdueCount,
                  nowMs: internDesk.nowMs,
                }}
                tasks={{
                  active: volunteerTasks.active,
                  loading: volunteerTasks.loading,
                  error: volunteerTasks.error,
                  claim: volunteerTasks.claim,
                  complete: volunteerTasks.complete,
                  decline: volunteerTasks.decline,
                  refetch: volunteerTasks.refetch,
                }}
                onProfileRefetch={() => void refetch()}
              />
            </DashboardPanelFrame>
          ) : null}

          <DashboardPanelFrame
            scrollId="mission-tasks"
            storageKey="dash-mission-tasks"
            labelCollapsed="Mission"
            sectionGlyph="mission-tasks"
            defaultExpanded
          >
            <TaskListCard
              active={volunteerTasks.active}
              engagement={volunteerTasks.engagement}
              loading={volunteerTasks.loading}
              error={volunteerTasks.error}
              nextBest={volunteerTasks.nextBest}
              onClaim={volunteerTasks.claim}
              onComplete={async (id) => {
                const ok = await volunteerTasks.complete(id)
                if (ok) await campaignKpis.refetch()
                return ok
              }}
              onSkip={volunteerTasks.skip}
              onChecklistSave={volunteerTasks.saveChecklist}
              refetch={volunteerTasks.refetch}
            />
          </DashboardPanelFrame>

          <DashboardPanelFrame
            scrollId="daily-activation"
            storageKey="dash-daily-activation"
            labelCollapsed="Daily"
            sectionGlyph="daily-activation"
            defaultExpanded
          >
            <DailyMissionCard
              tasks={dailyMission.tasks}
              scores={dailyMission.scores}
              tier={dailyMission.tier}
              activationInsight={dailyMission.activationInsight}
              loading={dailyMission.loading}
              error={dailyMission.error}
              onComplete={dailyMission.complete}
              onSkip={dailyMission.skip}
            />
          </DashboardPanelFrame>

          <DashboardPanelFrame
            scrollId="campaign-kpis"
            storageKey="dash-campaign-kpis"
            labelCollapsed="Goals"
            sectionGlyph="campaign-kpis"
          >
            <CampaignKpisCard
              kpis={campaignKpis.kpis}
              contributions={campaignKpis.contributions}
              loading={campaignKpis.loading}
              error={campaignKpis.error}
            />
            {campaignKpis.isLeadership ? (
              <LeadershipKpiScaffold
                key={campaignKpis.kpis
                  .map((k) => `${k.id}:${k.target_value}`)
                  .join('|')}
                kpis={campaignKpis.kpis}
                missions={campaignKpis.missions}
                onUpdated={() => campaignKpis.refetch()}
              />
            ) : null}
          </DashboardPanelFrame>

          <DashboardPanelFrame
            scrollId="onboarding-activation"
            storageKey="dash-onboarding-activation"
            labelCollapsed="Get started"
            sectionGlyph="onboarding-activation"
          >
            <OnboardingActivationCard profile={profile} />
          </DashboardPanelFrame>

          {!branchSet ? (
            <DashboardPanelFrame
              scrollId="onboarding-branch"
              storageKey="dash-onboarding-branch"
              labelCollapsed="Volunteer path"
              sectionGlyph="onboarding-branch"
            >
              <OnboardingBranchCard
                profileId={profileId}
                currentBranch={profile?.onboarding_branch}
                onSaved={() => void refetch()}
              />
            </DashboardPanelFrame>
          ) : null}

          <div
            className={`dash-two-col dash-two-col--compact${voterMatched ? ' dash-two-col--post-match' : ''}`}
          >
            <DashboardPanelFrame
              scrollId="voter-status-card"
              storageKey="dash-voter-status"
              labelCollapsed="Voter status"
              sectionGlyph="voter-status-card"
            >
              <VoterStatusCard
                profile={profile}
                voterMatched={voterMatched}
                matchStatus={voterMatch.matched?.match_status ?? null}
              />
            </DashboardPanelFrame>
            <DashboardPanelFrame
              scrollId="workspace-summary"
              storageKey="dash-workspace-summary"
              labelCollapsed="Workspace snapshot"
              sectionGlyph="workspace-summary"
            >
              <StatusCard title="Workspace snapshot">
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
            </DashboardPanelFrame>
          </div>

          {branchSet && branchSpecialtyCards.length > 0 ? (
            <DashboardPanelFrame
              scrollId="branch-specialty"
              storageKey="dash-branch-specialty"
              labelCollapsed="Path tips"
              sectionGlyph="branch-specialty"
            >
              <VolunteerPathCardGrid
                headingId="branch-specialty-heading"
                heading="Your path"
                intro="Tailored to the branch you chose — use it with the playbook above."
                cards={branchSpecialtyCards}
              />
            </DashboardPanelFrame>
          ) : null}

          {voterMatch.matched ? (
            <DashboardPanelFrame
              scrollId="public-officials-card"
              storageKey="dash-public-officials"
              labelCollapsed="Public officials"
              sectionGlyph="public-officials-card"
            >
              <PublicOfficialsCard
                matchedVoter={voterMatch.matched}
                officialsState={officialsState}
                officialsLoading={officialsLoading}
                onOpenOfficial={setContactOfficial}
              />
            </DashboardPanelFrame>
          ) : null}

          <DashboardPanelFrame
            scrollId="power5-workspace"
            storageKey="dash-power5"
            labelCollapsed="Power of 5"
            sectionGlyph="power5-workspace"
          >
            <Power5SummaryCard
              loading={power5Workspace.loading}
              impact={power5Workspace.impact}
              nodes={power5Workspace.nodes}
              openRelays={power5Propagation.openRelayCount}
              onOpenWorkspace={() => navigate('/power5')}
            />
            <p className="subtitle" style={{ marginTop: 12, marginBottom: 0 }}>
              Full Power of 5 — relays, invites, and your list — lives on a{' '}
              <strong>dedicated page</strong> so it can use the full width.
            </p>
          </DashboardPanelFrame>

          <DashboardPanelFrame
              scrollId="voter-workspace"
              storageKey="dash-voter-workspace"
              labelCollapsed="Voter lookup"
              sectionGlyph="voter-workspace"
            >
              <section
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
            </DashboardPanelFrame>

          <ExceptionRequestCard
            profileId={profileId}
            status={profile?.exception_request_status}
            note={profile?.exception_request_note}
            voterMatched={voterMatched}
            onSubmitted={() => void refetch()}
          />

          <DashboardPanelFrame
            scrollId="workspace-cards"
            storageKey="dash-workspace-cards"
            labelCollapsed="Tasks & training"
            sectionGlyph="workspace-cards"
          >
            <section
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
              First task and training follow your roster state. Team and growth
              cards are placeholders for now.
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
          </DashboardPanelFrame>

          <div id="agent-jones" className="agent-jones-anchor" aria-hidden="true" />
        </DashboardGrid>
        <OfficialContactModal
          official={contactOfficial}
          onClose={() => setContactOfficial(null)}
        />
      </main>
      <AppFooter />
    </>
  )
}
