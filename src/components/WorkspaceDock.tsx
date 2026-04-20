/**
 * Compact vertical dock for large screens: jump to workspace regions.
 * Future: open additional tool panels (multi-window layout).
 */
const ITEMS = [
  { id: 'dash-identity-title', label: 'Top' },
  { id: 'voter-workspace', label: 'Voter' },
  { id: 'workspace-cards', label: 'Tasks' },
  { id: 'agent-jones', label: 'Agent' },
] as const

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function WorkspaceDock() {
  return (
    <nav
      className="workspace-dock"
      aria-label="Workspace sections"
    >
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="workspace-dock-btn"
          onClick={() => scrollToId(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
