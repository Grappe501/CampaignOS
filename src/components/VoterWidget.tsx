import type { MatchedVoterDisplayRow } from '../lib/voterMatch'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="voter-kv">
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

  return (
    <section className="card stack-section" aria-label="Matched voter registration">
      <h2
        className="page-title"
        style={{ fontSize: 'clamp(1.35rem, 3vw + 0.5rem, 1.75rem)', marginBottom: 4 }}
      >
        Your voter record
      </h2>
      <div>
        <Row label="Name" value={`${voter.name_first} ${voter.name_last}`} />
        <Row label="County" value={voter.county ?? '—'} />
        <Row label="City" value={voter.res_city ?? '—'} />
        <Row label="State / ZIP" value={stateZip} />
        <Row label="Precinct" value={voter.precinct_name ?? '—'} />
        <Row label="Status" value={voter.registrant_status ?? '—'} />
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
    </section>
  )
}
