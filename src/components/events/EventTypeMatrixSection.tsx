import {
  CAMPAIGN_EVENT_STAGES,
  CAMPAIGN_EVENT_TYPE_MATRIX,
  CAMPAIGN_EVENT_TYPES_UPCOMING,
  EVENT_COORDINATOR_OWNER_ROLES,
  mobilizeGuidanceLabel,
} from '../../lib/campaignEventTypeMatrix'

const STAGE_LABELS: Record<string, string> = {
  request_idea: 'Request / idea',
  qualification: 'Qualification',
  approval: 'Approval',
  planning: 'Planning',
  staffing: 'Staffing',
  promotion: 'Promotion',
  execution: 'Execution',
  follow_up: 'Follow-up',
  reporting_archive: 'Reporting / archive',
}

export default function EventTypeMatrixSection() {
  return (
    <section
      className="event-type-matrix"
      aria-labelledby="event-type-matrix-heading"
    >
      <h2 id="event-type-matrix-heading" className="event-coordinator-desk__h2">
        Event type paths &amp; task matrix
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Each type uses the same lifecycle stages with different approvals, staffing, logistics,
        promotion, and follow-up. Task templates will attach here in a later pass.
      </p>

      <details className="event-type-matrix__details">
        <summary className="event-type-matrix__summary">Common stages (all types)</summary>
        <ol className="event-type-matrix__stage-list">
          {CAMPAIGN_EVENT_STAGES.map((s) => (
            <li key={s}>{STAGE_LABELS[s] ?? s}</li>
          ))}
        </ol>
      </details>

      <details className="event-type-matrix__details">
        <summary className="event-type-matrix__summary">Suggested owner roles</summary>
        <p className="event-type-matrix__roles">
          {EVENT_COORDINATOR_OWNER_ROLES.map((r) => r.replace(/_/g, ' ')).join(' · ')}
        </p>
      </details>

      <div className="event-type-matrix__types">
        {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
          <details key={t.key} className="event-type-matrix__type">
            <summary className="event-type-matrix__type-summary">
              <span className="event-type-matrix__type-label">{t.label}</span>
              <span className="event-type-matrix__type-mob">
                {mobilizeGuidanceLabel(t.mobilizeGuidance)}
              </span>
            </summary>
            <p className="event-type-matrix__purpose">
              <strong>Purpose.</strong> {t.purpose}
            </p>
            <p className="event-type-matrix__mob-note">{t.mobilizeNote}</p>
            <div className="event-type-matrix__cols">
              <div>
                <h3 className="event-type-matrix__h3">Required path</h3>
                <ul>
                  {t.requiredPath.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="event-type-matrix__h3">Required tasks</h3>
                <ul>
                  {t.requiredTasks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="event-type-matrix__h3">Common risks</h3>
                <ul>
                  {t.commonRisks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </div>

      <details className="event-type-matrix__details">
        <summary className="event-type-matrix__summary">Additional types (roadmap)</summary>
        <ul className="event-type-matrix__upcoming">
          {CAMPAIGN_EVENT_TYPES_UPCOMING.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
