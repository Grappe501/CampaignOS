import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { inferFunctionSegment, inferGeoScope } from '../../../lib/campaignCalendarSegmentEngine'
import type { MobilizeEligibilityResult } from '../../../lib/mobilizePublishEligibility'

type EventCalendarVisibilityCardProps = {
  record: CampaignCalendarEventRecord | null
  eligibility: MobilizeEligibilityResult
}

export default function EventCalendarVisibilityCard({
  record,
  eligibility,
}: EventCalendarVisibilityCardProps) {
  const fnSeg = record ? inferFunctionSegment(record) : null
  const geoSeg = record ? inferGeoScope(record) : null

  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-calendar-visibility"
      aria-labelledby="event-calendar-visibility-heading"
    >
      <h2 id="event-calendar-visibility-heading" className="event-coordinator-desk__h2">
        Calendar &amp; visibility
      </h2>
      <p className="event-coordinator-desk__placeholder">
        One calendar engine — this row’s segments determine filtered views (coordinator, admin/CM,
        candidate, volunteer) and dashboard upcoming strips.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>Visibility scope</dt>
          <dd>{record?.visibility_scope ?? '—'}</dd>
        </div>
        <div>
          <dt>Inferred function segment</dt>
          <dd>{fnSeg ? fnSeg.replace(/_/g, ' ') : '—'}</dd>
        </div>
        <div>
          <dt>Inferred geo scope</dt>
          <dd>{geoSeg ? geoSeg.replace(/_/g, ' ') : '—'}</dd>
        </div>
        <div>
          <dt>Public listing eligibility (model)</dt>
          <dd>{eligibility.eligible ? 'Passes checks' : 'Not publish-ready'}</dd>
        </div>
        <div>
          <dt>Upcoming-strip eligibility</dt>
          <dd>
            {record
              ? 'Same row; dashboards filter by role + geo (wired later).'
              : 'Load a row to evaluate.'}
          </dd>
        </div>
      </dl>
    </section>
  )
}
