import { useEffect, useState } from 'react'
import {
  CAMPAIGN_ELECTION_CLOCK,
  formatCountdownDisplay,
  formatCountdownDisplayCompact,
  getCountdownParts,
  getCountdownUrgency,
  pollsCloseIsoInstant,
} from '../lib/campaignClock'

/**
 * Slim live countdown; internal 1s tick so the rest of AppHeader does not re-render.
 */
export default function ElectionCountdownBar() {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const parts = getCountdownParts(nowMs)
  const urgency = getCountdownUrgency(parts)
  const targetIso = pollsCloseIsoInstant()

  return (
    <div
      className={`election-countdown-bar election-countdown-bar--${urgency}`}
      aria-labelledby="election-countdown-heading"
    >
      <span className="sr-only">
        Live countdown to poll closing time. Updates every second.
      </span>
      <div className="election-countdown-inner">
        <p id="election-countdown-heading" className="election-countdown-heading">
          {CAMPAIGN_ELECTION_CLOCK.headingLabel}
        </p>
        <p className="election-countdown-meta">
          <span className="election-countdown-meta__date">
            {CAMPAIGN_ELECTION_CLOCK.electionDayLabel}
          </span>
          <span className="election-countdown-meta__sep" aria-hidden="true">
            ·
          </span>
          <span className="election-countdown-meta__close">
            Polls close {CAMPAIGN_ELECTION_CLOCK.pollsCloseDisplay}
          </span>
        </p>
        <p className="election-countdown-time-wrapper">
          <time
            className="election-countdown-time election-countdown-time--full"
            dateTime={targetIso}
          >
            {formatCountdownDisplay(parts)}
          </time>
          <time
            className="election-countdown-time election-countdown-time--compact"
            dateTime={targetIso}
          >
            {formatCountdownDisplayCompact(parts)}
          </time>
        </p>
      </div>
    </div>
  )
}
