import type { GotvSiteRollup } from '../../lib/gotvMetrics'
import GotvSiteRiskCard from './GotvSiteRiskCard'
import { sortSitesByRisk } from '../../lib/gotvSelectors'

export default function GotvSiteCoveragePanel({
  rollups,
  title = 'Polling & early vote sites',
}: {
  rollups: readonly GotvSiteRollup[]
  title?: string
}) {
  const sorted = sortSitesByRisk(rollups)
  return (
    <div>
      <h3 className="event-coordinator-desk__h2" style={{ fontSize: '1.05rem' }}>
        {title}
      </h3>
      {sorted.length === 0 ? (
        <p className="event-coordinator-desk__meta">
          No turnout sites in Supabase yet — add rows to <code>campaign_polling_places</code> and shifts to
          activate this command board.
        </p>
      ) : (
        sorted.map((s) => <GotvSiteRiskCard key={s.site_id} site={s} />)
      )}
    </div>
  )
}
