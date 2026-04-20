import { useEffect, useState } from 'react'
import {
  CAMPAIGN_ELECTION_CLOCK,
  formatCountdownDisplay,
  formatCountdownDisplayCompact,
  getCountdownParts,
  getCountdownUrgency,
  pollsCloseIsoInstant,
} from '../../lib/campaignClock'
import { getStrategicPhase } from '../../lib/candidateDeskNarrative'

export default function CandidateElectionStrategicCard() {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const parts = getCountdownParts(nowMs)
  const urgency = getCountdownUrgency(parts)
  const phase = getStrategicPhase(urgency)
  const targetIso = pollsCloseIsoInstant()

  return (
    <section
      className={`card stack-section candidate-strategic-card candidate-strategic-card--${urgency}`}
      aria-labelledby="candidate-election-strategic-title"
    >
      <h2 id="candidate-election-strategic-title" className="candidate-section-title">
        Election countdown & strategic phase
      </h2>
      <p className="subtitle candidate-section-lede">
        Calendar pressure and phase copy come from the in-repo election configuration (<code>campaignClock</code>),
        not polls or fundraising dashboards. KPI “momentum” is handled separately using live goal rows — there is no
        fabricated chronology tying the two.
      </p>
      <div className="candidate-countdown-block">
        <p className="candidate-countdown-meta subtitle" style={{ margin: '0 0 6px' }}>
          <strong>{CAMPAIGN_ELECTION_CLOCK.electionDayLabel}</strong>
          <span aria-hidden="true"> · </span>
          Polls close {CAMPAIGN_ELECTION_CLOCK.pollsCloseDisplay} (
          {CAMPAIGN_ELECTION_CLOCK.timeZone})
        </p>
        <p className="candidate-countdown-time-row">
          <time className="candidate-countdown-time candidate-countdown-time--full" dateTime={targetIso}>
            {formatCountdownDisplay(parts)}
          </time>
          <time
            className="candidate-countdown-time candidate-countdown-time--compact"
            dateTime={targetIso}
          >
            {formatCountdownDisplayCompact(parts)}
          </time>
        </p>
      </div>
      <div className="candidate-phase-block">
        <h3 className="subtitle" style={{ fontWeight: 800, margin: '14px 0 6px' }}>
          {phase.title}
        </h3>
        <p className="subtitle" style={{ margin: '0 0 10px', lineHeight: 1.45 }}>
          {phase.summary}
        </p>
        <ul className="candidate-phase-list subtitle">
          {phase.operationalEmphasis.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
