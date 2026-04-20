import { useMemo } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { groupEventsByLocalDay } from '../../../lib/campaignCalendarSegmentEngine'
import EventAgendaDayGroup from './EventAgendaDayGroup'

type EventAgendaListProps = {
  events: readonly CampaignCalendarEventRecord[]
  emptyMessage?: string
}

export default function EventAgendaList({
  events,
  emptyMessage = 'No events match these filters. Adjust the panel above or connect Supabase for live rows.',
}: EventAgendaListProps) {
  const groups = useMemo(() => {
    const map = groupEventsByLocalDay(events)
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  }, [events])

  if (groups.length === 0) {
    return (
      <p className="event-coordinator-desk__placeholder" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="seg-cal__agenda">
      {groups.map(([dayKey, evs]) => (
        <EventAgendaDayGroup key={dayKey} dayKey={dayKey} events={evs} />
      ))}
    </div>
  )
}
