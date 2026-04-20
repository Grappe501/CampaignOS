import { Link } from 'react-router-dom'
import CampaignKpisCard from '../dashboard/CampaignKpisCard'
import LeadershipKpiScaffold from '../dashboard/LeadershipKpiScaffold'
import { useCampaignKpis } from '../../hooks/useCampaignKpis'
import { useCoordinatorDesk } from '../../hooks/useCoordinatorDesk'
import type { CampaignProfile } from '../../hooks/useProfile'
import { normalizeKey } from '../../lib/dashboardState'
import { canAccessEventCoordinatorDesk } from '../../lib/eventCoordinatorDeskAccess'
import { countJsonArray, shortProfileId } from '../../lib/coordinatorDeskData'
import CoordinatorOperationsBoard from './CoordinatorOperationsBoard'
import CoordinatorMissionDispatch from './CoordinatorMissionDispatch'
import { useCalendarWidgetPack } from '../../hooks/useCalendarWidgetPack'
import { mapProfileRoleToCalendarWidgetPersona } from '../../lib/calendarWidgetData'
import UpcomingCampaignStrip from '../calendar-widgets/UpcomingCampaignStrip'
import CalendarSnapshotCard from '../calendar-widgets/CalendarSnapshotCard'
import EventPressureSummaryCard from '../calendar-widgets/EventPressureSummaryCard'

export default function CoordinatorDeskContent({
  profile,
  profileLoading,
  onRefreshProfile,
}: {
  profile: CampaignProfile | null
  profileLoading: boolean
  onRefreshProfile: () => void | Promise<void>
}) {
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const primaryRole =
    profile?.primary_role != null ? String(profile.primary_role) : null
  const homeTeam =
    profile?.power5_home_team_id != null
      ? String(profile.power5_home_team_id)
      : undefined

  const desk = useCoordinatorDesk(homeTeam)
  const kpis = useCampaignKpis(profileId, primaryRole)
  const calendarPersona = mapProfileRoleToCalendarWidgetPersona(primaryRole)
  const calendarPack = useCalendarWidgetPack(calendarPersona)
  const io = desk.internParsed
  const b = desk.assignmentBuckets
  const emerging = countJsonArray(desk.activation?.emerging_leaders)
  const lowEng = countJsonArray(desk.activation?.low_engagement)

  const exSelf = normalizeKey(profile?.exception_request_status) || 'none'

  const attentionParts: string[] = []
  if (desk.error) attentionParts.push(desk.error)
  if ((io?.overdueFirstContact ?? 0) > 0) {
    attentionParts.push(
      `${io?.overdueFirstContact} first-contact pipeline rows overdue on this team`,
    )
  }
  if ((io?.pipelinesEscalated ?? 0) > 0) {
    attentionParts.push(`${io?.pipelinesEscalated} escalated pipeline rows need triage`)
  }
  if (b.blocked.length > 0) {
    attentionParts.push(`${b.blocked.length} blocked mission assignment(s)`)
  }
  if (b.overdue.length > 0) {
    attentionParts.push(`${b.overdue.length} overdue mission assignment(s)`)
  }
  if (!desk.hasSupervisorScope && !desk.loading) {
    attentionParts.push(
      'No volunteer_supervisor_teams linkage on your profile — mission operations stay empty until HQ assigns supervisor scope.',
    )
  }

  const pipelineNextSteps: string[] = []
  if (io && desk.primaryTeamIdUsed) {
    if ((io.pipelinesEscalated ?? 0) > 0) {
      pipelineNextSteps.push(
        `Triage ${io.pipelinesEscalated} escalated pipeline row(s) with interns — consider coordinator mission "intern_pipeline_escalated_coordinator" if it appears on your board.`,
      )
    }
    if ((io.overdueFirstContact ?? 0) > 0) {
      pipelineNextSteps.push(
        `Pair with interns on ${io.overdueFirstContact} overdue first-contact commitment(s) — align on capacity or reassign in the intern desk tools.`,
      )
    }
    if (
      (io.pipelinesActive ?? 0) > 0 &&
      (io.pipelinesEscalated ?? 0) === 0 &&
      (io.overdueFirstContact ?? 0) === 0
    ) {
      pipelineNextSteps.push(
        `${io.pipelinesActive} active pipeline row(s) — spot-check intern coverage before counts slip.`,
      )
    }
  }
  if (pipelineNextSteps.length === 0 && io && desk.primaryTeamIdUsed) {
    pipelineNextSteps.push(
      'No escalations or overdue first contacts in this snapshot — keep a light weekly rhythm with interns.',
    )
  }

  const loadingShell =
    profileLoading || (desk.loading && !desk.assignments.length && !desk.error)

  const openMissionTotal =
    b.blocked.length + b.overdue.length + b.inProgress.length + b.assigned.length

  return (
    <div className="coordinator-desk">
      <header className="coordinator-desk-header">
        <p className="subtitle coordinator-desk-eyebrow" style={{ margin: 0 }}>
          Volunteer coordinator
        </p>
        <h1 className="page-title coordinator-desk-title">Oversight console</h1>
        <p className="subtitle coordinator-desk-intro">
          Exceptions, mission lanes, intern pipeline signals, and dispatch — scoped by supervisor
          membership and team RPCs (RLS + SECURITY DEFINER). No service-role shortcuts.
        </p>
        {canAccessEventCoordinatorDesk(primaryRole) ? (
          <p className="subtitle coordinator-desk-crosslink" style={{ margin: '10px 0 0' }}>
            <Link to="/events">Event coordinator desk</Link>
            {' — '}campaign events intake, approvals, calendar, and staffing (operational shell).
          </p>
        ) : null}
      </header>

      <div className="coordinator-calendar-widgets">
        <div className="card stack-section">
          <UpcomingCampaignStrip
            items={calendarPack.strip}
            heading="Field calendar — next up"
          />
        </div>
        <div className="admin-calendar-widget-grid admin-calendar-widget-grid--pair">
          <EventPressureSummaryCard
            pressure={calendarPack.pressure}
            title="Execution pressure (events)"
          />
          <CalendarSnapshotCard days={calendarPack.snapshotDays} />
        </div>
      </div>

      <section
        className="coordinator-ops-overview card stack-section"
        aria-label="Operations snapshot"
      >
        <h2 className="coordinator-section-title">Live snapshot</h2>
        {loadingShell ? (
          <p className="subtitle" role="status">
            Loading counts…
          </p>
        ) : (
          <ul className="coordinator-ops-chips">
            <li>
              <span className="coordinator-ops-chip coordinator-ops-chip--blocked">
                Blocked missions <strong>{b.blocked.length}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip coordinator-ops-chip--overdue">
                Overdue missions <strong>{b.overdue.length}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip">
                In progress <strong>{b.inProgress.length}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip">
                Assigned (not started) <strong>{b.assigned.length}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip">
                Open missions total <strong>{openMissionTotal}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip">
                Pipeline overdue first contact <strong>{io?.overdueFirstContact ?? 0}</strong>
              </span>
            </li>
            <li>
              <span className="coordinator-ops-chip">
                Pipeline escalated <strong>{io?.pipelinesEscalated ?? 0}</strong>
              </span>
            </li>
          </ul>
        )}
      </section>

      <section
        className={`coordinator-attention card stack-section${attentionParts.length ? ' coordinator-attention--warn' : ''}`}
        aria-label="What needs attention"
      >
        <h2 className="coordinator-section-title">What needs attention</h2>
        {loadingShell ? (
          <p className="subtitle" role="status">
            Loading coordinator context…
          </p>
        ) : attentionParts.length ? (
          <ul className="coordinator-attention-list">
            {attentionParts.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="subtitle" style={{ margin: 0 }}>
            No automated red flags in this snapshot — still run the lanes and pipeline checklist
            on your rhythm.
          </p>
        )}
        <ul className="subtitle coordinator-playbook" style={{ margin: '12px 0 0' }}>
          <li>
            <strong>Blocked</strong> missions need a decision: unblock, reassign, or document the
            hold.
          </li>
          <li>
            <strong>Overdue</strong> missions are past due — nudge or reassign before volunteers
            churn.
          </li>
          <li>
            <strong>Pipeline escalations</strong> usually need intern capacity or HQ alignment.
          </li>
        </ul>
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-ex-title">
        <h2 id="coord-ex-title" className="coordinator-section-title">
          Roster exceptions
        </h2>
        <p className="subtitle coordinator-section-lede">
          Volunteers submit exceptions from their dashboard; fields live on{' '}
          <code>campaign_profiles.exception_request_*</code>. Under current RLS, each profile is
          readable by its owner — an <strong>org-wide pending queue is not exposed in this app</strong>.
        </p>
        <div className="coordinator-exception-panels">
          <div className="coordinator-exception-panel card card--inner stack-section">
            <h3 className="coordinator-subhead">Your profile (read-only)</h3>
            <dl className="coordinator-dl coordinator-dl--compact">
              <div>
                <dt>Your exception status</dt>
                <dd>{exSelf}</dd>
              </div>
              {profile?.exception_requested_at ? (
                <div>
                  <dt>Last requested</dt>
                  <dd>{new Date(String(profile.exception_requested_at)).toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
            {exSelf === 'pending' ? (
              <p className="subtitle" style={{ margin: '10px 0 0' }}>
                Your own request is pending — use your ops channel if you need it cleared for
                testing.
              </p>
            ) : null}
          </div>
          <div className="coordinator-exception-panel card card--inner stack-section">
            <h3 className="coordinator-subhead">Org queue (not in client)</h3>
            <p className="subtitle" style={{ margin: 0 }}>
              Review pending volunteers in Supabase SQL, a secured admin surface, or a future{' '}
              <code>coordinator_exception_inbox</code> RPC when product adds coordinator-safe
              reads.
            </p>
          </div>
        </div>
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-pipe-title">
        <h2 id="coord-pipe-title" className="coordinator-section-title">
          Intern pipeline & team snapshot
        </h2>
        <p className="subtitle coordinator-section-lede">
          Aggregates from <code>supervisor_intern_overview</code> for your primary team (home team
          ID if set, otherwise first supervised team). Requires team membership or matching{' '}
          <code>power5_home_team_id</code>.
        </p>
        {!desk.primaryTeamIdUsed ? (
          <div className="coordinator-empty">
            <p className="subtitle" style={{ margin: 0 }}>
              No Power of 5 team ID available to run the overview.
            </p>
            <p className="subtitle" style={{ margin: '8px 0 0' }}>
              Set <strong>power5_home_team_id</strong> on your coordinator profile or add a{' '}
              <strong>volunteer_supervisor_teams</strong> row linking you to a team.
            </p>
          </div>
        ) : desk.loading && !io ? (
          <p className="subtitle" role="status">
            Loading pipeline snapshot…
          </p>
        ) : io ? (
          <>
            <dl className="coordinator-dl">
              {desk.supervisedTeams.length > 0 ? (
                <div>
                  <dt>Teams you supervise</dt>
                  <dd>
                    {desk.supervisedTeams
                      .map((t) => shortProfileId(t.team_id))
                      .join(', ')}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Primary team (RPC scope)</dt>
                <dd className="coordinator-mono">{shortProfileId(desk.primaryTeamIdUsed)}</dd>
              </div>
              <div>
                <dt>Intern profiles (home team)</dt>
                <dd>{io.internProfileIds.length}</dd>
              </div>
              <div>
                <dt>Active pipeline rows</dt>
                <dd>{io.pipelinesActive}</dd>
              </div>
              <div>
                <dt>Escalated pipeline rows</dt>
                <dd>{io.pipelinesEscalated}</dd>
              </div>
              <div>
                <dt>Overdue first contact</dt>
                <dd>{io.overdueFirstContact}</dd>
              </div>
            </dl>
            <div className="coordinator-next-steps card card--inner stack-section">
              <h3 className="coordinator-subhead">Operational next steps</h3>
              {pipelineNextSteps.length ? (
                <ol className="coordinator-next-steps-list subtitle">
                  {pipelineNextSteps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p className="subtitle" style={{ margin: 0 }}>
                  Set team scope to load pipeline-driven actions.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="subtitle" role="note">
            Overview did not return data — you may lack team authorization for this RPC, or the
            team has no intern activity yet.
          </p>
        )}
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-act-title">
        <h2 id="coord-act-title" className="coordinator-section-title">
          Activation signals
        </h2>
        <p className="subtitle coordinator-section-lede">
          Summary counts from <code>supervisor_activation_insights</code> (same team scope as
          pipeline). Profile lists are capped server-side.
        </p>
        {!desk.primaryTeamIdUsed ? (
          <p className="subtitle">Set team scope (see above) to load signals.</p>
        ) : !desk.activation && desk.loading ? (
          <p className="subtitle" role="status">
            Loading activation snapshot…
          </p>
        ) : desk.activation ? (
          <>
            <ul className="coordinator-signal-list subtitle">
              <li>
                <strong>Emerging leaders</strong> (heuristic): {emerging}
              </li>
              <li>
                <strong>Low weekly engagement</strong> (under-threshold slice): {lowEng}
              </li>
            </ul>
            {emerging === 0 && lowEng === 0 ? (
              <p className="subtitle coordinator-empty-note" style={{ marginTop: 10 }}>
                No one flagged in these slices — still check missions for quiet volunteers.
              </p>
            ) : null}
          </>
        ) : (
          <p className="subtitle" role="note">
            No activation payload — check team authorization or whether lane scores have synced.
          </p>
        )}
      </section>

      <div id="coordinator-mission-ops" aria-hidden="true" />
      <CoordinatorOperationsBoard
        buckets={b}
        recentCompletions={desk.recentCompletions}
        loading={desk.loading}
        hasSupervisorScope={desk.hasSupervisorScope}
        onChanged={async () => {
          await desk.refresh()
        }}
      />

      {desk.hasSupervisorScope ? (
        <CoordinatorMissionDispatch
          onDispatched={async () => {
            await desk.refresh()
          }}
        />
      ) : (
        <section className="card stack-section coordinator-card" aria-labelledby="coord-dispatch-locked">
          <h2 id="coord-dispatch-locked" className="coordinator-section-title">
            Dispatch mission
          </h2>
          <p className="subtitle" style={{ margin: 0 }}>
            Available once you have <strong>volunteer_supervisor_teams</strong> scope — then you can
            enqueue missions for volunteers on those teams.
          </p>
        </section>
      )}

      <div id="campaign-kpis" aria-hidden="true" />
      <CampaignKpisCard
        kpis={kpis.kpis}
        contributions={kpis.contributions}
        loading={kpis.loading}
        error={kpis.error}
        heading="Campaign goals"
        intro="Org-visible KPI window (same read model as the volunteer dashboard). Your personal contribution lines reflect your profile, not your whole team."
      />
      {kpis.isLeadership ? (
        <LeadershipKpiScaffold
          key={kpis.kpis.map((k) => `${k.id}:${k.target_value}`).join('|')}
          kpis={kpis.kpis}
          missions={kpis.missions}
          onUpdated={async () => {
            await kpis.refetch()
            await onRefreshProfile()
          }}
        />
      ) : (
        <section className="card stack-section coordinator-card">
          <h2 className="coordinator-section-title">Mission definitions (leadership)</h2>
          <p className="subtitle">
            KPI target editing and mission scaffolding are limited to coordinator / staff / admin
            roles. Your current role: <strong>{primaryRole?.trim() || '—'}</strong>.
          </p>
        </section>
      )}

      <footer className="coordinator-desk-footer">
        <p className="subtitle" style={{ margin: 0 }}>
          Volunteer workspace: <Link to="/dashboard">Open dashboard</Link> ·{' '}
          <Link to="/intern">Team desk</Link> · <Link to="/power5">Power of 5</Link>
        </p>
        <button
          type="button"
          className="btn-touch"
          style={{ marginTop: 10 }}
          onClick={() => void desk.refresh()}
        >
          Refresh coordination data
        </button>
      </footer>
    </div>
  )
}
