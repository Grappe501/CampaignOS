import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  inferFunctionSegment,
  inferGeoScope,
} from '../../../lib/campaignCalendarSegmentEngine'
import {
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
} from '../../../lib/campaignEventSystem'
import EventHealthChip from '../command/EventHealthChip'

function formatSegmentLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type EventAgendaDayGroupProps = {
  dayKey: string
  events: CampaignCalendarEventRecord[]
}

export default function EventAgendaDayGroup({ dayKey, events }: EventAgendaDayGroupProps) {
  return (
    <section className="seg-cal__agenda-day" aria-labelledby={`ec-agenda-${dayKey}`}>
      <h3 id={`ec-agenda-${dayKey}`} className="seg-cal__agenda-day-title">
        {new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </h3>
      <ul className="seg-cal__agenda-list">
        {events.map((e) => (
          <li key={e.event_id} className="seg-cal__agenda-item">
            <div className="seg-cal__agenda-main">
              <Link to={campaignEventRecordPath(e.event_id)} className="seg-cal__agenda-link">
                {e.title}
              </Link>
              <div className="seg-cal__agenda-meta">
                <span className="seg-cal__agenda-time">{formatEventTime(e.start_at)}</span>
                <Link
                  to={campaignEventRecordSectionPath(e.event_id, 'tasks')}
                  className="seg-cal__agenda-tasks-link"
                >
                  Tasks
                </Link>
              </div>
            </div>
            <p className="seg-cal__agenda-chips">
              <EventHealthChip record={e} />
              <span className="seg-cal__chip">{formatSegmentLabel(e.visibility_scope)}</span>
              <span className="seg-cal__chip">{formatSegmentLabel(inferFunctionSegment(e))}</span>
              <span className="seg-cal__chip">{formatSegmentLabel(inferGeoScope(e))}</span>
              <span className="seg-cal__chip">{e.stage_status}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
