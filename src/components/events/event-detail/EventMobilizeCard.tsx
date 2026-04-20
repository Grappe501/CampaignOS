import { useCallback, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  mobilizeGuidanceLabel,
  type CampaignEventTypeDefinition,
} from '../../../lib/campaignEventTypeMatrix'
import type {
  EventMobilizeMeta,
  MobilizeEligibility,
  MobilizePublishPayload,
  MobilizeStatusSummary,
} from '../../../lib/mobilizeFieldMapping'
import {
  MOBILIZE_PUBLIC_COPY_FIELD_KEYS,
  MOBILIZE_PUBLISH_ELIGIBILITY_RULES,
  MOBILIZE_SYNC_FIELD_KEYS,
} from '../../../lib/mobilizeIntegration'
import {
  MOBILIZE_QUEUE_LANE_DESCRIPTIONS,
  MOBILIZE_QUEUE_LANE_LABELS,
  coordinatorMobilizeLaneForRecord,
} from '../../../lib/mobilizeQueueModel'
import type { MobilizeEligibilityResult } from '../../../lib/mobilizePublishEligibility'
import {
  applyMobilizeCheckSyncToRecord,
  applyMobilizeMutationToRecord,
  applyMobilizeRefreshToRecord,
  MobilizeServerError,
  postMobilizeEventAction,
} from '../../../lib/api/mobilizeEvents'
import { supabase } from '../../../lib/supabaseClient'

type EventMobilizeCardProps = {
  record: CampaignCalendarEventRecord | null
  typeDef: CampaignEventTypeDefinition | undefined
  eligibility: MobilizeEligibilityResult
  mobilizeContract?: {
    extended: MobilizeEligibility
    summary: MobilizeStatusSummary
    meta: EventMobilizeMeta
    publishPayload: MobilizePublishPayload
  } | null
  onApplyRecordPatch?: (patch: Partial<CampaignCalendarEventRecord>) => void
}

export default function EventMobilizeCard({
  record,
  typeDef,
  eligibility,
  mobilizeContract,
  onApplyRecordPatch,
}: EventMobilizeCardProps) {
  const coordinatorLane = record ? coordinatorMobilizeLaneForRecord(record) : null
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const formatWhen = (iso: string | null | undefined): string => {
    if (!iso?.trim()) return '—'
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return iso
    }
  }

  const runAction = useCallback(
    async (kind: 'publish' | 'update' | 'check_sync' | 'refresh_remote') => {
      if (!record?.event_id || !onApplyRecordPatch) return
      setActionError(null)
      setActionSuccess(null)
      setBusy(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setActionError('Sign in required — Mobilize actions use your Supabase session only (no Mobilize secrets in the browser).')
          return
        }
        const res = await postMobilizeEventAction(token, kind, record.event_id)
        if (res.action === 'check_sync') {
          onApplyRecordPatch(applyMobilizeCheckSyncToRecord(res))
          setActionSuccess(
            res.hasRemoteMobilizeEvent
              ? res.updateNeeded
                ? 'CampaignOS fields differ from the last successful publish — push an update when ready.'
                : 'Local row matches the last published sync hash.'
              : (res.detail ?? 'check_sync completed.'),
          )
        } else if (res.action === 'refresh_remote') {
          const patch = applyMobilizeRefreshToRecord(res)
          if (Object.keys(patch).length > 0) onApplyRecordPatch(patch)
          setActionSuccess(
            res.linkStatus === 'not_linked'
              ? (res.detail ?? 'Not linked to Mobilize yet.')
              : res.recoveredFromError
                ? 'Mobilize responded OK — cleared stale last_error. Verify drift / push update if needed.'
                : `Pulled Mobilize metadata.${res.remoteModifiedAt ? ` Remote modified ${formatWhen(res.remoteModifiedAt)}.` : ''}`,
          )
        } else {
          onApplyRecordPatch(applyMobilizeMutationToRecord(res))
          setActionSuccess(
            res.action === 'publish'
              ? `Published to Mobilize (event id ${res.mobilizeEventId}).${res.warning ? ` Note: ${res.warning}` : ''}`
              : `Mobilize event updated.${res.warning ? ` Note: ${res.warning}` : ''}`,
          )
        }
      } catch (e) {
        if (e instanceof MobilizeServerError) {
          const blockers = e.body.blockingReasons
          setActionError(
            blockers?.length
              ? `${e.message}: ${blockers.join('; ')}`
              : e.body.detail ?? e.message,
          )
        } else {
          setActionError(e instanceof Error ? e.message : 'Request failed.')
        }
      } finally {
        setBusy(false)
      }
    },
    [onApplyRecordPatch, record],
  )

  const canPublish =
    Boolean(record?.event_id) &&
    Boolean(mobilizeContract?.extended.isEligible) &&
    !record?.mobilize_event_id
  const canUpdate = Boolean(record?.event_id && record.mobilize_event_id)
  const canCheckSync = Boolean(record?.event_id && record.mobilize_event_id)
  const canRefreshRemote = Boolean(record?.event_id && record.mobilize_event_id?.trim())

  const promoStatusClass =
    record?.mobilize_publish_state === 'sync_error'
      ? 'event-mobilize__promo-status--error'
      : record?.mobilize_update_needed ||
          String(record?.mobilize_publish_state ?? '') === 'update_required'
        ? 'event-mobilize__promo-status--warn'
        : record?.mobilize_publish_state === 'published'
          ? 'event-mobilize__promo-status--ok'
          : 'event-mobilize__promo-status--neutral'

  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-mobilize"
      aria-labelledby="event-mobilize-heading"
    >
      <h2 id="event-mobilize-heading" className="event-coordinator-desk__h2">
        Mobilize promotion &amp; sync
      </h2>
      {coordinatorLane ? (
        <div className="event-mobilize__lane-strip" role="region" aria-label="Mobilize queue lane">
          <p className="event-mobilize__lane-label">
            <span className="event-mobilize__lane-k">Coordinator lane</span>{' '}
            <strong className="event-mobilize__lane-v">
              {MOBILIZE_QUEUE_LANE_LABELS[coordinatorLane]}
            </strong>
          </p>
          <p className="event-mobilize__lane-desc">
            {MOBILIZE_QUEUE_LANE_DESCRIPTIONS[coordinatorLane]}
          </p>
          <p className="event-coordinator-desk__meta">
            Raw <code>mobilize_publish_state</code>:{' '}
            <code>{String(record?.mobilize_publish_state ?? '—')}</code>
          </p>
        </div>
      ) : null}

      {record ? (
        <div
          className="event-mobilize__promo-strip"
          role="region"
          aria-label="Public promotion status"
        >
          <h3 className="event-detail-card__h3">Public promotion status</h3>
          <p className={`event-mobilize__promo-status ${promoStatusClass}`}>
            {record.mobilize_publish_state === 'sync_error'
              ? 'Sync error — fix and use refresh from Mobilize or push update.'
              : record.mobilize_update_needed ||
                  String(record.mobilize_publish_state ?? '') === 'update_required'
                ? 'Update required — CampaignOS fields likely ahead of Mobilize.'
                : record.mobilize_publish_state === 'published'
                  ? 'Published — listing should be live if Mobilize approved the event.'
                  : 'Not live on Mobilize for this row state — see eligibility below.'}
          </p>
          <dl className="event-record-desk__sync-dl event-mobilize__promo-dl">
            <div>
              <dt>Public URL</dt>
              <dd>
                {record.mobilize_public_url ? (
                  <a href={record.mobilize_public_url} target="_blank" rel="noreferrer">
                    {record.mobilize_public_url}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Last successful sync (push)</dt>
              <dd>{formatWhen(record.mobilize_last_synced_at)}</dd>
            </div>
            <div>
              <dt>Mobilize last modified (remote)</dt>
              <dd>
                {formatWhen(record.mobilize_remote_modified_at)}
                {!record.mobilize_remote_modified_at ? (
                  <span className="event-mobilize__promo-hint">
                    {' '}
                    — run <strong>Refresh from Mobilize</strong> after linking to capture this.
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Update / drift flag</dt>
              <dd>
                {record.mobilize_update_needed ||
                String(record.mobilize_publish_state ?? '') === 'update_required'
                  ? 'Yes'
                  : 'No'}
              </dd>
            </div>
          </dl>
          {record.mobilize_last_error ? (
            <p className="event-record-desk__sync-error event-mobilize__promo-error" role="alert">
              <strong>Last sync error.</strong> {record.mobilize_last_error}
            </p>
          ) : null}
          <p className="event-coordinator-desk__meta">
            RSVP and attendee counts are <strong>not</strong> synced from Mobilize in this pass — only
            event metadata and health you see here.
          </p>
        </div>
      ) : null}
      {typeDef ? (
        <p className="event-record-desk__purpose">
          <strong>{mobilizeGuidanceLabel(typeDef.mobilizeGuidance)}.</strong> {typeDef.mobilizeNote}
        </p>
      ) : null}
      <p className="event-coordinator-desk__meta">Publish eligibility (local rules engine):</p>
      <div className="event-record-desk__table-wrap">
        <table className="event-record-desk__table">
          <caption className="sr-only">Eligibility checks</caption>
          <thead>
            <tr>
              <th scope="col">Rule</th>
              <th scope="col">Status</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {eligibility.checks.map((c) => (
              <tr key={c.ruleIndex}>
                <td>{c.ruleLabel}</td>
                <td>{c.pass ? 'Pass' : 'Fail'}</td>
                <td>{c.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="event-record-desk__purpose">
        <strong>Summary (six-rule engine):</strong>{' '}
        {eligibility.eligible
          ? 'Passes the base checks — see blueprint-12 contract below for finance/public-copy gates.'
          : `Blocked: ${eligibility.blockers.length} rule(s).`}
      </p>

      {mobilizeContract ? (
        <>
          <h3 className="event-detail-card__h3">Field-mapping contract (blueprint 12)</h3>
          <dl className="event-record-desk__sync-dl">
            <div>
              <dt>Normalized sync state</dt>
              <dd>{mobilizeContract.summary.state.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt>Publish mode</dt>
              <dd>{mobilizeContract.extended.publishMode.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt>Eligible for Mobilize (full contract)</dt>
              <dd>{mobilizeContract.extended.isEligible ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Config tags (when synced)</dt>
              <dd>
                {mobilizeContract.meta.mobilizeTagsSynced?.length
                  ? mobilizeContract.meta.mobilizeTagsSynced.join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Public URL</dt>
              <dd>
                {mobilizeContract.summary.publicUrl ? (
                  <a
                    href={mobilizeContract.summary.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {mobilizeContract.summary.publicUrl}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Update required</dt>
              <dd>{mobilizeContract.summary.updateRequired ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          {!mobilizeContract.extended.isEligible ? (
            <ul className="event-record-desk__path-list">
              {mobilizeContract.extended.blockingReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <ul className="event-record-desk__path-list">
              {mobilizeContract.extended.reasonsEligible.slice(0, 6).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <details className="event-coordinator-desk__details">
            <summary>Sample Mobilize publish payload (derived)</summary>
            <pre className="event-record-desk__pre-json">
              {JSON.stringify(mobilizeContract.publishPayload, null, 2)}
            </pre>
          </details>
        </>
      ) : null}

      <h3 className="event-detail-card__h3">Public copy fields</h3>
      <p className="event-coordinator-desk__meta">
        Internal title/notes stay separate; these columns feed{' '}
        <code>buildMobilizePublishPayload</code>.
      </p>
      <dl className="event-record-desk__sync-dl">
        {MOBILIZE_PUBLIC_COPY_FIELD_KEYS.map((key) => {
          const v = record ? (record as Record<string, unknown>)[key] : undefined
          const display =
            v === null || v === undefined || v === '' ? '—' : String(v)
          return (
            <div key={key}>
              <dt>
                <code>{key}</code>
              </dt>
              <dd>{display}</dd>
            </div>
          )
        })}
      </dl>

      <h3 className="event-detail-card__h3">Sync facet</h3>
      <p className="event-coordinator-desk__placeholder">
        Values only from loaded rows — no client tokens or API calls.
      </p>
      <dl className="event-record-desk__sync-dl">
        {MOBILIZE_SYNC_FIELD_KEYS.map((key) => {
          const v = record ? (record as Record<string, unknown>)[key] : undefined
          const display =
            v === null || v === undefined || v === ''
              ? '—'
              : typeof v === 'boolean'
                ? v
                  ? 'true'
                  : 'false'
                : String(v)
          return (
            <div key={key}>
              <dt>
                <code>{key}</code>
              </dt>
              <dd>{display}</dd>
            </div>
          )
        })}
      </dl>
      {record?.mobilize_update_needed ? (
        <p className="event-record-desk__sync-warn" role="status">
          <strong>Update needed.</strong> Push an update to Mobilize or use check sync after editing
          public fields.
        </p>
      ) : null}

      {onApplyRecordPatch && record?.event_id ? (
        <div className="event-mobilize__actions" role="region" aria-label="Mobilize server actions">
          <h3 className="event-detail-card__h3">Server actions</h3>
          <p className="event-coordinator-desk__meta">
            Calls <code>/.netlify/functions/mobilize-events</code> with your session token. Mobilize
            API keys stay on the server. Create/update endpoints are{' '}
            <strong>RESTRICTED</strong> — Mobilize must grant your org access.
          </p>
          <div className="event-mobilize__action-row">
            <button
              type="button"
              className="btn-touch btn-touch--ghost"
              disabled={busy || !canPublish}
              onClick={() => void runAction('publish')}
            >
              Publish to Mobilize
            </button>
            <button
              type="button"
              className="btn-touch btn-touch--ghost"
              disabled={busy || !canUpdate}
              onClick={() => void runAction('update')}
            >
              Push update
            </button>
            <button
              type="button"
              className="btn-touch btn-touch--ghost"
              disabled={busy || !canCheckSync}
              onClick={() => void runAction('check_sync')}
            >
              Check sync / drift
            </button>
            <button
              type="button"
              className="btn-touch btn-touch--ghost"
              disabled={busy || !canRefreshRemote}
              onClick={() => void runAction('refresh_remote')}
            >
              Refresh from Mobilize
            </button>
          </div>
          <p className="event-coordinator-desk__meta">
            Publish is only enabled when eligible and no <code>mobilize_event_id</code> is on the
            row. <strong>Refresh</strong> runs a real GET to Mobilize, updates the public URL when it
            changed, clears <code>last_error</code> on success, and re-checks hash drift. Dev
            fixtures merge server responses in-memory; Supabase-backed rows persist via the sync
            table.
          </p>
        </div>
      ) : null}

      {actionError ? (
        <p className="event-record-desk__sync-error" role="alert">
          <strong>Action failed.</strong> {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="event-record-desk__sync-ok" role="status">
          <strong>Done.</strong> {actionSuccess}
        </p>
      ) : null}

      <p className="event-coordinator-desk__meta">
        Archive / delete on Mobilize is <strong>not implemented</strong> — the server returns{' '}
        <code>501</code> for <code>archive</code>.
      </p>

      <details className="event-coordinator-desk__details">
        <summary>Policy text</summary>
        <ul className="event-record-desk__path-list">
          {MOBILIZE_PUBLISH_ELIGIBILITY_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
