import { Link } from 'react-router-dom'
import type { VoterConversionCountyRollupRow } from '../../lib/voterConversionDb'

export default function RelationalFollowupQueue({
  rollups,
}: {
  rollups: readonly VoterConversionCountyRollupRow[]
}) {
  const total = rollups.reduce((a, r) => a + r.relational_linked, 0)
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Relational follow-up queue</h3>
      <p className="subtitle">
        <strong>{total}</strong> voters flagged for relational chase across visible counties. Strongest leverage
        lives in Power5 edges and linked roster IDs.
      </p>
      <Link to="/power5" className="btn-touch btn-touch--ghost">
        Open Power5 desk
      </Link>
    </div>
  )
}
