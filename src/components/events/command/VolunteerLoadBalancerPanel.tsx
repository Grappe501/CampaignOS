import { useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import { buildVolunteerLoadMap, findOverloadedVolunteers } from '../../../lib/volunteerLoadBalancerService'

type Props = {
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  windowDays?: number
  compact?: boolean
}

export default function VolunteerLoadBalancerPanel({
  events,
  assignmentMap,
  windowDays = 7,
  compact,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 120_000)
    return () => window.clearInterval(id)
  }, [])
  const loadMap = useMemo(
    () => buildVolunteerLoadMap(events, assignmentMap, nowMs, windowDays),
    [events, assignmentMap, windowDays, nowMs],
  )
  const overloaded = useMemo(() => findOverloadedVolunteers(loadMap), [loadMap])
  const sample = useMemo(() => [...loadMap.values()].slice(0, compact ? 6 : 12), [loadMap, compact])

  return (
    <section
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: compact ? '0.65rem' : '1rem',
        marginBottom: '0.75rem',
      }}
      aria-labelledby="vol-load-heading"
    >
      <h3 id="vol-load-heading" className="event-coordinator-desk__h2" style={{ marginTop: 0 }}>
        Volunteer load balancer
      </h3>
      <p className="subtitle" style={{ marginTop: 0, fontSize: '0.82rem' }}>
        Advisory scoring from staffing rows across events (next {windowDays} days). Does not block
        assignments.
      </p>
      {overloaded.length ? (
        <p className="seg-cal__banner" role="status">
          <strong>{overloaded.length}</strong> volunteer(s) in elevated/overload bands — review before
          piling on critical roles.
        </p>
      ) : (
        <p className="event-coordinator-desk__meta" role="status">
          No overload signals in this window (heuristic).
        </p>
      )}
      <table className="event-staffing__table" style={{ marginTop: 10, width: '100%' }}>
        <thead>
          <tr>
            <th scope="col">Volunteer</th>
            <th scope="col">State</th>
            <th scope="col">Score</th>
            <th scope="col">Summary</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((r) => (
            <tr key={r.user_id}>
              <td>
                <code>{r.user_id.slice(0, 8)}…</code>
              </td>
              <td>{r.state.replace(/_/g, ' ')}</td>
              <td>{r.load_score}</td>
              <td className="subtitle" style={{ fontSize: '0.78rem' }}>
                {r.details}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
