import { useMemo } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  buildMobilizePromotionBullets,
  summarizeMobilizeQueue,
} from '../../../lib/eventSummaryEngine'

type MobilizeQueueSummaryCardProps = {
  events: readonly CampaignCalendarEventRecord[]
  className?: string
}

export default function MobilizeQueueSummaryCard({
  events,
  className = '',
}: MobilizeQueueSummaryCardProps) {
  const { summary, bullets } = useMemo(() => {
    const summary = summarizeMobilizeQueue(events)
    return { summary, bullets: buildMobilizePromotionBullets(summary) }
  }, [events])

  return (
    <section
      className={`ec-widget-card event-coordinator-desk__section mobilize-summary-card ${className}`.trim()}
      aria-labelledby="mobilize-summary-card-heading"
      id="mobilize-queue-summary-card"
    >
      <h3 id="mobilize-summary-card-heading" className="event-coordinator-desk__h2">
        Mobilize promotion health
      </h3>
      <p className="event-coordinator-desk__meta">
        Snapshot from the same event pool as the desk queue — row-level fields only (no live RSVP
        counts from Mobilize).
      </p>
      <div className="mobilize-summary-card__badges" role="list">
        <span
          className={`mobilize-stat-badge ${summary.attentionCount > 0 ? 'mobilize-stat-badge--alert' : ''}`.trim()}
          role="listitem"
        >
          Attention: {summary.attentionCount}
        </span>
        <span className="mobilize-stat-badge mobilize-stat-badge--muted" role="listitem">
          Sync errors: {summary.syncErrorCount}
        </span>
        <span className="mobilize-stat-badge mobilize-stat-badge--muted" role="listitem">
          Update / drift: {summary.updateRequiredCount}
        </span>
        <span className="mobilize-stat-badge mobilize-stat-badge--ok" role="listitem">
          Published (healthy): {summary.publishedHealthyCount}
        </span>
        <span className="mobilize-stat-badge mobilize-stat-badge--muted" role="listitem">
          Remote linked: {summary.remoteLinkedCount}
        </span>
        <span className="mobilize-stat-badge mobilize-stat-badge--muted" role="listitem">
          Eligible backlog: {summary.eligibleCount}
        </span>
      </div>
      <dl className="ec-widget-card__stats mobilize-summary-card__dl">
        <div>
          <dt>In flight (queued lanes)</dt>
          <dd>{summary.queuedCount}</dd>
        </div>
        <div>
          <dt>Published (any)</dt>
          <dd>{summary.publishedCount}</dd>
        </div>
        <div>
          <dt>Not applicable</dt>
          <dd>{summary.notApplicableCount}</dd>
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
