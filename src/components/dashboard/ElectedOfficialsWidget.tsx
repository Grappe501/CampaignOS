import type { MatchedVoterDisplayRow } from '../../lib/voterMatch'
import type {
  DistrictOfficialsMap,
  PublicOfficialEntry,
  PublicOfficialsResponse,
} from '../../lib/api/publicOfficials'
import {
  bucketLabel,
  formatArkansasStateHouseDistrict,
  formatArkansasStateSenateDistrict,
  formatArkansasUsHouseCode,
  groupOfficialsByBucket,
  sortBucketKeysForDisplay,
} from '../../lib/electedOfficialsDisplay'
import StatusCard from './StatusCard'

function OfficialRow({
  entry,
  onOpenOfficial,
}: {
  entry: PublicOfficialEntry
  onOpenOfficial?: (o: PublicOfficialEntry) => void
}) {
  return (
    <li className="elected-officials-widget__row">
      <div className="elected-officials-widget__line">
        <span className="elected-officials-widget__office">{entry.office}</span>
        {onOpenOfficial ? (
          <button type="button" className="elected-officials-widget__name" onClick={() => onOpenOfficial(entry)}>
            {entry.name}
          </button>
        ) : (
          <span className="elected-officials-widget__nameText">{entry.name}</span>
        )}
        {entry.party ? <span className="elected-officials-widget__party">({entry.party})</span> : null}
      </div>
      {entry.urls?.[0] ? (
        <a href={entry.urls[0]} target="_blank" rel="noopener noreferrer" className="elected-officials-widget__url">
          Website
        </a>
      ) : null}
    </li>
  )
}

function DistrictStrip({
  label,
  districtCode,
  official,
}: {
  label: string
  districtCode: string
  official: PublicOfficialEntry | null | undefined
}) {
  return (
    <div className="elected-officials-widget__district">
      <span className="elected-officials-widget__district-label">{label}</span>
      <span className="elected-officials-widget__district-code">{districtCode}</span>
      {official?.name ? (
        <span className="elected-officials-widget__district-incumbent">{official.name}</span>
      ) : (
        <span className="elected-officials-widget__district-incumbent muted">—</span>
      )}
    </div>
  )
}

export default function ElectedOfficialsWidget({
  matchedVoter,
  officialsState,
  officialsLoading,
  districtOfficials,
  onOpenOfficial,
}: {
  matchedVoter: MatchedVoterDisplayRow
  officialsState: PublicOfficialsResponse | null
  officialsLoading: boolean
  districtOfficials: DistrictOfficialsMap | null | undefined
  onOpenOfficial?: (o: PublicOfficialEntry) => void
}) {
  const list = officialsState?.officials ?? []
  const grouped = groupOfficialsByBucket(list)
  const buckets = sortBucketKeysForDisplay().filter((b) => grouped[b].length > 0)

  const showBody = officialsState?.ok && (list.length > 0 || districtOfficials)

  return (
    <StatusCard title="Your elected officials (Arkansas)" compact className="elected-officials-widget">
      <p className="subtitle elected-officials-widget__pathway" style={{ margin: '0 0 12px' }}>
        Data path: your matched voter address →{' '}
        <strong>Netlify function</strong> <code>public-officials</code> → Google Civic Information API (or Open States
        + geocode). Set <code>GOOGLE_CIVIC_API_KEY</code> on the server — no scraping, no keys in the browser.
      </p>

      {officialsLoading ? (
        <p className="subtitle" style={{ margin: 0 }}>
          Loading representatives…
        </p>
      ) : showBody ? (
        <>
          {officialsState?.addressUsed ? (
            <p className="subtitle" style={{ margin: '0 0 10px' }}>
              Based on: <strong>{officialsState.addressUsed}</strong>
              {officialsState.source === 'google_civic' ? (
                <span> · Google Civic Information API</span>
              ) : officialsState.source === 'openstates_geo' ? (
                <span> · Open States (geo)</span>
              ) : null}
            </p>
          ) : null}

          <section className="elected-officials-widget__section" aria-labelledby="your-districts-heading">
            <h3 id="your-districts-heading" className="elected-officials-widget__h3">
              Your districts (voter file)
            </h3>
            <p className="subtitle small" style={{ marginTop: 0 }}>
              Numbers from registration; names from the representatives API when available (e.g. AR-02 and U.S. House
              incumbent).
            </p>
            <DistrictStrip
              label="U.S. House"
              districtCode={formatArkansasUsHouseCode(matchedVoter.congressional_district)}
              official={districtOfficials?.usHouse}
            />
            <DistrictStrip
              label="State Senate"
              districtCode={formatArkansasStateSenateDistrict(matchedVoter.state_senate_district)}
              official={districtOfficials?.stateSenate}
            />
            <DistrictStrip
              label="State House"
              districtCode={formatArkansasStateHouseDistrict(matchedVoter.state_representative_district)}
              official={districtOfficials?.stateHouse}
            />
          </section>

          {buckets.map((bucket) => (
            <section
              key={bucket}
              className="elected-officials-widget__section"
              aria-labelledby={`bucket-${bucket}`}
            >
              <h3 id={`bucket-${bucket}`} className="elected-officials-widget__h3">
                {bucketLabel(bucket)}
              </h3>
              <ul className="elected-officials-widget__list">
                {grouped[bucket].map((row, i) => (
                  <OfficialRow key={`${row.office}-${row.name}-${i}`} entry={row} onOpenOfficial={onOpenOfficial} />
                ))}
              </ul>
            </section>
          ))}

          <p className="subtitle small elected-officials-widget__note" role="note">
            U.S. Senators, Governor, and Arkansas constitutional offices appear here when returned for your address
            by the Civic API. If any row is missing, check API quotas or voter city/state/ZIP.
          </p>
        </>
      ) : (
        <p className="subtitle" style={{ margin: 0 }}>
          {officialsState?.error === 'not_configured'
            ? 'Server needs GOOGLE_CIVIC_API_KEY or OPENSTATES_API_KEY (see Netlify env).'
            : officialsState?.error === 'http_error'
              ? officialsState.message
              : officialsState?.message ||
                'No representatives returned. Confirm voter city/state/ZIP and API keys.'}
        </p>
      )}
    </StatusCard>
  )
}
