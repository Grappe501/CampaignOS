import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { useCampaignKpis } from '../../hooks/useCampaignKpis'
import { useVolunteerTasks } from '../../hooks/useVolunteerTasks'
import { useDailyMission } from '../../hooks/useDailyMission'
import { useVoterMatch } from '../../hooks/useVoterMatch'
import { usePower5Workspace } from '../../hooks/usePower5Workspace'
import { usePower5Propagation } from '../../hooks/usePower5Propagation'
import { useInternLayer } from '../../hooks/useInternLayer'
import { useCoordinatorDesk } from '../../hooks/useCoordinatorDesk'
import {
  CAMPAIGN_ELECTION_CLOCK,
  formatCountdownDisplay,
  getCountdownParts,
} from '../../lib/campaignClock'
import AdminDeskHealthRollup, {
  type AdminDeskHealthRow,
} from './AdminDeskHealthRollup'
import AdminTaskCommandCenter from './AdminTaskCommandCenter'
import AdminEventGovernance from './AdminEventGovernance'
import AdminGeographyReadiness from './AdminGeographyReadiness'
import AdminQuickActionsBar from './AdminQuickActionsBar'
import AdminGovernanceRolesPanel from './AdminGovernanceRolesPanel'
import AdminExceptionsIntervention from './AdminExceptionsIntervention'
import AdminAuditSystemPanel from './AdminAuditSystemPanel'
import AdminConfigurationIntegrations from './AdminConfigurationIntegrations'
import { useAdminAuthSnapshot } from '../../hooks/useAdminAuthSnapshot'

function useNowMs(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function AdminSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="admin-desk-section stack-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="admin-desk-section-title">
        {title}
      </h2>
      {children}
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-desk-chip">
      <span className="admin-desk-chip__value">{value}</span>
      <span className="admin-desk-chip__label">{label}</span>
    </div>
  )
}

export default function AdminDeskContent({
  onProfileRefresh,
}: {
  onProfileRefresh?: () => void | Promise<void>
}) {
  const { profile, loading: profileLoading, refetch } = useProfile()
  const pid = profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const role = profile?.primary_role != null ? String(profile.primary_role) : null
  const nowMs = useNowMs()
  const countdown = useMemo(() => getCountdownParts(nowMs), [nowMs])
  const countdownLabel = formatCountdownDisplay(countdown)

  const kpis = useCampaignKpis(pid, role)
  const tasks = useVolunteerTasks(pid)
  const daily = useDailyMission(pid)
  const voterMatch = useVoterMatch(pid, { onAfterMatch: () => void refetch() })
  const power5 = usePower5Workspace(pid)
  const power5Propagation = usePower5Propagation(pid)
  const internDesk = useInternLayer(pid, role)
  const coordDesk = useCoordinatorDesk(profile?.power5_home_team_id)
  const authSnap = useAdminAuthSnapshot()

  const voterMatched =
    Boolean(voterMatch.matched) ||
    Boolean(
      profile?.linked_voter_id != null && String(profile.linked_voter_id).trim() !== '',
    )

  const deskHealthRows = useMemo((): AdminDeskHealthRow[] => {
    const volAttention = Boolean(tasks.error) || tasks.stalled.length > 0
    const volHealthy =
      !tasks.loading && !tasks.error && tasks.stalled.length === 0 && tasks.active.length >= 0

    let internState: AdminDeskHealthRow['state'] = 'operational'
    let internPulse =
      'Desk shipped at /intern. Sign in as an intern to load pipeline counts for this session.'
    if (internDesk.isIntern) {
      if (internDesk.error) internState = 'attention'
      else if (internDesk.overdueCount > 0) internState = 'attention'
      else if (internDesk.pipelines.length > 0) internState = 'healthy'
      internPulse = internDesk.loading
        ? 'Loading intern pipelines…'
        : `${internDesk.pipelines.length} open pipeline row(s); ${internDesk.overdueCount} overdue first-contact (this session).`
    }

    let coordState: AdminDeskHealthRow['state'] = 'operational'
    let coordPulse =
      'No supervisor scope on this login — open /coordinator with a coordinated account to see mission lanes.'
    if (coordDesk.hasSupervisorScope) {
      const b = coordDesk.assignmentBuckets
      const hot = b.blocked.length + b.overdue.length
      coordState = hot > 0 ? 'attention' : 'healthy'
      coordPulse = coordDesk.loading
        ? 'Loading supervisor assignments…'
        : `Teams supervised: ${coordDesk.supervisedTeams.length}. Blocked ${b.blocked.length}, overdue ${b.overdue.length}, in flight ${b.inProgress.length + b.assigned.length}.`
    }
    if (coordDesk.error) {
      coordState = 'attention'
      coordPulse = coordDesk.error
    }

    const p5State: AdminDeskHealthRow['state'] = power5.error ? 'attention' : 'healthy'
    const p5Pulse = power5.loading
      ? 'Loading Power of 5…'
      : power5.error
        ? power5.error
        : `${power5.nodes.length} node(s) · ${power5Propagation.openRelayCount} open manual relay(s) · impact: ${power5.impact.contacted} contacted (this account).`

    return [
      {
        id: 'volunteer',
        name: 'Volunteer workspace',
        path: '/dashboard',
        note: 'Primary field execution',
        state: volAttention ? 'attention' : volHealthy ? 'healthy' : 'operational',
        pulse: tasks.loading
          ? 'Loading assignments…'
          : tasks.error
            ? tasks.error
            : `${tasks.active.length} active assignment(s); ${tasks.stalled.length} blocked (RLS: this profile).`,
      },
      {
        id: 'intern',
        name: 'Team desk (intern)',
        path: '/intern',
        note: 'Pipeline + first contact',
        state: internState,
        pulse: internPulse,
      },
      {
        id: 'coordinator',
        name: 'Coordination',
        path: '/coordinator',
        note: 'Supervisor missions',
        state: coordState,
        pulse: coordPulse,
      },
      {
        id: 'candidate',
        name: 'Campaign desk',
        path: '/candidate',
        note: 'Leadership & KPI narrative',
        state: 'operational',
        pulse: 'Principal / leadership surface — operational route.',
      },
      {
        id: 'power5',
        name: 'Power of 5',
        path: '/power5',
        note: 'Relational organizing',
        state: p5State,
        pulse: p5Pulse,
      },
      {
        id: 'admin',
        name: 'Command center',
        path: '/admin',
        note: 'System oversight',
        state: 'operational',
        pulse: 'You are on the admin command surface.',
      },
    ]
  }, [
    tasks.loading,
    tasks.error,
    tasks.active.length,
    tasks.stalled.length,
    internDesk.isIntern,
    internDesk.loading,
    internDesk.error,
    internDesk.pipelines.length,
    internDesk.overdueCount,
    coordDesk.hasSupervisorScope,
    coordDesk.loading,
    coordDesk.error,
    coordDesk.supervisedTeams.length,
    coordDesk.assignmentBuckets,
    power5.loading,
    power5.error,
    power5.nodes.length,
    power5.impact.contacted,
    power5Propagation.openRelayCount,
  ])

  const alerts = useMemo(() => {
    const items: {
      id: string
      severity: 'attention' | 'info'
      title: string
      detail: string
    }[] = []

    if (kpis.error) {
      items.push({
        id: 'kpi-error',
        severity: 'attention',
        title: 'Campaign goals data interrupted',
        detail: kpis.error,
      })
    }

    if (!kpis.loading && kpis.kpis.length === 0) {
      items.push({
        id: 'kpi-empty',
        severity: 'info',
        title: 'No active KPI window',
        detail:
          'There are no active rows in the current election calendar window for campaign_kpis, or reads failed silently. Confirm migrations and date windows.',
      })
    }

    if (tasks.error) {
      items.push({
        id: 'tasks-error',
        severity: 'attention',
        title: 'Volunteer task feed error',
        detail: tasks.error,
      })
    }

    if (tasks.stalled.length > 0) {
      items.push({
        id: 'tasks-stalled',
        severity: 'attention',
        title: 'Blocked volunteer assignments (this session)',
        detail: `${tasks.stalled.length} assignment(s) in blocked state under RLS for this login. Clear or escalate from the volunteer workspace.`,
      })
    }

    if (coordDesk.hasSupervisorScope && coordDesk.assignmentBuckets.blocked.length > 0) {
      items.push({
        id: 'coord-blocked',
        severity: 'attention',
        title: 'Supervisor scope: blocked missions',
        detail: `${coordDesk.assignmentBuckets.blocked.length} blocked assignment(s). Open Coordination to triage.`,
      })
    }

    if (daily.error) {
      items.push({
        id: 'daily-error',
        severity: 'attention',
        title: 'Daily activation engine error',
        detail: daily.error,
      })
    }

    const ex = profile?.exception_request_status
    if (ex === 'pending') {
      items.push({
        id: 'self-exception',
        severity: 'attention',
        title: 'Exception request pending (this account)',
        detail:
          'This profile has a pending roster exception. Org-wide exception queues require elevated reads — not yet exposed here.',
      })
    }

    if (items.length === 0) {
      items.push({
        id: 'all-clear',
        severity: 'info',
        title: 'No high-priority signals from connected feeds',
        detail:
          'Panels below reflect what this session can read under current RLS. Organization-wide rollups will appear as admin RPCs land.',
      })
    }

    return items
  }, [
    kpis.error,
    kpis.loading,
    kpis.kpis.length,
    tasks.error,
    tasks.stalled.length,
    coordDesk.hasSupervisorScope,
    coordDesk.assignmentBuckets.blocked.length,
    daily.error,
    profile?.exception_request_status,
  ])

  if (profileLoading && !profile) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        Loading…
      </div>
    )
  }

  const activeKpiCount = kpis.kpis.length
  const activeTaskCount = tasks.active.length
  const dailyDone = daily.completedCount
  const dailyTotal = daily.totalCount

  return (
    <div className="admin-desk-page">
      <header id="admin-overview" className="admin-desk-hero card stack-section">
        <p className="admin-desk-eyebrow">Command center</p>
        <h1 className="admin-desk-title">Admin command &amp; governance</h1>
        <p className="admin-desk-subtitle">
          Operations, desk health, and governance surfaces in one place. Live numbers respect RLS;
          role changes, org-wide queues, and integrations stay read-only or “next” until backend
          paths are explicit and safe.
        </p>
        <div className="admin-desk-chip-row" aria-label="Session summary">
          <StatChip label="Account role" value={role?.trim() || '—'} />
          <StatChip
            label="Active KPI rows"
            value={kpis.loading ? '…' : activeKpiCount}
          />
          <StatChip
            label="Open assignments (you)"
            value={tasks.loading ? '…' : activeTaskCount}
          />
          <StatChip
            label="Daily activation"
            value={
              daily.loading ? '…' : dailyTotal ? `${dailyDone}/${dailyTotal}` : '—'
            }
          />
          <StatChip label="Polls close" value={countdownLabel} />
        </div>
        <p className="admin-desk-meta" role="note">
          {CAMPAIGN_ELECTION_CLOCK.electionDayLabel} · {CAMPAIGN_ELECTION_CLOCK.pollsCloseDisplay}{' '}
          · {CAMPAIGN_ELECTION_CLOCK.timeZone.replace('_', ' ')}
        </p>
      </header>

      <AdminSection id="admin-alerts" title="Attention">
        <div className="admin-desk-alert-list">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`admin-desk-alert admin-desk-alert--${a.severity}`}
              role="status"
            >
              <p className="admin-desk-alert__title">{a.title}</p>
              <p className="admin-desk-alert__detail">{a.detail}</p>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection id="admin-health" title="Campaign health snapshot">
        <div className="admin-desk-split">
          <div className="admin-desk-panel">
            <h3 className="admin-desk-panel-title">Goals &amp; missions</h3>
            {kpis.loading ? (
              <p className="subtitle">Loading KPI context…</p>
            ) : (
              <ul className="admin-desk-list">
                <li>
                  <strong>{activeKpiCount}</strong> active KPI{activeKpiCount === 1 ? '' : 's'} in
                  window
                </li>
                <li>
                  <strong>{kpis.missions.length}</strong> mission scaffold row
                  {kpis.missions.length === 1 ? '' : 's'} visible with your role
                </li>
                <li>
                  Leadership tools:{' '}
                  <strong>{kpis.isLeadership ? 'enabled' : 'read-only slice'}</strong>
                </li>
              </ul>
            )}
          </div>
          <div className="admin-desk-panel">
            <h3 className="admin-desk-panel-title">Execution rhythm</h3>
            {daily.loading ? (
              <p className="subtitle">Loading activation…</p>
            ) : (
              <ul className="admin-desk-list">
                <li>
                  Today’s activation tasks completed:{' '}
                  <strong>
                    {dailyDone}/{Math.max(dailyTotal, 1)}
                  </strong>
                </li>
                <li>
                  Next up:{' '}
                  <strong>{daily.nextPending?.title ?? 'None queued'}</strong>
                </li>
              </ul>
            )}
            {tasks.loading ? (
              <p className="subtitle admin-desk-panel-note">Loading assignments…</p>
            ) : (
              <ul className="admin-desk-list">
                <li>
                  Volunteer assignments in flight (you):{' '}
                  <strong>{activeTaskCount}</strong>
                </li>
                <li>
                  Next best task:{' '}
                  <strong>{tasks.nextBest?.title ?? 'None'}</strong>
                </li>
              </ul>
            )}
          </div>
        </div>
      </AdminSection>

      <AdminSection id="admin-calendar" title="Coming up &amp; deadlines">
        <div className="admin-desk-calendar-rail card admin-desk-nested">
          <div className="admin-desk-calendar-primary">
            <h3 className="admin-desk-panel-title">Election milestone</h3>
            <p className="admin-desk-countdown">{countdownLabel}</p>
            <p className="subtitle">
              Universal campaign calendar and filing rails are specified in{' '}
              <code>docs/campaign-universal-tasks-and-calendar-architecture.md</code>. This block is
              structured for that integration — no synthetic events are shown.
            </p>
          </div>
          <div className="admin-desk-calendar-secondary">
            <h3 className="admin-desk-panel-title">Integration readiness</h3>
            <p className="subtitle">
              Event approval, staffing, and publish-state panels bind to the first-class events table
              when RLS and RPCs are ready. The event governance section below is the operational home
              for that work.
            </p>
          </div>
        </div>
      </AdminSection>

      <AdminSection id="admin-desks" title="Desk health rollup">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Status mixes <strong>shipped routes</strong> with{' '}
          <strong>session-visible signals</strong> (RLS). There are no invented org-wide user counts.
        </p>
        <AdminDeskHealthRollup rows={deskHealthRows} />
      </AdminSection>

      <AdminSection id="admin-tasks" title="Task command center">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Cross-system task governance aggregates blocked, overdue, and unowned queues. Below is what
          this login can already see; org-wide rollups still need admin RPCs.
        </p>
        <AdminTaskCommandCenter
          tasksLoading={tasks.loading}
          tasksError={tasks.error}
          activeAssignmentCount={tasks.active.length}
          stalledCount={tasks.stalled.length}
          nextBestTitle={tasks.nextBest?.title ?? null}
          recentDoneCount={tasks.recentDone.length}
          engagementReadiness={tasks.engagement?.engagement_readiness}
          dailyLoading={daily.loading}
          dailyError={daily.error}
          dailyCompleted={dailyDone}
          dailyTotal={dailyTotal}
          dailyNextTitle={daily.nextPending?.title ?? null}
          hasSupervisorScope={coordDesk.hasSupervisorScope}
          coordinatorBuckets={
            coordDesk.hasSupervisorScope ? coordDesk.assignmentBuckets : null
          }
          coordinatorDeskLoading={coordDesk.loading}
          coordinatorDeskError={coordDesk.error}
        />
      </AdminSection>

      <AdminSection id="admin-events" title="Event &amp; calendar governance">
        <AdminEventGovernance electionMilestoneLabel={countdownLabel} />
      </AdminSection>

      <AdminSection id="admin-geography" title="County &amp; precinct readiness">
        <AdminGeographyReadiness
          voterLoading={voterMatch.matchedLoading}
          hasMatch={Boolean(voterMatch.matched)}
          county={
            voterMatch.matched?.county != null ? String(voterMatch.matched.county) : null
          }
          precinct={
            voterMatch.matched?.precinct_name != null
              ? String(voterMatch.matched.precinct_name)
              : null
          }
          congressionalDistrict={
            voterMatch.matched?.congressional_district != null
              ? String(voterMatch.matched.congressional_district)
              : null
          }
          stateSenateDistrict={
            voterMatch.matched?.state_senate_district != null
              ? String(voterMatch.matched.state_senate_district)
              : null
          }
          stateHouseDistrict={
            voterMatch.matched?.state_representative_district != null
              ? String(voterMatch.matched.state_representative_district)
              : null
          }
        />
      </AdminSection>

      <AdminSection id="admin-users" title="Users, roles &amp; permissions">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Governance home for campaign access. Editing other accounts is out of scope until
          service-backed workflows exist; this surface documents policy and shows your own profile
          slice under RLS.
        </p>
        <AdminGovernanceRolesPanel profile={profile} profileId={pid} />
      </AdminSection>

      <AdminSection id="admin-exceptions" title="Exceptions &amp; intervention queue">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Roster and workflow exceptions already live on <code>campaign_profiles</code>. This queue
          frames status and handoffs — not an org-wide list until admin/coordinator RPCs publish
          aggregates.
        </p>
        <AdminExceptionsIntervention
          profileId={pid}
          exceptionStatus={profile?.exception_request_status}
          exceptionNote={profile?.exception_request_note}
          exceptionRequestedAt={profile?.exception_requested_at}
          voterMatched={voterMatched}
        />
      </AdminSection>

      <AdminSection id="admin-activity" title="Audit &amp; system visibility">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Read-first visibility into auth metadata and build context. Deeper audit feeds require
          server-held history — never implied by this UI alone.
        </p>
        <AdminAuditSystemPanel
          authLoading={authSnap.loading}
          userId={authSnap.user?.id}
          email={authSnap.user?.email}
          lastSignInAt={authSnap.user?.last_sign_in_at}
        />
      </AdminSection>

      <AdminSection id="admin-config" title="Configuration &amp; integration status">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Where environment, edge functions, and future calendar/comms integrations will be
          monitored. No toggles or secrets are exposed from the client.
        </p>
        <AdminConfigurationIntegrations />
      </AdminSection>

      <AdminSection id="admin-controls" title="Quick actions">
        <p className="subtitle" style={{ marginTop: 0 }}>
          Safe navigation and in-page anchors across this command center and primary desks.
        </p>
        <AdminQuickActionsBar />
        <div className="admin-desk-quick-grid" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="admin-desk-quick admin-desk-quick--ghost"
            onClick={() => void (onProfileRefresh?.() ?? refetch())}
          >
            Refresh profile &amp; feeds
          </button>
        </div>
      </AdminSection>
    </div>
  )
}
