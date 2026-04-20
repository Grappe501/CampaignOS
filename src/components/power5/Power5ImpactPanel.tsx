import type { Power5ImpactRollup } from '../../hooks/usePower5Workspace'

export default function Power5ImpactPanel({ impact }: { impact: Power5ImpactRollup }) {
  return (
    <div className="power5-impact-strip power5-impact-strip--panel" role="region" aria-label="Impact">
      <div className="power5-impact-pill">
        <span className="power5-impact-n">{impact.total}</span>
        <span className="power5-impact-k">identified</span>
      </div>
      <div className="power5-impact-pill">
        <span className="power5-impact-n">{impact.contacted}</span>
        <span className="power5-impact-k">in motion</span>
      </div>
      <div className="power5-impact-pill">
        <span className="power5-impact-n">{impact.activated}</span>
        <span className="power5-impact-k">activated+</span>
      </div>
      <div className="power5-impact-pill">
        <span className="power5-impact-n">{impact.matched}</span>
        <span className="power5-impact-k">on roster</span>
      </div>
    </div>
  )
}
