import type { VoterConversionCountyRollupRow } from '../../lib/voterConversionDb'

export default function BallotPlanRiskCard({
  rollups,
}: {
  rollups: readonly VoterConversionCountyRollupRow[]
}) {
  const gaps = [...rollups]
    .map((r) => ({
      county: r.county || 'Unknown',
      gap: Math.max(0, r.committed - r.ballot_recorded),
    }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)

  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Ballot plan risk</h3>
      {gaps.length ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {gaps.map((g) => (
            <li key={g.county} className="subtitle">
              <strong>{g.county}</strong>: {g.gap} committed without recorded plan
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No ballot-plan gaps in aggregated rollups — keep logging dispositions.</p>
      )}
    </div>
  )
}
