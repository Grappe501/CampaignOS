import {
  EVENT_APPROVAL_ROLE_SLUGS,
  EVENT_HARD_GATES,
  EVENT_PERMISSION_KEYS,
  EVENT_ROLE_PERMISSION_MATRIX,
  EVENT_STAGE_TRANSITION_RULES,
  EVENT_TYPE_APPROVAL_PROFILES,
  type EventPermissionKey,
} from '../../lib/eventPermissionsMatrix'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../lib/campaignEventTypeMatrix'

const PERMISSION_LABELS: Record<EventPermissionKey, string> = {
  create_draft: 'Create draft',
  submit_request: 'Submit request',
  approve: 'Approve',
  assign_staffing: 'Assign staffing',
  set_visibility: 'Set visibility',
  publish_mobilize: 'Publish to Mobilize',
  edit_outcomes: 'Edit outcomes',
  close_event: 'Close / archive',
}

function formatCell(c: string): string {
  return c
}

export default function EventPermissionsMatrixPanel({
  variant = 'full',
}: {
  variant?: 'full' | 'compact'
}) {
  const compact = variant === 'compact'

  return (
    <section
      className="event-permissions-matrix"
      aria-labelledby="event-permissions-matrix-heading"
      id="event-permissions-matrix"
    >
      <h2 id="event-permissions-matrix-heading" className="event-coordinator-desk__h2">
        Permissions &amp; approval matrix
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Blueprint 13 — client-side reference for buttons and section editability. Server/RPC
        enforcement should mirror these rules without changing the shape.
      </p>

      <div className="event-permissions-matrix__scroll" role="region" aria-label="Role capability matrix">
        <table className="event-permissions-matrix__table">
          <caption className="sr-only">
            Event permissions by role: yes, limited, conditional, or no
          </caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              {EVENT_PERMISSION_KEYS.map((k) => (
                <th key={k} scope="col">
                  {PERMISSION_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_APPROVAL_ROLE_SLUGS.map((role) => (
              <tr key={role}>
                <th scope="row">{role.replace(/_/g, ' ')}</th>
                {EVENT_PERMISSION_KEYS.map((k) => (
                  <td key={k} className="event-permissions-matrix__cell">
                    {formatCell(EVENT_ROLE_PERMISSION_MATRIX[role][k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact ? (
        <>
          <h3 className="event-detail-card__h3">Stage transition gates</h3>
          <ul className="event-permissions-matrix__rule-list">
            {EVENT_STAGE_TRANSITION_RULES.map((r) => (
              <li key={`${r.from}-${r.to}-${r.allowedRoles.join(',')}`}>
                <strong>
                  {r.from} → {r.to}
                </strong>
                : roles {r.allowedRoles.join(', ')}
                {r.requiresAllFlags?.length
                  ? ` · flags ${r.requiresAllFlags.join(', ')}`
                  : ''}
                {r.notes ? ` — ${r.notes}` : ''}
              </li>
            ))}
          </ul>

          <h3 className="event-detail-card__h3">By event type</h3>
          <ul className="event-permissions-matrix__type-list">
            {EVENT_TYPE_APPROVAL_PROFILES.map((p) => {
              const label =
                CAMPAIGN_EVENT_TYPE_MATRIX.find((t) => t.key === p.eventType)?.label ??
                p.eventType
              return (
                <li key={p.eventType}>
                  <strong>{label}</strong>
                  <ul>
                    <li>Requested by: {p.requestedBy.join(', ')}</li>
                    <li>Approval: {p.requiresApprovalBy.join(', ')}</li>
                    {p.publicPublicationApprovalBy ? (
                      <li>Public publication: {p.publicPublicationApprovalBy.join(', ')}</li>
                    ) : null}
                    {p.candidateInvolvementApprovalBy ? (
                      <li>
                        Candidate involvement: {p.candidateInvolvementApprovalBy.join(', ')}
                      </li>
                    ) : null}
                    {p.followUpOwnership ? (
                      <li>Follow-up ownership: {p.followUpOwnership.join(', ')}</li>
                    ) : null}
                    {p.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>

          <h3 className="event-detail-card__h3">Hard gates</h3>
          <dl className="event-permissions-matrix__gates">
            {Object.entries(EVENT_HARD_GATES).map(([key, g]) => (
              <div key={key}>
                <dt>{g.title}</dt>
                <dd>
                  <ul>
                    {g.requirements.map((req) => (
                      <li key={req}>{req}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </section>
  )
}
