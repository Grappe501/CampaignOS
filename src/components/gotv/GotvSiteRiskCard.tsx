import { Link } from 'react-router-dom'
import type { GotvSiteRollup } from '../../lib/gotvMetrics'
import { gotvCountyOpsAnchor } from '../../lib/gotvDomain'

export default function GotvSiteRiskCard({ site }: { site: GotvSiteRollup }) {
  const chip =
    site.readiness_band === 'red'
      ? { bg: 'rgba(220,80,80,0.2)', fg: '#ffb4b4' }
      : site.readiness_band === 'orange'
        ? { bg: 'rgba(255,140,60,0.2)', fg: '#ffd0a8' }
        : site.readiness_band === 'yellow'
          ? { bg: 'rgba(220,200,80,0.15)', fg: '#fff3b0' }
          : { bg: 'rgba(80,180,120,0.18)', fg: '#c8ffd8' }

  return (
    <article
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '0.65rem 0.75rem',
        marginBottom: 8,
        background: 'rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 999,
            background: chip.bg,
            color: chip.fg,
          }}
        >
          {site.readiness_band}
        </span>
        <span className="subtitle" style={{ fontSize: '0.78rem' }}>
          Score {site.score} · coverage {site.coverage_pct}% · {site.site_kind.replace(/_/g, ' ')}
        </span>
      </div>
      <h4 style={{ margin: '0.4rem 0 0.2rem', fontSize: '0.95rem' }}>{site.label}</h4>
      <p className="subtitle" style={{ margin: 0, fontSize: '0.82rem' }}>
        {site.primary_reasons[0] ?? 'Review site staffing in turnout command.'}
      </p>
      <p style={{ margin: '0.5rem 0 0' }}>
        <Link to={gotvCountyOpsAnchor(site.county_id)} className="btn-touch" style={{ fontSize: '0.82rem' }}>
          Open county command
        </Link>
      </p>
    </article>
  )
}
