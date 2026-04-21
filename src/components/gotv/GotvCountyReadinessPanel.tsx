import type { GotvSiteRollup } from '../../lib/gotvMetrics'
import type { GotvPhaseResolution } from '../../lib/gotvCountdownEngine'
import type { GotvProgramAnalytics } from '../../lib/gotvAnalytics'
import type { GotvInterventionHint } from '../../lib/gotvInterventions'
import type { GotvPollingPlaceRow } from '../../lib/gotvDomain'
import { filterSitesByCounty } from '../../lib/gotvSelectors'
import GotvSiteCoveragePanel from './GotvSiteCoveragePanel'
import GotvInterventionQueue from './GotvInterventionQueue'
import GotvIncidentPanel from './GotvIncidentPanel'

export default function GotvCountyReadinessPanel({
  campaignId,
  countyId,
  rollups,
  phaseResolution,
  analytics,
  interventionHints,
  sites,
  loading,
  error,
  onRefresh,
}: {
  campaignId: string
  countyId: string | null
  rollups: readonly GotvSiteRollup[]
  phaseResolution: GotvPhaseResolution
  analytics: GotvProgramAnalytics
  interventionHints: readonly GotvInterventionHint[]
  sites: readonly GotvPollingPlaceRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}) {
  const scoped = filterSitesByCounty(rollups, countyId)

  return (
    <section
      className="event-coordinator-desk__section"
      aria-labelledby="gotv-command-heading"
      id="gotv-command"
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <h2 id="gotv-command-heading" className="event-coordinator-desk__h2" style={{ margin: 0 }}>
          Turnout / polling place command
        </h2>
        <button type="button" className="btn-touch" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="event-coordinator-desk__meta" role="status">
        Phase <strong>{phaseResolution.phase.replace(/_/g, ' ')}</strong>
        {' · '}
        Sites tracked <strong>{analytics.total_sites}</strong>
        {' · '}
        Red <strong>{analytics.red_site_count}</strong> · Orange <strong>{analytics.orange_site_count}</strong>
        {' · '}
        Mean coverage <strong>{analytics.mean_coverage_pct}%</strong>
      </p>
      <p className="subtitle" style={{ fontSize: '0.84rem', maxWidth: 760 }}>
        {analytics.headline}
      </p>
      {error ? (
        <p className="seg-cal__banner" role="alert">
          {error}
        </p>
      ) : null}
      {countyId ? (
        <p className="event-coordinator-desk__meta">
          Filtered to county <strong>{countyId}</strong> — {scoped.length} site(s).
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div>
          <h3 className="event-coordinator-desk__h2" style={{ fontSize: '1rem' }}>
            Intervention queue (deterministic)
          </h3>
          <GotvInterventionQueue hints={interventionHints} />
        </div>
        <GotvSiteCoveragePanel rollups={scoped.length ? scoped : rollups} />
      </div>

      <GotvIncidentPanel campaignId={campaignId} sites={sites} onLogged={onRefresh} />
    </section>
  )
}
