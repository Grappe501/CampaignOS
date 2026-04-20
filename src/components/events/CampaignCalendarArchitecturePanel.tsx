import type { CampaignCalendarEventRecord } from '../../lib/campaignCalendarArchitecture'
import {
  CALENDAR_FUNCTION_SEGMENTS,
  CALENDAR_GEO_SCOPE_SEGMENTS,
  CALENDAR_LIFECYCLE_STATUSES,
  CALENDAR_MOBILIZE_STATUSES,
  CALENDAR_STAFFING_STATUSES,
  CALENDAR_VIEW_PRESETS,
  CALENDAR_VISIBILITY_SEGMENTS,
  CALENDAR_WIDGETS_ROADMAP,
} from '../../lib/campaignCalendarArchitecture'

function formatSegment(s: string): string {
  return s.replace(/_/g, ' ')
}

const EVENT_MODEL_FIELDS: { key: keyof CampaignCalendarEventRecord; note?: string }[] = [
    { key: 'event_id' },
    { key: 'title' },
    { key: 'event_type' },
    { key: 'event_subtype' },
    { key: 'stage_status' },
    { key: 'start_at' },
    { key: 'end_at' },
    { key: 'timezone' },
    { key: 'venue_name' },
    { key: 'address_or_virtual' },
    { key: 'owner_user_id' },
    { key: 'owner_role' },
    { key: 'host_user_ids', note: 'array' },
    { key: 'county_id' },
    { key: 'precinct_id' },
    { key: 'district_id' },
    { key: 'visibility_scope' },
    { key: 'public_publish_state' },
    { key: 'mobilize_publish_state' },
    { key: 'mobilize_event_id' },
    { key: 'mobilize_last_synced_at' },
    { key: 'mobilize_last_error' },
    { key: 'mobilize_public_url' },
    { key: 'mobilize_tags_synced' },
    { key: 'mobilize_sync_hash' },
    { key: 'mobilize_update_needed' },
    { key: 'staffing_state' },
    { key: 'followup_state' },
    { key: 'finance_flag' },
    { key: 'candidate_flag' },
    { key: 'county_party_flag' },
    { key: 'notes' },
    { key: 'created_at' },
    { key: 'updated_at' },
  ]

export default function CampaignCalendarArchitecturePanel({
  variant = 'full',
}: {
  /** `compact` = principle + link to calendar; `full` = segments, model, statuses, widgets. */
  variant?: 'full' | 'compact'
}) {
  if (variant === 'compact') {
    return (
      <div className="calendar-arch calendar-arch--compact">
        <p className="calendar-arch__principle">
          <strong>One calendar engine</strong> — public, internal, candidate, shifts, and
          fundraising are <strong>filtered views</strong> on the same event rows (visibility +
          segment fields), not separate disconnected calendars.
        </p>
      </div>
    )
  }

  return (
    <div className="calendar-arch" id="campaign-calendar-architecture">
      <h2 className="event-coordinator-desk__h2">Campaign calendar architecture</h2>
      <p className="calendar-arch__principle">
        <strong>One calendar engine.</strong> Multiple filtered views. Do not fork calendars by
        surface — use <strong>visibility</strong>, <strong>function</strong>, and{' '}
        <strong>geographic</strong> segments on a single event source.
      </p>

      <details className="calendar-arch__details">
        <summary>Segments — visibility / audience</summary>
        <ul className="calendar-arch__chips">
          {CALENDAR_VISIBILITY_SEGMENTS.map((s) => (
            <li key={s}>
              <code>{s}</code> <span className="calendar-arch__chip-label">{formatSegment(s)}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="calendar-arch__details">
        <summary>Segments — function</summary>
        <ul className="calendar-arch__chips">
          {CALENDAR_FUNCTION_SEGMENTS.map((s) => (
            <li key={s}>
              <code>{s}</code> <span className="calendar-arch__chip-label">{formatSegment(s)}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="calendar-arch__details">
        <summary>Segments — geographic scope</summary>
        <ul className="calendar-arch__chips">
          {CALENDAR_GEO_SCOPE_SEGMENTS.map((s) => (
            <li key={s}>
              <code>{s}</code> <span className="calendar-arch__chip-label">{formatSegment(s)}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="calendar-arch__details" open>
        <summary>Permission-aware view presets</summary>
        <ul className="calendar-arch__views">
          {CALENDAR_VIEW_PRESETS.map((v) => (
            <li key={v.id}>
              <strong>{v.label}.</strong> {v.description}
              <span className="calendar-arch__view-filters"> {v.filterSummary}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="calendar-arch__details">
        <summary>“What’s coming up” strip (dashboards)</summary>
        <p className="calendar-arch__meta">
          Next 3–7 items under each desk header — same engine, personalized by role and geographic
          scope when wired.
        </p>
      </details>

      <details className="calendar-arch__details">
        <summary>Event model fields (segmentation)</summary>
        <p className="calendar-arch__meta">
          Target row shape for the shared calendar (implementation TBD).
        </p>
        <ul className="calendar-arch__fields">
          {EVENT_MODEL_FIELDS.map(({ key, note }) => (
            <li key={key}>
              <code>{key}</code>
              {note ? <span className="calendar-arch__field-note"> ({note})</span> : null}
            </li>
          ))}
        </ul>
      </details>

      <details className="calendar-arch__details">
        <summary>Statuses — lifecycle · staffing · Mobilize</summary>
        <div className="calendar-arch__status-grid">
          <div>
            <h3 className="calendar-arch__h3">Lifecycle</h3>
            <p className="calendar-arch__status-line">{CALENDAR_LIFECYCLE_STATUSES.join(' · ')}</p>
          </div>
          <div>
            <h3 className="calendar-arch__h3">Staffing</h3>
            <p className="calendar-arch__status-line">{CALENDAR_STAFFING_STATUSES.join(' · ')}</p>
          </div>
          <div>
            <h3 className="calendar-arch__h3">Mobilize</h3>
            <p className="calendar-arch__status-line">{CALENDAR_MOBILIZE_STATUSES.join(' · ')}</p>
          </div>
        </div>
      </details>

      <section className="calendar-arch__widgets" aria-labelledby="cal-widgets-heading">
        <h3 id="cal-widgets-heading" className="calendar-arch__h3">
          Calendar widgets (roadmap)
        </h3>
        <ol className="calendar-arch__widget-list">
          {CALENDAR_WIDGETS_ROADMAP.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
