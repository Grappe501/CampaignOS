import { useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { collectOperationsGapsForEvent } from '../../../lib/campaignEventCoordinatorOperations'
import { computeEventHealthScoreV2 } from '../../../lib/eventHealthScoreV2'
import { fetchLatestHealthScoreForEvent } from '../../../lib/eventHealthHistoryDb'

type EventHealthDrillDownProps = {
  record: CampaignCalendarEventRecord
  priorScore?: number | null
}

export default function EventHealthDrillDown({ record, priorScore: priorProp = null }: EventHealthDrillDownProps) {
  const [priorDb, setPriorDb] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchLatestHealthScoreForEvent(record.event_id).then((p) => {
      if (!cancelled) setPriorDb(p)
    })
    return () => {
      cancelled = true
    }
  }, [record.event_id])

  const priorScore = priorProp ?? priorDb

  const v2 = useMemo(() => {
    const gaps = collectOperationsGapsForEvent(record)
    return computeEventHealthScoreV2({ record, gaps, prior_score: priorScore })
  }, [record, priorScore])

  const worst = [...v2.score_components].sort((a, b) => a.component_score - b.component_score).slice(0, 4)
  const fastThree = v2.recommended_actions.slice(0, 3)

  return (
    <details
      className="event-detail-health-drill"
      style={{
        marginTop: 12,
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.15)',
      }}
    >
      <summary
        style={{
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.95rem',
          listStyle: 'none',
        }}
        className="event-coordinator-desk__h3"
      >
        Open score detail — drivers, risks &amp; next steps
      </summary>
      <div style={{ padding: '0 1rem 0.85rem' }}>
        <p className="subtitle" style={{ marginBottom: 8 }}>
          Trend: <strong>{v2.trend.replace(/_/g, ' ')}</strong>
          {v2.prior_score != null ? (
            <>
              {' '}
              · prior {v2.prior_score} → change {v2.score_change ?? '—'}
            </>
          ) : null}
        </p>
        <p style={{ margin: '0.35rem 0', fontSize: '0.92rem' }}>{v2.blocker_summary}</p>
        <p className="subtitle" style={{ margin: '0.35rem 0' }}>{v2.warning_summary}</p>

        <h4 className="subtitle" style={{ margin: '0.75rem 0 0.35rem', fontWeight: 600 }}>
          Weakest drivers
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem' }}>
          {worst.map((c) => (
            <li key={c.component_name}>
              <strong>{c.component_name}</strong> · {Math.round(c.component_score)}/100 (weight{' '}
              {Math.round(c.component_weight * 100)}%) — {c.recommended_fix}
            </li>
          ))}
        </ul>

        <h4 className="subtitle" style={{ margin: '0.75rem 0 0.35rem', fontWeight: 600 }}>
          Fastest three improvements
        </h4>
        <ol style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem' }}>
          {fastThree.map((a) => (
            <li key={a.action_type}>
              <strong>{a.action_type.replace(/_/g, ' ')}</strong> ({a.urgency}) — {a.detail}
            </li>
          ))}
        </ol>
      </div>
    </details>
  )
}
