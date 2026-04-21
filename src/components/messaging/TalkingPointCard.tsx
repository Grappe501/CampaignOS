import type { CampaignNarrativeFramework, TalkingPointDef } from '../../lib/messageFramework'
import { pillarByKey } from '../../lib/messageFramework'

export default function TalkingPointCard({
  framework,
  point,
  tonePreview,
}: {
  framework: CampaignNarrativeFramework
  point: TalkingPointDef
  tonePreview?: string
}) {
  const pillar = pillarByKey(framework, point.pillar_key)
  return (
    <article className="card card--inner stack-section talking-point-card">
      <p className="subtitle" style={{ margin: 0, opacity: 0.85 }}>
        {pillar?.title ?? point.pillar_key}
      </p>
      <h3 className="power5-subheading" style={{ margin: '0.25rem 0' }}>
        {point.headline}
      </h3>
      {point.elaboration ? <p className="subtitle">{point.elaboration}</p> : null}
      <p className="subtitle">
        <strong>Ask:</strong> {point.ask_line}
      </p>
      {tonePreview ? (
        <p className="subtitle" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
          Tone preview: {tonePreview}
        </p>
      ) : null}
    </article>
  )
}
