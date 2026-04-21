import AutomationInterventionCard from './AutomationInterventionCard'
import type { AutomationActionRow } from '../../lib/automationDomain'

export default function AutomationApprovalsPanel({
  rows,
  canApprove,
  onApprove,
  onReject,
}: {
  rows: readonly AutomationActionRow[]
  canApprove: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (!rows.length) return null
  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="event-coordinator-desk__h2" style={{ fontSize: '1rem', marginBottom: 8 }}>
        Approvals required
      </h3>
      {rows.map((row) => (
        <AutomationInterventionCard key={row.id} row={row}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn-touch"
              disabled={!canApprove}
              onClick={() => onApprove(row.id)}
              title={!canApprove ? 'Requires coordinator or admin role' : undefined}
            >
              Approve action
            </button>
            <button
              type="button"
              className="btn-touch"
              disabled={!canApprove}
              onClick={() => onReject(row.id)}
            >
              Reject
            </button>
          </div>
        </AutomationInterventionCard>
      ))}
    </div>
  )
}
