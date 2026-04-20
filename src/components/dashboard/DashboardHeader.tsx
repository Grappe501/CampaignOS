import type { CampaignProfile } from '../../hooks/useProfile'
import type { MatchedVoterDisplayRow } from '../../lib/voterMatch'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../../brand/chrisJonesForCongress'

function display(val: unknown, fallback: string) {
  const s = val != null ? String(val).trim() : ''
  return s || fallback
}

export default function DashboardHeader({
  profile,
  email,
  matchedVoter,
}: {
  profile: CampaignProfile | null
  email?: string | null
  matchedVoter?: MatchedVoterDisplayRow | null
}) {
  const fullName = matchedVoter
    ? `${matchedVoter.name_first} ${matchedVoter.name_last}`.trim()
    : ''
  const showName = Boolean(fullName)
  const stateZip = matchedVoter
    ? [matchedVoter.res_state, matchedVoter.res_zip5].filter(Boolean).join(' ')
    : ''
  const locality = matchedVoter
    ? [matchedVoter.res_city, stateZip].filter(Boolean).join(', ')
    : ''

  return (
    <header
      className="card card--brand stack-section dash-identity"
      aria-labelledby="dash-identity-title"
    >
      <div className="dash-identity-top">
        <div className="dash-brand-mark">
          <img
            src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.candidateHeadshotUrl}
            alt=""
            className="dash-candidate-headshot"
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
          />
          <img
            src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.logoPrimaryUrl}
            alt=""
            className="dash-campaign-logo"
            width={220}
            height={52}
            loading="eager"
            decoding="async"
          />
        </div>
        <p
          className="subtitle"
          style={{
            margin: 0,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.72rem',
            color: 'var(--cj-primary)',
          }}
        >
          Chris Jones for Congress · {CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan}
        </p>
        <h1 id="dash-identity-title" className="page-title" style={{ margin: '6px 0 0' }}>
          {showName ? fullName : 'Campaign dashboard'}
        </h1>
        {showName ? (
          <p className="subtitle" style={{ margin: '6px 0 0' }}>
            Matched voter · {display(locality, '—')}
          </p>
        ) : null}
        {email ? (
          <p className="subtitle" style={{ margin: '6px 0 0', wordBreak: 'break-all' }}>
            {email}
          </p>
        ) : null}
      </div>

      {matchedVoter ? (
        <dl className="summary-grid dash-identity-strip">
          <dt>Address</dt>
          <dd>
            {display(matchedVoter.res_city, '—')}
            {matchedVoter.res_state ? `, ${matchedVoter.res_state}` : ''}
            {matchedVoter.res_zip5 ? ` ${matchedVoter.res_zip5}` : ''}
          </dd>
          <dt>Precinct</dt>
          <dd>{display(matchedVoter.precinct_name, '—')}</dd>
          <dt>County</dt>
          <dd>{display(matchedVoter.county, '—')}</dd>
          <dt>Congressional</dt>
          <dd>{display(matchedVoter.congressional_district, '—')}</dd>
          <dt>State Senate</dt>
          <dd>{display(matchedVoter.state_senate_district, '—')}</dd>
          <dt>State House</dt>
          <dd>{display(matchedVoter.state_representative_district, '—')}</dd>
        </dl>
      ) : (
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
      )}

      {!matchedVoter ? null : (
        <p className="subtitle" style={{ margin: 0 }}>
          Workspace details stay below. Voter history is intentionally not shown
          here.
        </p>
      )}
    </header>
  )
}
