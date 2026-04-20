import type { CampaignKpiRow } from '../../lib/kpiEngine'
import type { KpiUserContribution } from '../../lib/kpiEngine'

function formatUnit(unit: string, n: number): string {
  if (unit === 'dollars') {
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`
  }
  return `${Math.round(n)}`
}

export default function CampaignKpisCard({
  kpis,
  contributions,
  loading,
  error,
  heading = 'Campaign goals',
  intro = 'Your tasks add measurable progress toward what we are building together.',
}: {
  kpis: CampaignKpiRow[]
  contributions: KpiUserContribution[]
  loading: boolean
  error: string | null
  /** Optional override (e.g. coordinator / leadership surfaces). */
  heading?: string
  intro?: string
}) {
  const top = kpis.slice(0, 5)
  const contribBySlug = new Map(contributions.map((c) => [c.kpi_slug, c.contributed]))

  return (
    <section
      className="card stack-section campaign-kpis-card"
      aria-labelledby="campaign-kpis-title"
    >
      <h2 id="campaign-kpis-title" className="page-title">
        {heading}
      </h2>
      <p className="subtitle" style={{ marginTop: 4 }}>
        {intro}
      </p>
      {error ? (
        <p className="subtitle" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="subtitle">Loading goals…</p>
      ) : top.length === 0 ? (
        <p className="subtitle">No active KPI window for today — check back after sync.</p>
      ) : (
        <ul className="campaign-kpis-list">
          {top.map((k) => {
            const target = Number(k.target_value) || 1
            const current = Number(k.current_value) || 0
            const pct = Math.min(100, Math.round((100 * current) / target))
            const mine = contribBySlug.get(k.slug) ?? 0
            return (
              <li key={k.id} className="campaign-kpis-list__item">
                <div className="campaign-kpis-list__head">
                  <strong>{k.name}</strong>
                  <span className="subtitle">
                    {formatUnit(k.unit, current)} / {formatUnit(k.unit, target)}
                  </span>
                </div>
                <div
                  className="campaign-kpis-meter"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <span className="campaign-kpis-meter__fill" style={{ width: `${pct}%` }} />
                </div>
                {mine > 0 ? (
                  <p className="subtitle campaign-kpis-you" style={{ margin: '6px 0 0' }}>
                    You contributed ~{formatUnit(k.unit, mine)} toward this goal.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
