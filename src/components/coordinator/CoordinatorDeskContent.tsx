import { Link } from 'react-router-dom'
import CampaignKpisCard from '../dashboard/CampaignKpisCard'
import LeadershipKpiScaffold from '../dashboard/LeadershipKpiScaffold'
import { useCampaignKpis } from '../../hooks/useCampaignKpis'
import { useCoordinatorDesk } from '../../hooks/useCoordinatorDesk'
import type { CampaignProfile } from '../../hooks/useProfile'
import { countJsonArray, shortProfileId } from '../../lib/coordinatorDeskData'
import CoordinatorMissionBoard from './CoordinatorMissionBoard'

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

  const io = desk.internParsed
  const emerging = countJsonArray(desk.activation?.emerging_leaders)
  const lowEng = countJsonArray(desk.activation?.low_engagement)

  const attentionParts: string[] = []
  if (desk.error) attentionParts.push(desk.error)
  if ((io?.overdueFirstContact ?? 0) > 0) {
    attentionParts.push(
      `${io?.overdueFirstContact} first-contact pipeline overdue on this team`,
    )
  }
  if ((io?.pipelinesEscalated ?? 0) > 0) {
    attentionParts.push(`${io?.pipelinesEscalated} escalated pipeline rows`)
  }
  if (desk.blockedAssignments.length > 0) {
    attentionParts.push(`${desk.blockedAssignments.length} blocked mission assignments`)
  }
  if (!desk.hasSupervisorScope && !desk.loading) {
    attentionParts.push(
      'No volunteer_supervisor_teams linkage on your profile — mission board stays empty until HQ assigns supervisor scope.',
    )
  }

  const loadingShell = profileLoading || (desk.loading && !desk.assignments.length && !desk.error)

  return (
    <div className="coordinator-desk">
      <header className="coordinator-desk-header">
        <p className="subtitle coordinator-desk-eyebrow" style={{ margin: 0 }}>
          Volunteer coordinator
        </p>
        <h1 className="page-title coordinator-desk-title">Coordination workspace</h1>
        <p className="subtitle coordinator-desk-intro">
          Supervise team missions, scan intern pipeline health on your Power of 5 team, and
          watch activation signals — without leaving campaign tooling. Data respects your
          supervisor membership and team scope in Postgres (RLS + SECURITY DEFINER RPCs).
        </p>
      </header>

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
            No automated red flags in this snapshot — still review missions and pipeline
            counts below on your rhythm.
          </p>
        )}
        <ul className="subtitle coordinator-playbook" style={{ margin: '12px 0 0' }}>
          <li>
            Clear <strong>blocked</strong> missions when volunteers are unblocked, or
            document why they stay blocked.
          </li>
          <li>
            Use <strong>nudge</strong> for gentle reminders; pair with a real message in your
            channel where possible.
          </li>
          <li>
            Pipeline <strong>escalations</strong> often mean intern capacity or edge cases —
            triage with HQ.
          </li>
        </ul>
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-ex-title">
        <h2 id="coord-ex-title" className="coordinator-section-title">
          Roster exceptions
        </h2>
        <p className="subtitle coordinator-section-lede">
          Volunteers submit roster exceptions from their dashboard; statuses live on{' '}
          <code>campaign_profiles.exception_request_*</code>. Under current RLS, profiles
          are readable only by their owner, so an <strong>org-wide pending queue is not
          available in this UI</strong>.
        </p>
        <p className="subtitle" style={{ marginTop: 8 }}>
          <strong>Operational path today:</strong> review pending and approved exceptions in
          your authorized Supabase / ops workflow, or add a dedicated coordinator RPC when
          product prioritizes it. Until then, watch for related notes in mission outcomes and
          intern escalations.
        </p>
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-pipe-title">
        <h2 id="coord-pipe-title" className="coordinator-section-title">
          Intern pipeline & team snapshot
        </h2>
        <p className="subtitle coordinator-section-lede">
          Aggregates from <code>supervisor_intern_overview</code> for your primary team (
          home team ID if set, otherwise first supervised team). Requires membership on that
          team or matching <code>power5_home_team_id</code>.
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
        ) : (
          <p className="subtitle" role="note">
            Overview did not return data — you may lack team authorization for this RPC, or
            the team has no intern activity yet.
          </p>
        )}
      </section>

      <section className="card stack-section coordinator-card" aria-labelledby="coord-act-title">
        <h2 id="coord-act-title" className="coordinator-section-title">
          Activation signals
        </h2>
        <p className="subtitle coordinator-section-lede">
          Summary counts from <code>supervisor_activation_insights</code> (same team scope as
          pipeline). Profile lists are capped in the database — use for prioritization, not
          exhaustive roster review.
        </p>
        {!desk.primaryTeamIdUsed ? (
          <p className="subtitle">Set team scope (see above) to load signals.</p>
        ) : !desk.activation && desk.loading ? (
          <p className="subtitle" role="status">
            Loading activation snapshot…
          </p>
        ) : desk.activation ? (
          <ul className="coordinator-signal-list subtitle">
            <li>
              <strong>Emerging leaders</strong> (heuristic): {emerging}
            </li>
            <li>
              <strong>Low weekly engagement</strong> (under-threshold slice): {lowEng}
            </li>
          </ul>
        ) : (
          <p className="subtitle" role="note">
            No activation payload — check team authorization or whether lane scores have
            synced.
          </p>
        )}
      </section>

      <CoordinatorMissionBoard
        rows={desk.assignments}
        loading={desk.loading}
        onChanged={async () => {
          await desk.refresh()
        }}
      />

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
            KPI target editing and mission scaffolding are limited to coordinator / staff /
            admin roles. Your current role:{' '}
            <strong>{primaryRole?.trim() || '—'}</strong>.
          </p>
        </section>
      )}

      <footer className="coordinator-desk-footer">
        <p className="subtitle" style={{ margin: 0 }}>
          Volunteer workspace: <Link to="/dashboard">Open dashboard</Link>
        </p>
        <button type="button" className="btn-touch" style={{ marginTop: 10 }} onClick={() => void desk.refresh()}>
          Refresh coordination data
        </button>
      </footer>
    </div>
  )
}
