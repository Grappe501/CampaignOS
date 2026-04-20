import { useEffect, useMemo, useState } from 'react'
import {
  buildCalendarWidgetPack,
  type CalendarWidgetPack,
  type CalendarWidgetPersona,
} from '../lib/calendarWidgetData'
import { getCoordinatorEventQueueSource } from '../lib/campaignCalendarQueueSource'

export function useCalendarWidgetPack(
  persona: CalendarWidgetPersona,
): CalendarWidgetPack {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => {
    const events = getCoordinatorEventQueueSource()
    return buildCalendarWidgetPack(events, persona, nowMs)
  }, [persona, nowMs])
}
