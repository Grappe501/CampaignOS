import type { ReactNode } from 'react'
import type { CampaignProfile } from '../../hooks/useProfile'
import type {
  DistrictOfficialsMap,
  PublicOfficialEntry,
} from '../../lib/api/publicOfficials'
import type { MatchedVoterDisplayRow } from '../../lib/voterMatch'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../../brand/chrisJonesForCongress'
import {
  formatArkansasStateHouseDistrict,
  formatArkansasStateSenateDistrict,
  formatArkansasUsHouseCode,
} from '../../lib/electedOfficialsDisplay'
import ProfilePhotoUpload from './ProfilePhotoUpload'

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

function DistrictOfficialLine({
  label,
  districtText,
  official,
  officialsLoading,
  onOpenOfficial,
}: {
  label: string
  districtText: string
  official: PublicOfficialEntry | null | undefined
  officialsLoading: boolean
  onOpenOfficial?: (o: PublicOfficialEntry) => void
}) {
  return (
    <div className="dash-header-meta-line dash-header-district-line">
      <span className="dash-header-meta-k">{label}</span>
      <span className="dash-header-meta-v dash-header-district-value">
        <span className="dash-district-num">{districtText}</span>
        {official && onOpenOfficial ? (
          <>
            <span className="dash-district-sep" aria-hidden>
              {' '}
              ·{' '}
            </span>
            <button
              type="button"
              className="dash-official-name-link"
              onClick={() => onOpenOfficial(official)}
            >
              {official.name}
            </button>
          </>
        ) : null}
        {officialsLoading && !official ? (
          <span className="dash-official-loading"> · …</span>
        ) : null}
      </span>
    </div>
  )
}

export default function DashboardHeader({
  profile,
  email,
  matchedVoter,
  onProfileRefresh,
  districtOfficials,
  headerOfficials,
  officialsLoading = false,
  onOpenOfficial,
}: {
  profile: CampaignProfile | null
  email?: string | null
  matchedVoter?: MatchedVoterDisplayRow | null
  onProfileRefresh?: () => void
  /** U.S. House, state senate, state house from Google Civic (matched to offices). */
  districtOfficials?: DistrictOfficialsMap | null
  /** Full merged list (districts first, then remaining officials) for header density. */
  headerOfficials?: PublicOfficialEntry[]
  officialsLoading?: boolean
  onOpenOfficial?: (official: PublicOfficialEntry) => void
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

  const profilePhoto = profile?.profile_photo_url
    ? String(profile.profile_photo_url).trim()
    : ''
  const hasCustomPhoto = Boolean(profilePhoto)
  const volunteerInitial = showName
    ? fullName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : ''
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined

  return (
    <header
      className="card card--brand stack-section dash-identity dash-identity--tight"
      aria-labelledby="dash-identity-title"
    >
      <div className="dash-identity-banner">
        <div className="dash-brand-mark dash-brand-mark--header">
          <div className="dash-profile-avatar-col dash-profile-avatar-col--lead">
            <span className="dash-candidate-headshot-ring dash-candidate-headshot-ring--tight dash-volunteer-headshot-ring">
              {hasCustomPhoto ? (
                <img
                  src={profilePhoto}
                  alt=""
                  className="dash-candidate-headshot-img dash-candidate-headshot-img--volunteer"
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span
                  className="dash-volunteer-avatar-placeholder"
                  aria-hidden={Boolean(volunteerInitial)}
                >
                  {volunteerInitial || '·'}
                </span>
              )}
            </span>
            <div id="dash-profile-photo">
              <ProfilePhotoUpload
                profileId={profileId}
                hasCustomPhoto={hasCustomPhoto}
                onDone={() => onProfileRefresh?.()}
              />
            </div>
          </div>
          <div className="dash-identity-center-cluster">
            <img
              src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.logoPrimaryUrl}
              alt=""
              className="dash-campaign-logo dash-campaign-logo--tight"
              width={200}
              height={40}
              loading="eager"
              decoding="async"
            />
            <p className="dash-dashboard-kicker">Campaign Dashboard</p>
            <p className="dash-tagline-tight">
              Chris Jones for Congress · {CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan}
            </p>
          </div>
          <div className="dash-candidate-headshot-col dash-candidate-headshot-col--trail">
            <span className="dash-candidate-headshot-ring dash-candidate-headshot-ring--tight">
              <img
                src={CHRIS_JONES_FOR_CONGRESS_PUBLIC.assets.candidateHeadshotUrl}
                alt="Chris Jones"
                className="dash-candidate-headshot-img"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
              />
            </span>
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
              <DistrictOfficialLine
                label="Congressional"
                districtText={formatArkansasUsHouseCode(matchedVoter.congressional_district)}
                official={districtOfficials?.usHouse}
                officialsLoading={officialsLoading}
                onOpenOfficial={onOpenOfficial}
              />
              <DistrictOfficialLine
                label="State Senate"
                districtText={formatArkansasStateSenateDistrict(matchedVoter.state_senate_district)}
                official={districtOfficials?.stateSenate}
                officialsLoading={officialsLoading}
                onOpenOfficial={onOpenOfficial}
              />
              <DistrictOfficialLine
                label="State House"
                districtText={formatArkansasStateHouseDistrict(
                  matchedVoter.state_representative_district,
                )}
                official={districtOfficials?.stateHouse}
                officialsLoading={officialsLoading}
                onOpenOfficial={onOpenOfficial}
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

      {matchedVoter && (headerOfficials?.length || officialsLoading) ? (
        <div
          className="dash-header-officials-strip"
          role="region"
          aria-label="Elected representatives for your area"
        >
          <h2 className="dash-header-officials-title">Your representatives</h2>
          {officialsLoading && !headerOfficials?.length ? (
            <p className="subtitle dash-header-officials-loading">Loading officials…</p>
          ) : (
            <ul className="dash-header-officials-list">
              {(headerOfficials ?? []).map((row, i) => (
                <li key={`${row.office}-${row.name}-${i}`} className="dash-header-officials-item">
                  <span className="dash-header-officials-office">{row.office}</span>
                  {onOpenOfficial ? (
                    <button
                      type="button"
                      className="dash-official-name-link dash-header-officials-name"
                      onClick={() => onOpenOfficial(row)}
                    >
                      {row.name}
                    </button>
                  ) : (
                    <span className="dash-header-officials-name">{row.name}</span>
                  )}
                  {row.party ? (
                    <span className="dash-header-officials-party"> ({row.party})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </header>
  )
}
