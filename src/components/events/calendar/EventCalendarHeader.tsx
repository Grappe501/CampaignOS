import { Link } from 'react-router-dom'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  campaignEventRecordPath,
} from '../../../lib/campaignEventSystem'
import type { CalendarWidgetPersona } from '../../../lib/eventSummaryEngine'

function personaLabel(persona: CalendarWidgetPersona): string {
  switch (persona) {
    case 'admin':
      return 'Admin'
    case 'campaign_manager':
      return 'Campaign manager'
    case 'candidate':
      return 'Candidate'
    case 'coordinator':
      return 'Event coordinator'
    default:
      return 'Volunteer'
  }
}

type EventCalendarHeaderProps = {
  persona: CalendarWidgetPersona
}

export default function EventCalendarHeader({ persona }: EventCalendarHeaderProps) {
  return (
    <header className="ec-cal-header event-coordinator-desk__command" id="event-calendar-command">
      <div className="event-coordinator-desk__command-top">
        <div>
          <p className="event-coordinator-desk__eyebrow">Campaign calendar</p>
          <h1 className="event-coordinator-desk__title">Event calendar &amp; agenda</h1>
          <p className="event-coordinator-desk__lede">
            One event engine — filtered views for {personaLabel(persona)} visibility. Month and agenda
            modes share the same rows; production will swap fixtures for Supabase without changing this
            shell.
          </p>
        </div>
        <div className="event-coordinator-desk__week-summary" role="status">
          <p className="event-coordinator-desk__week-k">View modes</p>
          <p className="event-coordinator-desk__week-v">Calendar grid · Agenda list · Upcoming rail</p>
        </div>
      </div>
      <div className="event-coordinator-desk__quick-actions" aria-label="Calendar navigation">
        <Link to="/events" className="btn-touch btn-touch--ghost">
          ← Event desk overview
        </Link>
        <Link to="/events/review-requests" className="btn-touch btn-touch--ghost">
          Review requests
        </Link>
        <Link to="/events/promotion" className="btn-touch btn-touch--ghost">
          Mobilize queue
        </Link>
        <Link
          to={campaignEventRecordPath(CAMPAIGN_EVENT_NEW_RECORD_SLUG)}
          className="btn-touch btn-touch--ghost"
        >
          New event record
        </Link>
      </div>
    </header>
  )
}
