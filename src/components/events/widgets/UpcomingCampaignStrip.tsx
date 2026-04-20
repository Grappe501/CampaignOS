import { Link } from 'react-router-dom'
import { useUpcomingCampaignItems } from '../../../hooks/useEventSummaries'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import type {
  CalendarWidgetPersona,
  EventSummaryFilter,
  UpcomingCampaignItem,
} from '../../../lib/eventSummaryEngine'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function urgencyClass(u: UpcomingCampaignItem['urgency']): string {
  if (u === 'high') return 'ec-widget-strip__urgency ec-widget-strip__urgency--high'
  if (u === 'watch') return 'ec-widget-strip__urgency ec-widget-strip__urgency--watch'
  return 'ec-widget-strip__urgency ec-widget-strip__urgency--low'
}

export function UpcomingCampaignStripView({
  items,
  title,
  subtitle,
  className = '',
  id = 'upcoming-campaign-strip',
}: {
  items: UpcomingCampaignItem[]
  title: string
  subtitle?: string
  className?: string
  id?: string
}) {
  return (
    <section
      className={`ec-widget-strip seg-cal__strip ${className}`.trim()}
      aria-labelledby={`${id}-heading`}
      id={id}
    >
      <h3 id={`${id}-heading`} className="seg-cal__strip-title">
        {title}
      </h3>
      {subtitle ? <p className="seg-cal__strip-meta">{subtitle}</p> : null}
      {items.length === 0 ? (
        <p className="event-coordinator-desk__placeholder" role="status">
          No upcoming items in this view.
        </p>
      ) : (
        <ol className="seg-cal__strip-list">
          {items.map((row) => (
            <li key={row.eventId} className="ec-widget-strip__row">
              <div className="ec-widget-strip__main">
                <Link to={campaignEventRecordPath(row.eventId)} className="ec-widget-strip__link">
                  {row.title}
                </Link>
                <span className={`${urgencyClass(row.urgency)}`} aria-label={`Urgency ${row.urgency}`}>
                  {row.urgency}
                </span>
              </div>
              <span className="seg-cal__strip-when">{formatWhen(row.startAt)}</span>
              <p className="ec-widget-strip__chips">
                <span className="seg-cal__chip">{row.visibilityScope.replace(/_/g, ' ')}</span>
                {row.candidateInvolved ? <span className="seg-cal__chip">Candidate</span> : null}
                {row.fundraisingTouch ? <span className="seg-cal__chip">Fundraising</span> : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function UpcomingCampaignStripConnected({
  persona,
  filter,
  limit = 7,
  title = 'Upcoming',
  subtitle = 'Persona-scoped from the shared event queue — filters optional.',
  className,
}: {
  persona: CalendarWidgetPersona
  filter?: EventSummaryFilter
  limit?: number
  title?: string
  subtitle?: string
  className?: string
}) {
  const items = useUpcomingCampaignItems(persona, { limit, filter })
  return (
    <UpcomingCampaignStripView
      items={items}
      title={title}
      subtitle={subtitle}
      className={className}
    />
  )
}

type UpcomingCampaignStripProps =
  | {
      variant?: 'hook'
      persona: CalendarWidgetPersona
      filter?: EventSummaryFilter
      limit?: number
      title?: string
      subtitle?: string
      className?: string
    }
  | {
      variant: 'items'
      items: UpcomingCampaignItem[]
      title?: string
      subtitle?: string
      className?: string
    }

export default function UpcomingCampaignStrip(props: UpcomingCampaignStripProps) {
  if (props.variant === 'items') {
    return (
      <UpcomingCampaignStripView
        items={props.items}
        title={props.title ?? 'Upcoming'}
        subtitle={props.subtitle}
        className={props.className}
      />
    )
  }
  return (
    <UpcomingCampaignStripConnected
      persona={props.persona}
      filter={props.filter}
      limit={props.limit}
      title={props.title}
      subtitle={props.subtitle}
      className={props.className}
    />
  )
}
