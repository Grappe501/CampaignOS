import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  CAMPAIGN_EVENT_TYPE_MATRIX,
  type CampaignEventTypeDefinition,
  type CampaignEventTypeKey,
} from '../../../lib/campaignEventTypeMatrix'

type EventOverviewCardProps = {
  record: CampaignCalendarEventRecord | null
  typeDef: CampaignEventTypeDefinition | undefined
  loadedRow: CampaignCalendarEventRecord | null
  selectedType: CampaignEventTypeKey
  onTypeChange: (t: CampaignEventTypeKey) => void
}

export default function EventOverviewCard({
  record,
  typeDef,
  loadedRow,
  selectedType,
  onTypeChange,
}: EventOverviewCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-overview"
      aria-labelledby="event-overview-heading"
    >
      <h2 id="event-overview-heading" className="event-coordinator-desk__h2">
        Overview
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Why this event exists, who it serves, and scope — extended narrative fields will map to
        Supabase when available.
      </p>

      {typeDef ? (
        <>
          <p className="event-record-desk__purpose">
            <strong>Purpose.</strong> {typeDef.purpose}
          </p>
          <p className="event-record-desk__purpose">
            <strong>Audience.</strong> Inferred from type and visibility (
            {record?.visibility_scope ?? 'not set'}); explicit audience tags are a later pass.
          </p>
          <p className="event-record-desk__purpose">
            <strong>Goals.</strong> Use matrix milestones and task templates as the operational goal
            set until OKRs are stored per event.
          </p>
        </>
      ) : null}

      <dl className="event-record-desk__dl">
        <div>
          <dt>Candidate involved</dt>
          <dd>{record ? (record.candidate_flag ? 'Yes' : 'No') : '—'}</dd>
        </div>
        <div>
          <dt>Fundraising touch</dt>
          <dd>{record ? (record.finance_flag ? 'Yes' : 'No') : '—'}</dd>
        </div>
        <div>
          <dt>County party</dt>
          <dd>{record ? (record.county_party_flag ? 'Yes' : 'No') : '—'}</dd>
        </div>
        <div>
          <dt>Geography</dt>
          <dd>
            {record
              ? [record.county_id, record.precinct_id, record.district_id]
                  .filter(Boolean)
                  .join(' · ') || '—'
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{record?.notes?.trim() ? record.notes : '—'}</dd>
        </div>
      </dl>

      {!loadedRow ? (
        <>
          <p className="event-coordinator-desk__meta">
            No row loaded — pick a type for templates. <code>?type=…</code> deep-links.
          </p>
          <label className="event-record-desk__label" htmlFor="event-overview-type-select">
            Event type
          </label>
          <select
            id="event-overview-type-select"
            className="event-record-desk__select"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as CampaignEventTypeKey)}
          >
            {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <p className="event-coordinator-desk__meta">
          Type locked to row: <code>{loadedRow.event_type}</code>
        </p>
      )}
    </section>
  )
}
