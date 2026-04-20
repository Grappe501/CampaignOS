import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  createExternalEventPayload,
  mapMobilizeToExternalPublishState,
  validateExternalPublishingReadiness,
} from '../../../lib/eventExternalPublishing'

export default function EventPublishPipelineCard({
  record,
}: {
  record: CampaignCalendarEventRecord | null
}) {
  if (!record) {
    return (
      <section className="event-panel" id="event-publish-pipeline" aria-labelledby="pub-heading">
        <h2 id="pub-heading" className="event-panel__title">
          External publishing
        </h2>
        <p className="event-panel__placeholder">Load an event to review publish readiness.</p>
      </section>
    )
  }

  const state = mapMobilizeToExternalPublishState(record.mobilize_publish_state)
  const payload = createExternalEventPayload({
    publicTitle: record.public_title ?? record.title,
    publicDescription: record.public_description ?? '',
    startAt: record.start_at,
    endAt: record.end_at,
    timezone: record.timezone,
    visibilityScope: record.visibility_scope,
    capacity: null,
  })

  const readiness = validateExternalPublishingReadiness({
    hasPublicCopy: Boolean((record.public_title ?? record.title).trim()),
    hasVenueOrVirtual: Boolean(record.venue_name || record.address_or_virtual || record.virtual_url),
    hasApprovedLikeStatus: ['approved', 'scheduled', 'published_internal', 'published_public'].includes(
      String(record.stage_status),
    ),
    visibilityAllowsPublic: !['internal_staff', 'finance_private', 'leadership_only'].includes(
      record.visibility_scope,
    ),
  })

  return (
    <section className="event-panel" id="event-publish-pipeline" aria-labelledby="pub-heading">
      <h2 id="pub-heading" className="event-panel__title">
        Publish pipeline
      </h2>
      <p className="event-panel__kpi">
        Mapped state: <strong>{state}</strong> · Mobilize raw:{' '}
        <code>{String(record.mobilize_publish_state)}</code>
      </p>
      <p className={readiness.ok ? 'event-panel__ok' : 'event-panel__warn'}>
        {readiness.ok ? 'Passes basic publish readiness checks.' : readiness.reasons.join(' · ')}
      </p>
      <details className="event-coordinator-desk__details">
        <summary>External payload preview</summary>
        <pre className="neighborhood-json">{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </section>
  )
}
