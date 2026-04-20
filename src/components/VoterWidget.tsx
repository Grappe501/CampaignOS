import type { MatchedVoterDisplayRow } from '../lib/voterMatch'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="voter-kv voter-kv--compact">
      <div className="voter-k">{label}</div>
      <p className="voter-v">{value}</p>
    </div>
  )
}

export default function VoterWidget({
  voter,
}: {
  voter: MatchedVoterDisplayRow | null
}) {
  if (!voter) return null

  const stateZip =
    [voter.res_state, voter.res_zip5].filter(Boolean).join(' ') || '—'
  const hasDetail =
    Boolean(voter.res_city) ||
    Boolean(voter.precinct_name) ||
    Boolean(voter.registrant_status)

  return (
    <section
      className="voter-lookup-compact card"
      aria-label="Voter look up"
    >
      <details className="voter-lookup-details" open={false}>
        <summary className="voter-lookup-summary">
          <span className="voter-lookup-summary-title">Voter look up</span>
          <span className="voter-lookup-summary-line">
            {voter.name_first} {voter.name_last}
            <span className="voter-lookup-sep">·</span>
            {voter.registrant_status ?? 'Status unknown'}
            <span className="voter-lookup-sep">·</span>
            ID {voter.voter_id}
          </span>
        </summary>
        {hasDetail ? (
          <div className="voter-lookup-body">
            <Row label="Name" value={`${voter.name_first} ${voter.name_last}`} />
            <Row label="County" value={voter.county ?? '—'} />
            <Row label="City" value={voter.res_city ?? '—'} />
            <Row label="State / ZIP" value={stateZip} />
            <Row label="Precinct" value={voter.precinct_name ?? '—'} />
            <Row label="Registration" value={voter.registrant_status ?? '—'} />
            <Row
              label="Congressional"
              value={voter.congressional_district ?? '—'}
            />
            <Row label="State Senate" value={voter.state_senate_district ?? '—'} />
            <Row
              label="State House"
              value={voter.state_representative_district ?? '—'}
            />
            <Row label="Match" value={voter.match_status ?? '—'} />
          </div>
        ) : (
          <p className="subtitle voter-lookup-note">
            Voter file row is linked to your account. Full address fields will
            appear when the roster record is available.
          </p>
        )}
      </details>
    </section>
  )
}
