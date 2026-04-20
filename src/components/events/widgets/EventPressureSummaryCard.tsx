import { useMemo } from 'react'
import { useEventPressureSummary } from '../../../hooks/useEventSummaries'
import type { CalendarWidgetPersona, EventPressureSummaryCounts } from '../../../lib/eventSummaryEngine'
import type { EventSummaryFilter } from '../../../lib/eventSummaryEngine'
import { buildEventPressureBullets } from '../../../lib/eventSummaryEngine'

type EventPressureSummaryCardProps = {
  persona: CalendarWidgetPersona
  filter?: EventSummaryFilter
  /** When set (e.g. calendar page uses fully filtered pool), replaces hook counts. */
  countsOverride?: EventPressureSummaryCounts
  bulletsOverride?: string[]
  className?: string
}

export default function EventPressureSummaryCard({
  persona,
  filter,
  countsOverride,
  bulletsOverride,
  className = '',
}: EventPressureSummaryCardProps) {
  const hooked = useEventPressureSummary(persona, filter)
  const counts = countsOverride ?? hooked
  const bullets = useMemo(
    () => bulletsOverride ?? buildEventPressureBullets(counts),
    [bulletsOverride, counts],
  )

  return (
    <section
      className={`ec-widget-card event-coordinator-desk__section ${className}`.trim()}
      aria-labelledby="ec-pressure-heading"
      id="event-pressure-summary-card"
    >
      <h3 id="ec-pressure-heading" className="event-coordinator-desk__h2">
        Event pressure
      </h3>
      <p className="event-coordinator-desk__placeholder">
        Operational counts from the same pool as Mobilize and staffing heuristics.
      </p>
      <dl className="ec-widget-card__stats">
        <div>
          <dt>Approvals backlog</dt>
          <dd>{counts.approvalBacklogCount}</dd>
        </div>
        <div>
          <dt>Staffing gaps</dt>
          <dd>{counts.staffingGapCount}</dd>
        </div>
        <div>
          <dt>Logistics gaps</dt>
          <dd>{counts.logisticsGapCount}</dd>
        </div>
        <div>
          <dt>Mobilize queue pressure</dt>
          <dd>{counts.mobilizeQueueCount}</dd>
        </div>
        <div>
          <dt>Follow-up overdue</dt>
          <dd>{counts.followupOverdueCount}</dd>
        </div>
        <div>
          <dt>High-priority risk</dt>
          <dd>{counts.highPriorityRiskCount}</dd>
        </div>
      </dl>
      <ul className="ec-widget-card__bullets">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  )
}
