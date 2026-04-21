import { NavLink, useLocation } from 'react-router-dom'
import {
  campaignEventRecordSectionPath,
  type EventRecordDetailSectionSlug,
} from '../../../lib/campaignEventSystem'

const LINKS: { section: EventRecordDetailSectionSlug; label: string }[] = [
  { section: 'command', label: 'Command' },
  { section: 'health', label: 'Health' },
  { section: 'overview', label: 'Overview' },
  { section: 'stages', label: 'Stages' },
  { section: 'tasks', label: 'Tasks' },
  { section: 'field', label: 'Field' },
  { section: 'communications', label: 'Comms' },
  { section: 'staffing', label: 'Staffing' },
  { section: 'logistics', label: 'Logistics' },
  { section: 'calendar', label: 'Calendar' },
  { section: 'mobilize', label: 'Mobilize' },
  { section: 'outcomes', label: 'Outcomes' },
  { section: 'followup', label: 'Follow-up' },
]

export default function EventDetailSectionNav({ eventId }: { eventId: string }) {
  const location = useLocation()

  return (
    <nav
      className="event-detail-section-nav"
      aria-label="Jump to event sections"
      id="event-detail-section-nav"
    >
      {LINKS.map(({ section, label }) => {
        const to = campaignEventRecordSectionPath(eventId, section)
        const isActive = location.pathname === to
        return (
          <NavLink
            key={section}
            to={to}
            className={() =>
              `event-detail-section-nav__link${isActive ? ' event-detail-section-nav__link--active' : ''}`
            }
          >
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}
