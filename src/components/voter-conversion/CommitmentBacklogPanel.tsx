import type { VoterConversionCountyRollupRow } from '../../lib/voterConversionDb'

export default function CommitmentBacklogPanel({
  rollups,
}: {
  rollups: readonly VoterConversionCountyRollupRow[]
}) {
  const pending = rollups.reduce((a, r) => a + r.commitment_ask_pending, 0)
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Commitment backlog</h3>
      <p className="subtitle">
        <strong>{pending}</strong> voters in commitment-ask posture (aggregate). Pair with field capture to clear
        asks before countdown tightens.
      </p>
    </div>
  )
}
