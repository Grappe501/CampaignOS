import { useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  applyStaffingCoverageFilters,
  buildStaffingHeatmapByDay,
  computeEventCoverageMetrics,
  filterEventsForCoverageWindow,
  localDayKey,
} from '../../../lib/staffingCoverageHeatmapService'
import type { StaffingCoverageFiltersState } from '../../../lib/staffingCoverageModels'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import { Link } from 'react-router-dom'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import StaffingCoverageLegend from './StaffingCoverageLegend'
import StaffingCoverageFilters from './StaffingCoverageFilters'

type Props = {
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  nowMs?: number
  compact?: boolean
}

const EMPTY_FILTERS: StaffingCoverageFiltersState = {
  window: 'next_7d',
  eventType: '',
  countyId: '',
  organizerQuery: '',
  roleCategory: '',
  mode: 'both',
  criticalOnly: false,
}

function heatColor(coverage: number, risk: number): string {
  if (risk >= 65) return `hsl(0, ${50 + risk / 4}%, 40%)`
  if (coverage >= 88) return '#1e6b4a'
  if (coverage >= 70) return '#3d7a4e'
  if (coverage >= 45) return '#8a7a2a'
  return '#7a3030'
}

export default function StaffingCoverageHeatmap({ events, assignmentMap, nowMs, compact }: Props) {
  const [defaultNow] = useState(() => Date.now())
  const now = nowMs ?? defaultNow
  const [filters, setFilters] = useState<StaffingCoverageFiltersState>(EMPTY_FILTERS)
  const [pickDay, setPickDay] = useState<string | null>(null)

  const scoped = useMemo(() => {
    let inWin = filterEventsForCoverageWindow(events, filters.window, now)
    inWin = applyStaffingCoverageFilters(inWin, filters)
    if (!filters.criticalOnly) return inWin
    return inWin.filter((e) => {
      const m = computeEventCoverageMetrics(e, assignmentMap.get(e.event_id) ?? [])
      return m != null && m.critical_role_coverage_percentage < 99.5
    })
  }, [events, filters, now, assignmentMap])

  const byDay = useMemo(
    () => buildStaffingHeatmapByDay(scoped, assignmentMap),
    [scoped, assignmentMap],
  )

  const cells = useMemo(() => [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])), [byDay])

  const affectedEvents = useMemo(() => {
    if (!pickDay) return []
    return scoped.filter((e) => localDayKey(e.start_at) === pickDay)
  }, [pickDay, scoped])

  if (!events.length) {
    return (
      <section className="event-coordinator-desk__section" style={{ padding: '1rem' }}>
        <h3 className="event-coordinator-desk__h2">Staffing coverage heatmap</h3>
        <p className="event-coordinator-desk__placeholder" role="status">
          No upcoming events — create one from the coordinator desk to see coverage pressure over time.
        </p>
      </section>
    )
  }

  return (
    <section
      className="staffing-coverage-heatmap"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: compact ? '0.65rem' : '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 className="event-coordinator-desk__h2" style={{ margin: 0 }}>
            Staffing coverage heatmap
          </h3>
          <p className="subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
            Aggregated from matrix templates + assignments (pending-approval events excluded).
          </p>
        </div>
      </header>
      <StaffingCoverageFilters value={filters} onChange={setFilters} />
      <StaffingCoverageLegend />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
          gap: 4,
          marginTop: 12,
        }}
      >
        {cells.slice(0, compact ? 14 : 28).map(([day, cell]) => {
          const c = heatColor(cell.agg_coverage, cell.agg_risk)
          const active = pickDay === day
          return (
            <button
              key={day}
              type="button"
              title={`${day} — ${cell.eventCount} events · avg cov ${Math.round(cell.agg_coverage)}% · risk ${Math.round(cell.agg_risk)}`}
              onClick={() => setPickDay(active ? null : day)}
              style={{
                border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                background: c,
                color: '#fff',
                minHeight: 44,
                cursor: 'pointer',
                fontSize: '0.72rem',
                padding: 4,
              }}
            >
              <div>{day.slice(8)}</div>
              <div style={{ opacity: 0.9 }}>{Math.round(cell.agg_risk)}</div>
            </button>
          )
        })}
      </div>
      {pickDay ? (
        <div style={{ marginTop: 12 }} aria-live="polite">
          <h4 className="subtitle" style={{ margin: '0.25rem 0' }}>
            {pickDay} — events ({affectedEvents.length})
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {affectedEvents.map((e) => {
              const m = computeEventCoverageMetrics(e, assignmentMap.get(e.event_id) ?? [])
              return (
                <li key={e.event_id} style={{ marginBottom: 6 }}>
                  <Link to={campaignEventRecordPath(e.event_id)}>{e.title}</Link>
                  {' · '}
                  <Link
                    to={`${campaignEventRecordPath(e.event_id)}#rapid-actions-command`}
                    className="subtitle"
                  >
                    Rapid actions
                  </Link>
                  {m ? (
                    <span className="subtitle" style={{ marginLeft: 6 }}>
                      {m.bucket.replace(/_/g, ' ')} · crit {m.critical_role_coverage_percentage}% · risk{' '}
                      {m.staffing_risk_score}
                      {m.missing_critical_slugs.length > 0
                        ? ` · missing ${m.missing_critical_slugs.slice(0, 3).join(', ')}`
                        : ''}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
