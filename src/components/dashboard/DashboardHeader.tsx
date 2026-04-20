import type { CampaignProfile } from '../../hooks/useProfile'

function display(val: unknown, fallback: string) {
  const s = val != null ? String(val).trim() : ''
  return s || fallback
}

export default function DashboardHeader({
  profile,
  email,
}: {
  profile: CampaignProfile | null
  email?: string | null
}) {
  return (
    <header className="card stack-section dash-identity" aria-labelledby="dash-identity-title">
      <div>
        <p
          className="subtitle"
          style={{
            margin: 0,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.72rem',
            color: 'var(--text)',
          }}
        >
          Your workspace
        </p>
        <h1 id="dash-identity-title" className="page-title" style={{ margin: '6px 0 0' }}>
          Campaign dashboard
        </h1>
        {email ? (
          <p className="subtitle" style={{ margin: '6px 0 0', wordBreak: 'break-all' }}>
            {email}
          </p>
        ) : null}
      </div>
      <dl className="summary-grid dash-identity-strip">
        <dt>Role</dt>
        <dd>{display(profile?.primary_role, 'Volunteer')}</dd>
        <dt>Team</dt>
        <dd>{display(profile?.primary_team, 'Unassigned')}</dd>
        <dt>Active space</dt>
        <dd>{display(profile?.active_space, '—')}</dd>
        <dt>Onboarding</dt>
        <dd>{display(profile?.onboarding_status, '—')}</dd>
      </dl>
    </header>
  )
}
