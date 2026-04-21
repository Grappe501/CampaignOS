import type { VoterConversionCountyRollupRow } from '../../lib/voterConversionDb'
import { buildVoterConversionProgramMetrics } from '../../lib/voterConversionMetrics'

export default function VoterConversionFunnel({
  rollups,
}: {
  rollups: readonly VoterConversionCountyRollupRow[]
}) {
  const m = buildVoterConversionProgramMetrics(rollups)
  const max = Math.max(m.tracked_voters, 1)
  const bar = (n: number) => `${Math.round((n / max) * 100)}%`

  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Voter conversion funnel</h3>
      <p className="subtitle">DB-backed posture across counties (leadership view).</p>
      <ul className="voter-conversion-funnel-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li className="subtitle">
          Tracked voters <strong>{m.tracked_voters}</strong> <span style={{ opacity: 0.7 }}>({bar(m.tracked_voters)})</span>
        </li>
        <li className="subtitle">
          Supporters (stage) <strong>{m.supporters}</strong>{' '}
          {m.contacted_to_supporter_rate != null ? (
            <span style={{ opacity: 0.7 }}>· {m.contacted_to_supporter_rate}% of tracked</span>
          ) : null}
        </li>
        <li className="subtitle">
          Commitments secured <strong>{m.committed}</strong>{' '}
          {m.supporter_to_commitment_rate != null ? (
            <span style={{ opacity: 0.7 }}>· {m.supporter_to_commitment_rate}% of supporters</span>
          ) : null}
        </li>
        <li className="subtitle">
          Ballot plans recorded <strong>{m.ballot_recorded}</strong>{' '}
          {m.commitment_to_ballot_rate != null ? (
            <span style={{ opacity: 0.7 }}>· {m.commitment_to_ballot_rate}% of commitments</span>
          ) : null}
        </li>
      </ul>
    </div>
  )
}
