import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import { sortEventsByStartAsc } from '../../../lib/campaignCalendarSegmentEngine'

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function sameLocalDay(aMs: number, dayStart: Date): boolean {
  const end = addDays(dayStart, 1).getTime() - 1
  return aMs >= dayStart.getTime() && aMs <= end
}

export type EventCalendarWeekGridProps = {
  events: readonly CampaignCalendarEventRecord[]
  weekCursor: Date
  onPickDay?: (dayStart: Date) => void
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export default function EventCalendarWeekGrid({
  events,
  weekCursor,
  onPickDay,
}: EventCalendarWeekGridProps) {
  const weekStart = startOfWeekMonday(weekCursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const sorted = sortEventsByStartAsc([...events])

  return (
    <div className="seg-cal-week" role="grid" aria-label="Week view">
      <div className="seg-cal-week__grid">
        {days.map((day, i) => {
          const dayEvents = sorted.filter((e) => {
            const t = new Date(e.start_at).getTime()
            return sameLocalDay(t, day)
          })
          const label = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          return (
            <div key={day.toISOString()} className="seg-cal-week__col">
              <div className="seg-cal-week__col-head">
                <span className="seg-cal-week__dow">{DOW[i]}</span>
                <span className="seg-cal-week__date">{label}</span>
                {onPickDay ? (
                  <button
                    type="button"
                    className="seg-cal-week__add"
                    onClick={() => onPickDay(day)}
                  >
                    + Create
                  </button>
                ) : null}
              </div>
              <ul className="seg-cal-week__list">
                {dayEvents.map((e) => (
                  <li key={e.event_id}>
                    <Link to={campaignEventRecordPath(e.event_id)} className="seg-cal-week__link">
                      <span className="seg-cal-week__time">
                        {new Date(e.start_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="seg-cal-week__title">{e.title}</span>
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

// Non-component exports for calendar math (used by filters and other views).
/* eslint-disable react-refresh/only-export-components */
export { startOfWeekMonday, addDays }
