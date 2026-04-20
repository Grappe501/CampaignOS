import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../lib/campaignCalendarArchitecture'
import { CALENDAR_MOBILIZE_STATUSES } from '../../lib/campaignCalendarArchitecture'
import { campaignEventRecordPath } from '../../lib/campaignEventSystem'
import { buildMobilizeEligibility } from '../../lib/mobilizeFieldMapping'

function formatMobilizeStatus(s: string): string {
  return s.replace(/_/g, ' ')
}

export default function MobilizePromotionQueueSection({
  events,
}: {
  events: readonly CampaignCalendarEventRecord[]
}) {
  const buckets = useMemo(() => {
    const map = new Map<string, CampaignCalendarEventRecord[]>()
    for (const s of CALENDAR_MOBILIZE_STATUSES) {
      map.set(s, [])
    }
    for (const e of events) {
      const key =
        typeof e.mobilize_publish_state === 'string' && e.mobilize_publish_state
          ? e.mobilize_publish_state
          : 'not_applicable'
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return map
  }, [events])

  const eligibilityPreview = useMemo(() => {
    return events.map((e) => {
      const me = buildMobilizeEligibility(e)
      return {
        event_id: e.event_id,
        title: e.title,
        eligible: me.isEligible,
        blockers: me.blockingReasons,
      }
    })
  }, [events])

  return (
    <section
      className="mobilize-queue"
      id="mobilize-promotion-queue"
      aria-labelledby="mobilize-queue-heading"
    >
      <h2 id="mobilize-queue-heading" className="event-coordinator-desk__h2">
        Mobilize promotion queue
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Single internal model: each row carries <code>mobilize_publish_state</code> plus sync metadata
        (pass 3). <strong>No API keys in the browser</strong> — publish actions will call a server
        function when wired.
      </p>
      {events.length === 0 ? (
        <p className="event-coordinator-desk__meta" role="status">
          No events in the coordinator source yet. When Supabase feeds this list, buckets fill
          automatically from the same fields.
        </p>
      ) : (
        <>
          <div className="mobilize-queue__buckets">
            {CALENDAR_MOBILIZE_STATUSES.map((status) => {
              const list = buckets.get(status) ?? []
              return (
                <div key={status} className="mobilize-queue__bucket">
                  <h3 className="mobilize-queue__bucket-title">
                    {formatMobilizeStatus(status)}{' '}
                    <span className="mobilize-queue__count">({list.length})</span>
                  </h3>
                  {list.length === 0 ? (
                    <p className="mobilize-queue__empty">None</p>
                  ) : (
                    <ul className="mobilize-queue__list">
                      {list.map((e) => (
                        <li key={e.event_id}>
                          <Link to={campaignEventRecordPath(e.event_id)} className="mobilize-queue__link">
                            {e.title}
                          </Link>
                          <span className="mobilize-queue__type">{e.event_type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <details className="event-coordinator-desk__details">
            <summary>Publish eligibility (computed, read-only)</summary>
            <p className="event-coordinator-desk__meta">
              Rules engine only — does not call Mobilize. Rows below show whether the shared model
              would pass the full Mobilize contract (six-rule engine plus finance/public-copy gates).
            </p>
            <ul className="mobilize-queue__elig">
              {eligibilityPreview.map((row) => (
                <li key={row.event_id}>
                  <strong>{row.title}</strong>{' '}
                  <span className={row.eligible ? 'mobilize-queue__ok' : 'mobilize-queue__bad'}>
                    {row.eligible ? 'Eligible' : 'Blocked'}
                  </span>
                  {!row.eligible ? (
                    <span className="mobilize-queue__blockers"> — {row.blockers[0]}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
