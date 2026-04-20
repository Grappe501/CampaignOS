import { Link } from 'react-router-dom'
import type { CoordinatorAssignmentBuckets } from '../../lib/coordinatorDeskData'

export default function AdminTaskCommandCenter({
  tasksLoading,
  tasksError,
  activeAssignmentCount,
  stalledCount,
  nextBestTitle,
  recentDoneCount,
  engagementReadiness,
  dailyLoading,
  dailyError,
  dailyCompleted,
  dailyTotal,
  dailyNextTitle,
  hasSupervisorScope,
  coordinatorBuckets,
  coordinatorDeskLoading,
  coordinatorDeskError,
}: {
  tasksLoading: boolean
  tasksError: string | null
  activeAssignmentCount: number
  stalledCount: number
  nextBestTitle: string | null
  recentDoneCount: number
  engagementReadiness: number | null | undefined
  dailyLoading: boolean
  dailyError: string | null
  dailyCompleted: number
  dailyTotal: number
  dailyNextTitle: string | null
  hasSupervisorScope: boolean
  coordinatorBuckets: CoordinatorAssignmentBuckets | null
  coordinatorDeskLoading: boolean
  coordinatorDeskError: string | null
}) {
  return (
    <div className="admin-desk-command-grid">
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Volunteer assignments (this session)</h3>
        {tasksLoading ? (
          <p className="subtitle">Loading assignment feed…</p>
        ) : tasksError ? (
          <p className="subtitle" role="alert">
            {tasksError}
          </p>
        ) : (
          <ul className="admin-desk-list">
            <li>
              Active: <strong>{activeAssignmentCount}</strong>
            </li>
            <li>
              Blocked: <strong>{stalledCount}</strong>
            </li>
            <li>
              Next up: <strong>{nextBestTitle ?? '—'}</strong>
            </li>
            <li>
              Recent completions in window: <strong>{recentDoneCount}</strong>
            </li>
            {engagementReadiness != null ? (
              <li>
                Engagement readiness index: <strong>{engagementReadiness}</strong>
              </li>
            ) : null}
          </ul>
        )}
        <p className="admin-desk-panel-note">
          <Link to="/dashboard#mission-tasks">Open mission tasks</Link>
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Daily activation (this session)</h3>
        {dailyLoading ? (
          <p className="subtitle">Loading daily lane…</p>
        ) : dailyError ? (
          <p className="subtitle" role="alert">
            {dailyError}
          </p>
        ) : (
          <ul className="admin-desk-list">
            <li>
              Completed today:{' '}
              <strong>
                {dailyCompleted}/{Math.max(dailyTotal, 1)}
              </strong>
            </li>
            <li>
              Next task: <strong>{dailyNextTitle ?? '—'}</strong>
            </li>
          </ul>
        )}
        <p className="admin-desk-panel-note">
          <Link to="/dashboard#daily-activation">Open daily activation</Link>
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Supervisor lanes (this session)</h3>
        {coordinatorDeskLoading ? (
          <p className="subtitle">Loading coordination scope…</p>
        ) : coordinatorDeskError ? (
          <p className="subtitle" role="alert">
            {coordinatorDeskError}
          </p>
        ) : !hasSupervisorScope ? (
          <p className="subtitle">
            No supervised-team scope on this login. Open Coordination from an account with supervisor
            coverage to see blocked, overdue, and in-progress mission lanes here.
          </p>
        ) : coordinatorBuckets ? (
          <ul className="admin-desk-list">
            <li>
              Blocked: <strong>{coordinatorBuckets.blocked.length}</strong>
            </li>
            <li>
              Overdue: <strong>{coordinatorBuckets.overdue.length}</strong>
            </li>
            <li>
              In progress: <strong>{coordinatorBuckets.inProgress.length}</strong>
            </li>
            <li>
              Assigned (not started): <strong>{coordinatorBuckets.assigned.length}</strong>
            </li>
          </ul>
        ) : null}
        <p className="admin-desk-panel-note">
          <Link to="/coordinator">Open coordination desk</Link>
        </p>
      </div>
    </div>
  )
}
