/**
 * Workspace navigator: horizontal strip on phone/tablet; fixed right rail on wide screens.
 * Shares button chrome with `WorkspaceDockBar` (top/left rails on dashboard).
 */
import WorkspaceDockBar, { type WorkspaceDockBarProps } from './workspace/WorkspaceDockBar'

export default function WorkspaceDock(props: WorkspaceDockBarProps) {
  return (
    <nav className="workspace-dock workspace-dock--right" aria-label="Workspace sections">
      <WorkspaceDockBar {...props} layout="horizontal" />
    </nav>
  )
}
