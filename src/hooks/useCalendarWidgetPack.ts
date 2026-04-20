import { useEffect, useMemo, useState } from 'react'
import {
  buildCalendarWidgetPack,
  type CalendarWidgetPack,
  type CalendarWidgetPersona,
} from '../lib/calendarWidgetData'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'

export function useCalendarWidgetPack(
  persona: CalendarWidgetPersona,
): CalendarWidgetPack {
  const { events } = useCampaignEventsContext()
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => {
    return buildCalendarWidgetPack(events, persona, nowMs)
  }, [events, persona, nowMs])
}
