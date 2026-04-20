import type { AgentJonesDeskSummary } from '../../lib/agentJonesContextV2'

const MODE_LABELS: Record<AgentJonesDeskSummary['recommended_mode'], string> = {
  guide: 'Guide',
  command: 'Command',
  ops: 'Ops',
  task: 'Task',
  calendar: 'Calendar',
  leadership: 'Leadership',
  training: 'Training',
}

export default function AgentJonesSummaryStrip({
  summary,
  taskPressureHeadline,
}: {
  summary: AgentJonesDeskSummary
  /** One-line workload summary (Pass 1 task_pressure.headline). */
  taskPressureHeadline?: string | null
}) {
  const mode = MODE_LABELS[summary.recommended_mode] ?? summary.recommended_mode
  const changeLines = summary.recent_changes.map((s) => s.trim()).filter(Boolean).slice(0, 3)
  const tp = taskPressureHeadline?.trim()

  return (
    <div className="agent-jones-v3-summary-strip">
      <div className="agent-jones-v3-summary-strip-row">
        <span className="agent-jones-v3-mode-pill">{mode}</span>
        <span className="agent-jones-v3-desk-chip">{summary.desk}</span>
      </div>
      <p className="agent-jones-v3-headline">{summary.headline}</p>
      {tp ? (
        <p className="agent-jones-v3-task-pressure" role="status">
          {tp}
        </p>
      ) : null}
      {changeLines.length ? (
        <div
          className="agent-jones-v3-what-changed"
          role="region"
          aria-label="What changed since last visit"
        >
          <p className="agent-jones-v3-what-changed-label">What changed</p>
          <ul className="agent-jones-v3-change-list">
            {changeLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
