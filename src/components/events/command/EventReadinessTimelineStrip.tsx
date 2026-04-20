import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { computeTimelineState, type TimelinePhaseId } from '../../../lib/eventReadinessTimeline'

type PhaseDef = {
  id: TimelinePhaseId
  label: string
}

const PHASES: PhaseDef[] = [
  { id: 'created', label: 'Created' },
  { id: 'planning', label: 'Planning' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'communications', label: 'Communications' },
  { id: 'final_prep', label: 'Final prep' },
  { id: 'day_of', label: 'Day-of' },
  { id: 'follow_up', label: 'Follow-up' },
]

type EventReadinessTimelineStripProps = {
  record: CampaignCalendarEventRecord | null
}

export default function EventReadinessTimelineStrip({ record }: EventReadinessTimelineStripProps) {
  if (!record) {
    return (
      <section
        className="event-readiness-timeline"
        aria-label="Readiness timeline"
        style={{ marginBottom: '1rem' }}
      >
        <p className="event-coordinator-desk__meta">Timeline appears when the event record loads.</p>
      </section>
    )
  }

  const { completion, active, blockers, hoursUntilStart } = computeTimelineState(record)

  return (
    <section className="event-readiness-timeline" aria-label="Readiness timeline" style={{ marginBottom: '1.25rem' }}>
      <h2 className="event-coordinator-desk__h2" style={{ fontSize: '1.05rem' }}>
        Readiness timeline
      </h2>
      <p className="event-coordinator-desk__meta" role="status">
        Active phase: <strong>{PHASES.find((p) => p.id === active)?.label}</strong>
        {hoursUntilStart < 200 ? (
          <>
            {' '}
            · ~{Math.max(0, Math.round(hoursUntilStart))}h to start (rule-of-thumb)
          </>
        ) : null}
      </p>
      <ol className="event-readiness-timeline__phases" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {PHASES.map((ph) => {
          const pct = completion[ph.id]
          const isActive = ph.id === active
          const block = blockers[ph.id]
          return (
            <li
              key={ph.id}
              className={
                isActive
                  ? 'event-readiness-timeline__phase event-readiness-timeline__phase--active'
                  : 'event-readiness-timeline__phase'
              }
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.35rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ fontWeight: isActive ? 700 : 500 }}>{ph.label}</span>
              <span>
                <span className="event-health-score event-health-score--bar" style={{ display: 'block' }}>
                  <span
                    style={{
                      display: 'block',
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: `${pct}%`,
                        height: '100%',
                        background: block
                          ? 'var(--event-health-risk, #c98a2c)'
                          : 'var(--event-health-ready, #2d8a5c)',
                      }}
                    />
                  </span>
                  <span className="subtitle" style={{ fontSize: '0.78rem' }}>
                    {Math.round(pct)}% complete
                    {block ? ` · ${block}` : ''}
                  </span>
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
