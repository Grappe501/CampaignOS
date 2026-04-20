import type { MatchedVoterDisplayRow } from '../../lib/voterMatch'
import type {
  PublicOfficialEntry,
  PublicOfficialsResponse,
} from '../../lib/api/publicOfficials'
import StatusCard from './StatusCard'

export default function PublicOfficialsCard({
  matchedVoter,
  officialsState,
  officialsLoading,
  onOpenOfficial,
}: {
  matchedVoter: MatchedVoterDisplayRow | null
  officialsState: PublicOfficialsResponse | null
  officialsLoading: boolean
  onOpenOfficial?: (official: PublicOfficialEntry) => void
}) {
  if (!matchedVoter) {
    return null
  }

  const list = officialsState?.officials ?? []
  const showList = officialsState?.ok && list.length > 0

  return (
    <StatusCard
      title="Your public officials"
      compact
      className="public-officials-card"
    >
      {officialsLoading ? (
        <p className="subtitle" style={{ margin: 0 }}>
          Loading representatives…
        </p>
      ) : showList ? (
        <>
          {officialsState?.addressUsed ? (
            <p className="subtitle" style={{ margin: '0 0 10px' }}>
              Based on address: <strong>{officialsState.addressUsed}</strong>
              {officialsState.source === 'google_civic' ? (
                <span> · Google Civic Information API</span>
              ) : officialsState.source === 'openstates_geo' ? (
                <span> · Open States (by location)</span>
              ) : null}
            </p>
          ) : null}
          <ul className="public-officials-list">
            {list.map((row, i) => (
              <li key={`${row.office}-${row.name}-${i}`}>
                <div className="public-officials-line">
                  <span className="public-officials-office">{row.office}</span>
                  {onOpenOfficial ? (
                    <button
                      type="button"
                      className="public-officials-name-btn"
                      onClick={() => onOpenOfficial(row)}
                    >
                      {row.name}
                    </button>
                  ) : (
                    <span className="public-officials-name">{row.name}</span>
                  )}
                  {row.party ? (
                    <span className="public-officials-party">({row.party})</span>
                  ) : null}
                </div>
                {row.urls?.[0] ? (
                  <a
                    href={row.urls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-officials-link"
                  >
                    Website
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="subtitle" style={{ margin: 0 }}>
          {officialsState?.error === 'not_configured'
            ? 'Server needs GOOGLE_CIVIC_API_KEY or GOOGLE_API_KEY (with Civic Information API enabled), or OPENSTATES_API_KEY plus OPENCAGE_API_KEY or Geocoding-enabled GOOGLE_API_KEY. Set in Netlify or .env for netlify dev.'
            : officialsState?.error === 'http_error'
              ? officialsState.message
              : officialsState?.message ||
                'No representatives returned. Try again later or check the voter address on file.'}
        </p>
      )}
    </StatusCard>
  )
}
