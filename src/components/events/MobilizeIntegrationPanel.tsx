import {
  MOBILIZE_API_BASE_URL,
  MOBILIZE_INTEGRATION_PHASES,
  MOBILIZE_PRODUCT_POSTURE,
  MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS,
  MOBILIZE_PUBLISHABLE_EXTRA_LABELS,
  MOBILIZE_PUBLISH_ELIGIBILITY_RULES,
  MOBILIZE_SYNC_FIELD_KEYS,
  MOBILIZE_TYPICALLY_PRIVATE_EVENT_TYPE_KEYS,
  MOBILIZE_TYPICALLY_PRIVATE_EXTRA_LABELS,
  MOBILIZE_WORKFLOW_STATUSES,
  mobilizePublishableLabelForTypeKey,
} from '../../lib/mobilizeIntegration'

export default function MobilizeIntegrationPanel({
  variant = 'full',
}: {
  variant?: 'full' | 'compact'
}) {
  if (variant === 'compact') {
    return (
      <div className="mobilize-plan mobilize-plan--compact">
        <p className="mobilize-plan__lede">
          <strong>Mobilize</strong> is the public listing/RSVP surface;{' '}
          <strong>CampaignOS</strong> keeps workflow, staffing, and follow-up. Sync fields and
          queue UI ship in Phase 1 — credentials stay server-side only (
          <code>{MOBILIZE_API_BASE_URL}</code>).
        </p>
      </div>
    )
  }

  return (
    <section className="mobilize-plan" aria-labelledby="mobilize-plan-heading">
      <h2 id="mobilize-plan-heading" className="event-coordinator-desk__h2">
        Mobilize integration
      </h2>
      <p className="mobilize-plan__lede">
        Public API base: <code>{MOBILIZE_API_BASE_URL}</code> — bearer auth for protected routes;
        use server-side or Edge functions only for tokens.
      </p>

      <details className="mobilize-plan__details" open>
        <summary>Product posture</summary>
        <ul className="mobilize-plan__list">
          <li>
            <strong>CampaignOS:</strong> {MOBILIZE_PRODUCT_POSTURE.campaignos}
          </li>
          <li>
            <strong>Mobilize:</strong> {MOBILIZE_PRODUCT_POSTURE.mobilize}
          </li>
          <li>
            <strong>Rule:</strong> {MOBILIZE_PRODUCT_POSTURE.never}
          </li>
        </ul>
      </details>

      <details className="mobilize-plan__details">
        <summary>Publish eligibility (all required)</summary>
        <ol className="mobilize-plan__list mobilize-plan__list--ordered">
          {MOBILIZE_PUBLISH_ELIGIBILITY_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </details>

      <details className="mobilize-plan__details">
        <summary>Event types — usually publishable vs usually private</summary>
        <div className="mobilize-plan__cols">
          <div>
            <h3 className="mobilize-plan__h3">Often publishable</h3>
            <ul className="mobilize-plan__list">
              {MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS.map((k) => (
                <li key={k}>{mobilizePublishableLabelForTypeKey(k)}</li>
              ))}
              {MOBILIZE_PUBLISHABLE_EXTRA_LABELS.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mobilize-plan__h3">Often not publishable</h3>
            <ul className="mobilize-plan__list">
              {MOBILIZE_TYPICALLY_PRIVATE_EVENT_TYPE_KEYS.map((k) => (
                <li key={k}>{mobilizePublishableLabelForTypeKey(k)}</li>
              ))}
              {MOBILIZE_TYPICALLY_PRIVATE_EXTRA_LABELS.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <details className="mobilize-plan__details">
        <summary>Integration directions</summary>
        <ul className="mobilize-plan__list">
          <li>
            <strong>CampaignOS → Mobilize:</strong> push structured public-eligible events.
          </li>
          <li>
            <strong>Mobilize → CampaignOS:</strong> pull id, URL, publish status, updates, RSVP
            summaries, sync errors.
          </li>
          <li>
            <strong>Dashboard:</strong> publish, unpublish/archive, update listing, sync status,
            open public URL, tag mapping.
          </li>
        </ul>
      </details>

      <details className="mobilize-plan__details">
        <summary>Suggested sync fields</summary>
        <ul className="mobilize-plan__chips">
          {MOBILIZE_SYNC_FIELD_KEYS.map((k) => (
            <li key={k}>
              <code>{k}</code>
            </li>
          ))}
        </ul>
      </details>

      <details className="mobilize-plan__details">
        <summary>Workflow states</summary>
        <p className="mobilize-plan__meta">{MOBILIZE_WORKFLOW_STATUSES.join(' · ')}</p>
        <p className="mobilize-plan__meta">
          Align with calendar <code>mobilize_publish_state</code> when the events table lands;
          this list is the target granularity.
        </p>
      </details>

      <div className="mobilize-plan__phases">
        <h3 className="mobilize-plan__h3">Rollout phases</h3>
        {MOBILIZE_INTEGRATION_PHASES.map((p) => (
          <div key={p.phase} className="mobilize-plan__phase">
            <p className="mobilize-plan__phase-title">
              {p.title}
            </p>
            <ul className="mobilize-plan__list">
              {p.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mobilize-plan__note" role="note">
        If the campaign uses VAN/EveryAction, Mobilize can sync events, people, and signups into VAN
        in real time — treat Mobilize-authored events as the edit source on that side; CampaignOS
        remains authoritative for internally planned workflow until you define conflict rules.
      </p>
    </section>
  )
}
