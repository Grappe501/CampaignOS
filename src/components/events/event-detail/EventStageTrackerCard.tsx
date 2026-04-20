import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { CAMPAIGN_EVENT_PIPELINE_STATUSES } from '../../../lib/campaignEventSystem'
import type { CampaignEventTypeDefinition } from '../../../lib/campaignEventTypeMatrix'
import type { EventStageSlug } from '../../../lib/eventTaskTemplateConfig'
import { formatEventStageSlug } from './eventDetailUtils'

type EventStageTrackerCardProps = {
  record: CampaignCalendarEventRecord | null
  requiredStageSlugs: EventStageSlug[]
  typeDef: CampaignEventTypeDefinition | undefined
  currentLifecycle: string | null
}

export default function EventStageTrackerCard({
  record,
  requiredStageSlugs,
  typeDef,
  currentLifecycle,
}: EventStageTrackerCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-stage-tracker"
      aria-labelledby="event-stage-tracker-heading"
    >
      <h2 id="event-stage-tracker-heading" className="event-coordinator-desk__h2">
        Workflow &amp; stage tracker
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Matrix stages vs calendar lifecycle — map explicitly when statuses sync. Blocked-stage
        warnings will use task dependencies when tasks persist.
      </p>

      <dl className="event-record-desk__dl">
        <div>
          <dt>Current lifecycle (`stage_status`)</dt>
          <dd>{currentLifecycle ?? '—'}</dd>
        </div>
        <div>
          <dt>Mobilize publish state</dt>
          <dd>{record?.mobilize_publish_state ?? '—'}</dd>
        </div>
      </dl>

      <h3 className="event-detail-card__h3">Required stages (config schema)</h3>
      <ol className="event-record-desk__path-list">
        {requiredStageSlugs.map((s) => (
          <li key={s}>{formatEventStageSlug(s)}</li>
        ))}
      </ol>

      <details className="event-coordinator-desk__details">
        <summary>Coordinator pipeline statuses (reference)</summary>
        <p className="event-coordinator-desk__meta">
          {CAMPAIGN_EVENT_PIPELINE_STATUSES.join(' · ')}
        </p>
      </details>

      {typeDef ? (
        <details className="event-coordinator-desk__details">
          <summary>Event-type path milestones</summary>
          <ol className="event-record-desk__path-list">
            {typeDef.requiredPath.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {typeDef.commonRisks.length > 0 ? (
            <>
              <h4 className="event-detail-card__h4">Common risks</h4>
              <ul className="event-record-desk__path-list">
                {typeDef.commonRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : null}
        </details>
      ) : null}
    </section>
  )
}
