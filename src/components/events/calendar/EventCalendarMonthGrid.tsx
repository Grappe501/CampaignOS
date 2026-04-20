import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  daysInMonth,
  sortEventsByStartAsc,
  weekdayMondayZero,
} from '../../../lib/campaignCalendarSegmentEngine'
import {
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
} from '../../../lib/campaignEventSystem'

export type MonthCursor = { year: number; monthIndex: number }

type EventCalendarMonthGridProps = {
  events: readonly CampaignCalendarEventRecord[]
  cursor: MonthCursor
}

export default function EventCalendarMonthGrid({ events, cursor }: EventCalendarMonthGridProps) {
  const sorted = useMemo(() => sortEventsByStartAsc(events), [events])

  const { cells, byDay } = useMemo(() => {
    const { year, monthIndex } = cursor
    const dim = daysInMonth(year, monthIndex)
    const lead = weekdayMondayZero(year, monthIndex)
    const cells: ({ day: number } | null)[] = Array(lead)
      .fill(null)
      .map(() => null)
    for (let d = 1; d <= dim; d += 1) {
      cells.push({ day: d })
    }
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
    const inMonth = (iso: string) => {
      const dt = new Date(iso)
      return dt.getFullYear() === year && dt.getMonth() === monthIndex
    }
    const byDay = new Map<number, CampaignCalendarEventRecord[]>()
    for (const e of sorted) {
      if (!inMonth(e.start_at)) continue
      const day = new Date(e.start_at).getDate()
      const arr = byDay.get(day) ?? []
      arr.push(e)
      byDay.set(day, arr)
    }
    return { cells, byDay }
  }, [cursor, sorted])

  return (
    <div className="seg-cal__month">
      <div className="seg-cal__dow" aria-hidden>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d} className="seg-cal__dow-cell">
            {d}
          </span>
        ))}
      </div>
      <div className="seg-cal__grid">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`pad-${i}`} className="seg-cal__cell seg-cal__cell--muted" />
          }
          const evs = byDay.get(cell.day) ?? []
          return (
            <div key={cell.day} className="seg-cal__cell">
              <span className="seg-cal__cell-day">{cell.day}</span>
              <ul className="seg-cal__cell-events">
                {evs.map((e) => (
                  <li key={e.event_id} className="seg-cal__cell-event-row">
                    <Link
                      to={campaignEventRecordPath(e.event_id)}
                      className="seg-cal__cell-link"
                      title={e.title}
                    >
                      {e.title.length > 22 ? `${e.title.slice(0, 20)}…` : e.title}
                    </Link>
                    <Link
                      to={campaignEventRecordSectionPath(e.event_id, 'tasks')}
                      className="seg-cal__cell-tasks"
                      title="Task checklist"
                      aria-label={`Task checklist for ${e.title}`}
                    >
                      T
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
