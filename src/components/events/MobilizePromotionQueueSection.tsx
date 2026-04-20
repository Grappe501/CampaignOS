import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../lib/campaignCalendarArchitecture'
import {
  fetchMobilizeServerCapabilities,
  type MobilizeCapabilitiesResponse,
} from '../../lib/api/mobilizeEvents'
import { buildMobilizeEligibility } from '../../lib/mobilizeFieldMapping'
import { summarizeMobilizeQueue } from '../../lib/eventSummaryEngine'
import {
  coordinatorMobilizeLaneForRecord,
  groupEventsByMobilizeQueueLane,
  listMobilizeEligibleBacklog,
  MOBILIZE_COORDINATOR_QUEUE_LANES,
  MOBILIZE_PASS1_HIGHLIGHT_LANES,
  MOBILIZE_QUEUE_LANE_DESCRIPTIONS,
  MOBILIZE_QUEUE_LANE_LABELS,
  type MobilizeCoordinatorQueueLane,
} from '../../lib/mobilizeQueueModel'
import { supabase } from '../../lib/supabaseClient'
import { campaignEventRecordPath } from '../../lib/campaignEventSystem'

function formatMobilizeStatus(s: string): string {
  return s.replace(/_/g, ' ')
}

export default function MobilizePromotionQueueSection({
  events,
}: {
  events: readonly CampaignCalendarEventRecord[]
}) {
  const buckets = useMemo(() => groupEventsByMobilizeQueueLane(events), [events])
  const backlog = useMemo(() => listMobilizeEligibleBacklog(events), [events])
  const mobilizeSnapshot = useMemo(() => summarizeMobilizeQueue(events), [events])

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

  const [serverCaps, setServerCaps] = useState<{
    loaded: boolean
    caps: MobilizeCapabilitiesResponse | null
    error: string | null
  }>({ loaded: false, caps: null, error: null })

  useEffect(() => {
    let cancel = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        if (!cancel) {
          setServerCaps({
            loaded: true,
            caps: null,
            error: 'Sign in to probe the Mobilize server integration.',
          })
        }
        return
      }
      try {
        const c = await fetchMobilizeServerCapabilities(token)
        if (!cancel) {
          setServerCaps({
            loaded: true,
            caps: c,
            error: null,
          })
        }
      } catch (e) {
        if (!cancel) {
          setServerCaps({
            loaded: true,
            caps: null,
            error:
              e instanceof Error
                ? e.message
                : 'mobilize-events unreachable (use netlify dev with functions).',
          })
        }
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

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
        CampaignOS remains the source of truth; Mobilize is the public signup surface. Queue lanes
        derive from <code>mobilize_publish_state</code> on each row.{' '}
        <strong>No Mobilize secrets in the browser</strong> — operations go through{' '}
        <code>/.netlify/functions/mobilize-events</code> (publish / update / sync / refresh when env is set).
      </p>

      {events.length > 0 ? (
        <div className="mobilize-queue__snapshot" role="region" aria-label="Mobilize queue snapshot">
          <p className="mobilize-queue__snapshot-k">Queue snapshot (this source list)</p>
          <div className="mobilize-queue__snapshot-badges">
            <span
              className={`mobilize-stat-badge ${mobilizeSnapshot.attentionCount > 0 ? 'mobilize-stat-badge--alert' : ''}`.trim()}
            >
              Attention {mobilizeSnapshot.attentionCount}
            </span>
            <span className="mobilize-stat-badge mobilize-stat-badge--muted">
              Errors {mobilizeSnapshot.syncErrorCount}
            </span>
            <span className="mobilize-stat-badge mobilize-stat-badge--muted">
              Update {mobilizeSnapshot.updateRequiredCount}
            </span>
            <span className="mobilize-stat-badge mobilize-stat-badge--ok">
              Healthy {mobilizeSnapshot.publishedHealthyCount}
            </span>
            <span className="mobilize-stat-badge mobilize-stat-badge--muted">
              Linked {mobilizeSnapshot.remoteLinkedCount}
            </span>
            <span className="mobilize-stat-badge mobilize-stat-badge--muted">
              Eligible {mobilizeSnapshot.eligibleCount}
            </span>
          </div>
        </div>
      ) : null}

      <div
        className="mobilize-queue__server-cap"
        role="status"
        aria-live="polite"
      >
        <h3 className="mobilize-queue__server-cap-title">Server integration</h3>
        {!serverCaps.loaded ? (
          <p className="event-coordinator-desk__meta">Checking capabilities…</p>
        ) : serverCaps.error ? (
          <p className="event-record-desk__sync-warn">{serverCaps.error}</p>
        ) : (
          <ul className="mobilize-queue__server-cap-list">
            <li>
              Mutate operations implemented:{' '}
              <strong>
                {serverCaps.caps?.mutateOperationsImplemented === true
                  ? `Yes — ${(serverCaps.caps.supportedActions ?? []).join(', ') || 'publish, update, check_sync'}`
                  : serverCaps.caps?.mutateOperationsImplemented === false
                    ? 'No — configure Supabase service role, MOBILIZE_ORGANIZATION_ID, and Mobilize token on the server'
                    : '—'}
              </strong>
            </li>
            <li>
              Mobilize API token configured on server:{' '}
              <strong>
                {serverCaps.caps?.mobilizeApiTokenConfigured === true
                  ? 'Yes'
                  : serverCaps.caps?.mobilizeApiTokenConfigured === false
                    ? 'No'
                    : '—'}
              </strong>{' '}
              (presence only — value never exposed)
            </li>
            {serverCaps.caps?.supabaseAdminConfigured != null ? (
              <li>
                Supabase service role + URL configured:{' '}
                <strong>{serverCaps.caps.supabaseAdminConfigured ? 'Yes' : 'No'}</strong>
              </li>
            ) : null}
            {serverCaps.caps?.mobilizeOrganizationIdConfigured != null ? (
              <li>
                Mobilize organization id configured:{' '}
                <strong>{serverCaps.caps.mobilizeOrganizationIdConfigured ? 'Yes' : 'No'}</strong>
              </li>
            ) : null}
            {serverCaps.caps?.notes?.length ? (
              <li className="mobilize-queue__server-cap-notes">
                <span className="mobilize-queue__server-cap-notes-k">Notes</span>
                <ul>
                  {serverCaps.caps.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {events.length === 0 ? (
        <p className="event-coordinator-desk__meta" role="status">
          No events in the coordinator source yet. When Supabase feeds this list, buckets fill from
          the same fields.
        </p>
      ) : (
        <>
          <h3 className="mobilize-queue__subhead">Operational lanes</h3>
          <div className="mobilize-queue__buckets mobilize-queue__buckets--highlight">
            {MOBILIZE_PASS1_HIGHLIGHT_LANES.map((status) => {
              const list = buckets.get(status) ?? []
              return (
                <div key={status} className="mobilize-queue__bucket">
                  <h3 className="mobilize-queue__bucket-title mobilize-queue__bucket-title--plain">
                    {MOBILIZE_QUEUE_LANE_LABELS[status]}{' '}
                    <span className="mobilize-queue__count">({list.length})</span>
                  </h3>
                  <p className="mobilize-queue__bucket-desc">
                    {MOBILIZE_QUEUE_LANE_DESCRIPTIONS[status]}
                  </p>
                  {list.length === 0 ? (
                    <p className="mobilize-queue__empty">None</p>
                  ) : (
                    <ul className="mobilize-queue__list">
                      {list.map((e) => (
                        <li key={e.event_id} className="mobilize-queue__li">
                          <Link to={campaignEventRecordPath(e.event_id)} className="mobilize-queue__link">
                            {e.title}
                          </Link>
                          <span className="mobilize-queue__type">{e.event_type}</span>
                          {e.mobilize_public_url ? (
                            <a
                              href={e.mobilize_public_url}
                              className="mobilize-queue__pub"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Public
                            </a>
                          ) : null}
                          {e.mobilize_last_error ? (
                            <span className="mobilize-queue__li-badge mobilize-queue__li-badge--err" title={e.mobilize_last_error}>
                              Error
                            </span>
                          ) : null}
                          {(e.mobilize_update_needed ||
                            String(e.mobilize_publish_state ?? '') === 'update_required') &&
                          !e.mobilize_last_error ? (
                            <span className="mobilize-queue__li-badge mobilize-queue__li-badge--warn">
                              Update
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <h3 className="mobilize-queue__subhead">Eligible backlog (contract, not yet queued)</h3>
          <p className="event-coordinator-desk__meta">
            Full Mobilize contract (six-rule + finance/public copy). Excludes published, queued, and
            archived.
          </p>
          {backlog.length === 0 ? (
            <p className="mobilize-queue__empty">None</p>
          ) : (
            <ul className="mobilize-queue__list mobilize-queue__list--compact">
              {backlog.map((e) => (
                <li key={e.event_id}>
                  <Link to={campaignEventRecordPath(e.event_id)} className="mobilize-queue__link">
                    {e.title}
                  </Link>
                  <span className="mobilize-queue__type">
                    {formatMobilizeStatus(coordinatorMobilizeLaneForRecord(e))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="event-coordinator-desk__details">
            <summary>All lane buckets (including draft, archived, N/A)</summary>
            <div className="mobilize-queue__buckets">
              {MOBILIZE_COORDINATOR_QUEUE_LANES.filter(
                (lane) => !MOBILIZE_PASS1_HIGHLIGHT_LANES.includes(lane),
              ).map((status) => {
                const list = buckets.get(status as MobilizeCoordinatorQueueLane) ?? []
                return (
                  <div key={status} className="mobilize-queue__bucket">
                    <h3 className="mobilize-queue__bucket-title mobilize-queue__bucket-title--plain">
                      {MOBILIZE_QUEUE_LANE_LABELS[status]}{' '}
                      <span className="mobilize-queue__count">({list.length})</span>
                    </h3>
                    {list.length === 0 ? (
                      <p className="mobilize-queue__empty">None</p>
                    ) : (
                      <ul className="mobilize-queue__list">
                        {list.map((e) => (
                          <li key={e.event_id}>
                            <Link
                              to={campaignEventRecordPath(e.event_id)}
                              className="mobilize-queue__link"
                            >
                              {e.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </details>

          <details className="event-coordinator-desk__details">
            <summary>Publish eligibility (computed, read-only)</summary>
            <p className="event-coordinator-desk__meta">
              Rules engine only — does not call Mobilize. Rows show whether the shared model passes the
              full Mobilize contract.
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
