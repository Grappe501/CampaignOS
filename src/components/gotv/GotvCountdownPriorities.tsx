import type { GotvPhaseResolution } from '../../lib/gotvCountdownEngine'

export default function GotvCountdownPriorities({
  phaseResolution,
}: {
  phaseResolution: GotvPhaseResolution
}) {
  const p = phaseResolution
  return (
    <section
      className="event-coordinator-desk__section"
      aria-labelledby="gotv-countdown-priorities-heading"
      style={{ marginBottom: '1rem' }}
    >
      <h2 id="gotv-countdown-priorities-heading" className="event-coordinator-desk__h2">
        Turnout phase priorities
      </h2>
      <p className="event-coordinator-desk__meta" role="status">
        Phase: <strong>{p.phase.replace(/_/g, ' ')}</strong>
        {' · '}
        Urgency weight <strong>{p.urgency_multiplier.toFixed(2)}</strong>
      </p>
      <ul className="county-ops-board" style={{ marginTop: 8 }}>
        {p.phase_priorities.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="subtitle" style={{ fontSize: '0.8rem', marginTop: 8 }}>
        Phases follow the in-app election clock — tune early vote dates in <code>gotvDomain</code> for your
        jurisdiction.
      </p>
    </section>
  )
}
