/**
 * Top + left navigation rails (same controls as the right dock) for dense workspace layouts.
 * Shown at `min-width: 1280px` only; mobile/tablet use the horizontal `WorkspaceDock` strip.
 */
import WorkspaceDockBar, { type WorkspaceDockBarProps } from './workspace/WorkspaceDockBar'

export function DashboardWorkspaceTopRail(props: WorkspaceDockBarProps) {
  return (
    <nav className="workspace-rail workspace-rail--top" aria-label="Workspace (top)">
      <div className="workspace-rail__inner workspace-rail__inner--top">
        <WorkspaceDockBar {...props} layout="horizontal" />
      </div>
    </nav>
  )
}

export function DashboardWorkspaceLeftRail(props: WorkspaceDockBarProps) {
  return (
    <nav className="workspace-rail workspace-rail--left" aria-label="Workspace (left)">
      <div className="workspace-rail__inner workspace-rail__inner--side">
        <WorkspaceDockBar {...props} layout="vertical" />
      </div>
    </nav>
  )
}

/** Fragment of both rails — prefer `TopRail` + `LeftRail` in layout when left must sit beside canvas. */
export default function DashboardNavigationRails(props: WorkspaceDockBarProps) {
  return (
    <>
      <DashboardWorkspaceTopRail {...props} />
      <DashboardWorkspaceLeftRail {...props} />
    </>
  )
}
