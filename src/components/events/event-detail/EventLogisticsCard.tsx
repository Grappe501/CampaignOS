import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'

type EventLogisticsCardProps = {
  record: CampaignCalendarEventRecord | null
  logisticsAndHostGaps: CoordinatorOperationsGap[]
}

export default function EventLogisticsCard({
  record,
  logisticsAndHostGaps,
}: EventLogisticsCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      aria-labelledby="event-logistics-heading"
    >
      <h2 id="event-logistics-heading" className="event-coordinator-desk__h2">
        Logistics
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Materials, signage, literature, check-in tools, venue/security/audio, and load-in notes —
        structured rows will replace this summary.
      </p>
      <dl className="event-record-desk__dl">
        <div>
          <dt>Venue name</dt>
          <dd>{record?.venue_name ?? '—'}</dd>
        </div>
        <div>
          <dt>Address / virtual</dt>
          <dd>{record?.address_or_virtual?.trim() ? record.address_or_virtual : '—'}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{record?.timezone ?? '—'}</dd>
        </div>
      </dl>
      {logisticsAndHostGaps.length > 0 ? (
        <ul className="event-record-desk__gap-list">
          {logisticsAndHostGaps.map((g) => (
            <li key={g.message}>
              <span className="event-record-desk__gap-sev">{g.category}</span> {g.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No logistics or host gaps flagged.</p>
      )}
    </section>
  )
}
