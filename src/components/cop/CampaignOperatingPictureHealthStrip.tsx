import { Link } from 'react-router-dom'
import type { CampaignOperatingPicture } from '../../lib/cop/copTypes'

type Props = {
  cop: CampaignOperatingPicture
  /** When false, show condensed loading-friendly shell */
  ready?: boolean
}

export default function CampaignOperatingPictureHealthStrip({
  cop,
  ready = true,
}: Props) {
  const r = cop.summary.overallOperationalReadiness
  const p = cop.summary.campaignPressureIndex
  const m = cop.summary.campaignMomentumIndex
  const fresh = cop.freshness.dataFreshnessScore

  return (
    <section
      className="cop-health-strip"
      aria-label="Campaign operating picture"
      data-cop-freshness={fresh}
    >
      <div className="cop-health-strip__row">
        <span className="cop-health-strip__eyebrow">Operating picture</span>
        <span className="cop-health-strip__time">
          {ready ? new Date(cop.generatedAt).toLocaleString() : '…'}
        </span>
      </div>
      <div className="cop-health-strip__metrics" role="group" aria-label="Core indices">
        <div className="cop-health-strip__metric" data-level={r >= 70 ? 'ok' : r >= 45 ? 'mid' : 'low'}>
          <span className="cop-health-strip__k">Readiness</span>
          <span className="cop-health-strip__v">{ready ? `${Math.round(r)}` : '—'}</span>
        </div>
        <div className="cop-health-strip__metric" data-level={p <= 40 ? 'ok' : p <= 70 ? 'mid' : 'high'}>
          <span className="cop-health-strip__k">Pressure</span>
          <span className="cop-health-strip__v">{ready ? `${Math.round(p)}` : '—'}</span>
        </div>
        <div className="cop-health-strip__metric" data-level={m >= 55 ? 'ok' : 'mid'}>
          <span className="cop-health-strip__k">Momentum</span>
          <span className="cop-health-strip__v">{ready ? `${Math.round(m)}` : '—'}</span>
        </div>
        <div className="cop-health-strip__metric">
          <span className="cop-health-strip__k">Data trust</span>
          <span className="cop-health-strip__v">{ready ? `${Math.round(fresh)}` : '—'}</span>
        </div>
      </div>
      <p className="cop-health-strip__line">{cop.summary.subhead}</p>
      <div className="cop-health-strip__actions">
        <Link className="cop-health-strip__link" to="/events/leadership">
          Executive briefing →
        </Link>
        <Link className="cop-health-strip__link" to="/events/war-room">
          War room →
        </Link>
      </div>
    </section>
  )
}
