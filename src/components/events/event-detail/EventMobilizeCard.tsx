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
import type { MobilizeEligibilityResult } from '../../../lib/mobilizePublishEligibility'

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
}

export default function EventMobilizeCard({
  record,
  typeDef,
  eligibility,
  mobilizeContract,
}: EventMobilizeCardProps) {
  return (
    <section
      className="event-coordinator-desk__section event-detail-card"
      id="event-mobilize"
      aria-labelledby="event-mobilize-heading"
    >
      <h2 id="event-mobilize-heading" className="event-coordinator-desk__h2">
        Mobilize promotion &amp; sync
      </h2>
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
      {record?.mobilize_last_error ? (
        <p className="event-record-desk__sync-error" role="alert">
          <strong>Last sync error.</strong> {record.mobilize_last_error}
        </p>
      ) : null}
      {record?.mobilize_update_needed ? (
        <p className="event-record-desk__sync-warn" role="status">
          <strong>Update needed.</strong> Republish when server integration is available.
        </p>
      ) : null}

      <p className="event-coordinator-desk__meta">
        Controls (publish / update / archive): staged — call Netlify/Supabase functions when wired.
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
