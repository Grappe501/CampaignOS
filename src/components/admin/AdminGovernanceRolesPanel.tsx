import { Link } from 'react-router-dom'
import type { CampaignProfile } from '../../hooks/useProfile'
import {
  canAccessAdminDesk,
  isAdminRoleHome,
} from '../../lib/adminDeskAccess'
import { isCampaignLeadershipRole } from '../../lib/kpiEngine'

function display(v: string | null | undefined): string {
  const t = String(v ?? '').trim()
  return t || '—'
}

export default function AdminGovernanceRolesPanel({
  profile,
  profileId,
}: {
  profile: CampaignProfile | null
  profileId: string | undefined
}) {
  const role = profile?.primary_role != null ? String(profile.primary_role) : null
  const adminRouteAccess = canAccessAdminDesk(role)
  const leadershipUi = isCampaignLeadershipRole(role)
  const adminHome = isAdminRoleHome(role)

  return (
    <div className="admin-governance-grid">
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Access &amp; route policy (client)</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          This page is gated to <strong>admin</strong> and <strong>staff</strong> roles (plus dev
          bypass). Changing someone else’s <code>primary_role</code> requires backend workflows —
          there is no bulk editor here yet.
        </p>
        <ul className="admin-desk-list">
          <li>
            <strong>/admin</strong> access for this role:{' '}
            <strong>{adminRouteAccess ? 'Yes' : 'No'}</strong>
          </li>
          <li>
            Role home is command center (admin only):{' '}
            <strong>{adminHome ? 'Yes' : 'No'}</strong> — staff use other desks as home while
            retaining admin visibility when allowed.
          </li>
          <li>
            Leadership KPI / mission tooling (product slice):{' '}
            <strong>{leadershipUi ? 'In leadership bucket' : 'Standard volunteer-style slice'}</strong>
          </li>
        </ul>
        <p className="admin-desk-panel-note">
          Policy reference: <code>docs/campaign-permissions-and-access-model.md</code>
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">This profile (RLS read)</h3>
        {profileId ? (
          <dl className="admin-governance-dl">
            <dt>Profile ID</dt>
            <dd>
              <code className="admin-governance-mono">{profileId}</code>
            </dd>
            <dt>primary_role</dt>
            <dd>{display(role)}</dd>
            <dt>primary_team</dt>
            <dd>{display(profile?.primary_team)}</dd>
            <dt>active_space</dt>
            <dd>{display(profile?.active_space)}</dd>
            <dt>onboarding_status</dt>
            <dd>{display(profile?.onboarding_status)}</dd>
            <dt>onboarding_branch</dt>
            <dd>{display(profile?.onboarding_branch)}</dd>
            <dt>power5_home_team_id</dt>
            <dd>
              {profile?.power5_home_team_id != null &&
              String(profile.power5_home_team_id).trim() !== ''
                ? String(profile.power5_home_team_id)
                : '—'}
            </dd>
          </dl>
        ) : (
          <p className="subtitle">No campaign profile ID in session.</p>
        )}
        <p className="admin-desk-panel-note">
          <Link to="/dashboard">Open volunteer workspace</Link> for self-service profile and roster
          flows visible under current RLS.
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested admin-governance-roadmap">
        <h3 className="admin-desk-panel-title">Roadmap (not implemented here)</h3>
        <ul className="admin-desk-list">
          <li>Directory search and filtered views across <code>campaign_profiles</code></li>
          <li>Role assignment / approval queues with audit trail</li>
          <li>Effective permission preview (“view as”) when policy engine exposes it</li>
        </ul>
        <p className="admin-desk-empty-hint">
          All of the above stay server-first; this panel will gain controls only when safe RPCs and
          RLS patterns land.
        </p>
      </div>
    </div>
  )
}
