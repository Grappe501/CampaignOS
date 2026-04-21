import AutomationInterventionCard from './AutomationInterventionCard'
import type { AutomationActionRow } from '../../lib/automationDomain'
import { sortActionsBySeverityThenAge } from '../../lib/automationSelectors'
import { computeAutomationQueueMetrics } from '../../lib/automationMetrics'
import AutomationApprovalsPanel from './AutomationApprovalsPanel'

export default function AutomationQueuePanel({
  rows,
  loading,
  errorMessage,
  canApprove,
  onRefresh,
  onApprove,
  onReject,
  onComplete,
  onDismiss,
  onSnooze24h,
}: {
  rows: readonly AutomationActionRow[]
  loading: boolean
  errorMessage: string | null
  canApprove: boolean
  onRefresh: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onComplete: (id: string) => void
  onDismiss: (id: string) => void
  onSnooze24h: (id: string) => void
}) {
  const sorted = sortActionsBySeverityThenAge([...rows])
  const metrics = computeAutomationQueueMetrics(rows)
  const approvals = sorted.filter((r) => r.status === 'awaiting_approval')
  const rest = sorted.filter((r) => r.status !== 'awaiting_approval')

  return (
    <section
      className="event-coordinator-desk__section"
      id="automation-orchestration-queue"
      aria-labelledby="automation-queue-heading"
      style={{ marginTop: '1rem' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <h2 id="automation-queue-heading" className="event-coordinator-desk__h2" style={{ margin: 0 }}>
          Self-driving orchestration queue
        </h2>
        <button type="button" className="btn-touch" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="subtitle" style={{ marginTop: 6, fontSize: '0.84rem', maxWidth: 720 }}>
        Deterministic rules surface campaign pressure here. Items are auditable in Supabase; execution still
        flows through normal coordinator actions — Agent Jones explains, it does not silently operate the
        system.
      </p>
      {errorMessage ? (
        <p className="seg-cal__banner" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <p className="event-coordinator-desk__meta" role="status">
        Open: <strong>{metrics.open_count}</strong>
        {' · '}
        Snoozed: <strong>{metrics.snoozed_count}</strong>
        {' · '}
        Awaiting approval: <strong>{metrics.awaiting_approval_count}</strong>
        {' · '}
        Critical (non-snoozed): <strong>{metrics.critical_open}</strong>
      </p>

      {approvals.length ? (
        <AutomationApprovalsPanel
          rows={approvals}
          canApprove={canApprove}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null}

      {rest.length ? (
        <div style={{ marginTop: 12 }}>
          {rest.map((row) => (
            <AutomationInterventionCard key={row.id} row={row}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {row.status === 'open' || row.status === 'snoozed' ? (
                  <>
                    <button type="button" className="btn-touch" onClick={() => onComplete(row.id)}>
                      Mark complete
                    </button>
                    <button type="button" className="btn-touch" onClick={() => onSnooze24h(row.id)}>
                      Snooze 24h
                    </button>
                    <button type="button" className="btn-touch" onClick={() => onDismiss(row.id)}>
                      Dismiss
                    </button>
                  </>
                ) : null}
              </div>
            </AutomationInterventionCard>
          ))}
        </div>
      ) : (
        <p className="event-coordinator-desk__meta" role="status">
          No open automation queue rows — triggers will appear when pressure signals cross deterministic
          thresholds.
        </p>
      )}
    </section>
  )
}
