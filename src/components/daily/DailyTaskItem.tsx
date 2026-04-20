import type { DailyTaskRow } from '../../hooks/useDailyMission'

const LANE_LABEL: Record<string, string> = {
  communications: 'Communications',
  voter: 'Voter',
  events: 'Events',
  leadership: 'Leadership',
}

export default function DailyTaskItem({
  task,
  busy,
  onComplete,
  onSkip,
}: {
  task: DailyTaskRow
  busy: boolean
  onComplete: (id: string) => void
  onSkip: (id: string) => void
}) {
  const done = task.status === 'completed'
  const skipped = task.status === 'skipped'
  const lane = LANE_LABEL[task.lane] ?? task.lane

  return (
    <li className="daily-task-item">
      <label className="daily-task-item__row">
        <input
          type="checkbox"
          checked={done}
          disabled={busy || skipped || done}
          onChange={() => {
            if (!done && !skipped) onComplete(task.id)
          }}
        />
        <span className="daily-task-item__body">
          <span className="daily-task-item__lane">{lane}</span>
          <span className="daily-task-item__title">{task.title}</span>
          {task.description ? (
            <span className="daily-task-item__desc subtitle">{task.description}</span>
          ) : null}
          <span className="daily-task-item__meta subtitle">+{task.points} pts</span>
        </span>
      </label>
      {!done && !skipped ? (
        <button
          type="button"
          className="btn-touch daily-task-item__skip"
          disabled={busy}
          onClick={() => onSkip(task.id)}
        >
          Skip
        </button>
      ) : skipped ? (
        <span className="subtitle daily-task-item__skipped">Skipped</span>
      ) : null}
    </li>
  )
}
