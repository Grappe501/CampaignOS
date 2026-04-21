import type { AutomationActionRow } from '../../lib/automationDomain'
import { computeAutomationQueueMetrics } from '../../lib/automationMetrics'

/** Compact strip for dashboards — link target should point to coordinator desk automation anchor. */
export default function AutomationPressureSummary({
  rows,
  href = '/events#automation-orchestration-queue',
}: {
  rows: readonly AutomationActionRow[]
  href?: string
}) {
  const m = computeAutomationQueueMetrics(rows)
  if (!rows.length) {
    return (
      <p className="event-coordinator-desk__meta" style={{ margin: 0 }} role="status">
        Orchestration: <strong>clear</strong> (no open queue rows).
      </p>
    )
  }
  return (
    <p className="event-coordinator-desk__meta" style={{ margin: 0 }} role="status">
      Orchestration:{' '}
      <a href={href}>
        <strong>{m.open_count + m.snoozed_count + m.awaiting_approval_count}</strong> open
      </a>
      {m.awaiting_approval_count ? (
        <>
          {' '}
          · <strong>{m.awaiting_approval_count}</strong> need approval
        </>
      ) : null}
      {m.critical_open ? (
        <>
          {' '}
          · <strong>{m.critical_open}</strong> critical
        </>
      ) : null}
    </p>
  )
}
