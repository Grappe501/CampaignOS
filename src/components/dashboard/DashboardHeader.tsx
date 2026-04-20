import type { ReactNode } from 'react'
import type { CampaignProfile } from '../../hooks/useProfile'
import type { MatchedVoterDisplayRow } from '../../lib/voterMatch'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../../brand/chrisJonesForCongress'

function display(val: unknown, fallback: string) {
  const s = val != null ? String(val).trim() : ''
  return s || fallback
}

function MetaCol({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="dash-header-col">
      <h2 className="dash-header-col-title">{title}</h2>
      <div className="dash-header-col-body">{children}</div>
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-header-meta-line">
      <span className="dash-header-meta-k">{label}</span>
      <span className="dash-header-meta-v">{value}</span>
    </div>
  )
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

  const pathLabel = display(profile?.onboarding_branch, '—')
  const branchHuman =
    pathLabel === '—'
      ? '—'
      : pathLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <header
      className="card card--brand stack-section dash-identity dash-identity--tight"
      aria-labelledby="dash-identity-title"
    >
      <div className="dash-identity-banner">
        <div className="dash-brand-mark dash-brand-mark--header">
          <img
            src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.candidateHeadshotUrl}
            alt=""
            className="dash-candidate-headshot dash-candidate-headshot--tight"
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
          />
          <img
            src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.logoPrimaryUrl}
            alt=""
            className="dash-campaign-logo dash-campaign-logo--tight"
            width={200}
            height={40}
            loading="eager"
            decoding="async"
          />
          <div className="dash-identity-heading-cluster">
            <p className="dash-dashboard-kicker">Campaign Dashboard</p>
            <p className="dash-tagline-tight">
              Chris Jones for Congress · {CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan}
            </p>
          </div>
        </div>
      </div>

      <div className="dash-identity-name-row">
        <h1 id="dash-identity-title" className="dash-identity-h1">
          {showName ? fullName : 'Your workspace'}
        </h1>
        {email ? (
          <p className="dash-identity-email" title={email}>
            {email}
          </p>
        ) : null}
      </div>

      <div
        className="dash-header-3col"
        role="region"
        aria-label={matchedVoter ? 'Matched voter and workspace details' : 'Workspace details'}
      >
        <MetaCol title="Workspace">
          <MetaLine label="Role" value={display(profile?.primary_role, 'Volunteer')} />
          <MetaLine label="Team" value={display(profile?.primary_team, 'Unassigned')} />
          <MetaLine label="Space" value={display(profile?.active_space, '—')} />
          <MetaLine label="Onboarding" value={display(profile?.onboarding_status, '—')} />
          <MetaLine label="Path" value={branchHuman} />
        </MetaCol>

        <MetaCol title="Voter & civic">
          {matchedVoter ? (
            <>
              <MetaLine label="Voter ID" value={display(matchedVoter.voter_id, '—')} />
              <MetaLine label="Status" value={display(matchedVoter.registrant_status, '—')} />
              <MetaLine label="Precinct" value={display(matchedVoter.precinct_name, '—')} />
              <MetaLine
                label="City"
                value={display(matchedVoter.res_city, '—')}
              />
              <MetaLine label="County" value={display(matchedVoter.county, '—')} />
            </>
          ) : (
            <>
              <MetaLine label="Voter ID" value={display(profile?.linked_voter_id, '—')} />
              <MetaLine label="Precinct" value="—" />
              <MetaLine label="City" value="—" />
              <MetaLine label="County" value="—" />
            </>
          )}
        </MetaCol>

        <MetaCol title="Districts & match">
          {matchedVoter ? (
            <>
              <MetaLine
                label="Congressional"
                value={display(matchedVoter.congressional_district, '—')}
              />
              <MetaLine
                label="State Senate"
                value={display(matchedVoter.state_senate_district, '—')}
              />
              <MetaLine
                label="State House"
                value={display(matchedVoter.state_representative_district, '—')}
              />
              <MetaLine
                label="State / ZIP"
                value={
                  [matchedVoter.res_state, matchedVoter.res_zip5].filter(Boolean).join(' ') ||
                  '—'
                }
              />
              <MetaLine label="Match" value={display(matchedVoter.match_status, '—')} />
            </>
          ) : (
            <>
              <MetaLine label="Congressional" value="—" />
              <MetaLine label="State Senate" value="—" />
              <MetaLine label="State House" value="—" />
              <MetaLine label="Match" value="—" />
            </>
          )}
        </MetaCol>
      </div>
    </header>
  )
}
