import type { GotvPhaseResolution } from '../../lib/gotvCountdownEngine'
import type { VoterConversionCountyRollupRow } from '../../lib/voterConversionDb'
import { buildVoterConversionPriorityLines } from '../../lib/voterConversionPriorities'

export default function ChasePriorityCard({
  rollups,
  phaseResolution,
}: {
  rollups: readonly VoterConversionCountyRollupRow[]
  phaseResolution: GotvPhaseResolution
}) {
  const lines = buildVoterConversionPriorityLines(rollups, phaseResolution.phase)
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Chase priorities</h3>
      <p className="subtitle" style={{ marginTop: 0 }}>
        Countdown: <strong>{phaseResolution.phase.replace(/_/g, ' ')}</strong> · urgency ×
        {phaseResolution.urgency_multiplier.toFixed(2)}
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {lines.map((l) => (
          <li key={l} className="subtitle">
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}
