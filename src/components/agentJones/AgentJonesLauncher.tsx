export type AgentJonesLauncherProps = {
  panelId: string
  /** When true, the floating panel is open (expanded). */
  panelOpen: boolean
  onToggle: () => void
  /** Optional: hint that there is unread assistant content (e.g. last reply while minimized). */
  hasUnread?: boolean
}

/**
 * Fixed campaign assistant entry control — always visible, safe-area aware, 44px+ touch target.
 */
export default function AgentJonesLauncher({
  panelId,
  panelOpen,
  onToggle,
  hasUnread = false,
}: AgentJonesLauncherProps) {
  return (
    <button
      type="button"
      className="floating-agent-jones-fab"
      aria-expanded={panelOpen}
      aria-controls={panelId}
      aria-label={
        panelOpen
          ? 'Minimize Agent Jones campaign assistant'
          : 'Open Agent Jones campaign assistant'
      }
      onClick={onToggle}
    >
      <span className="floating-agent-jones-fab-mark" aria-hidden>
        J
      </span>
      <span className="floating-agent-jones-fab-text">
        <span className="floating-agent-jones-fab-line1">Agent Jones</span>
        <span className="floating-agent-jones-fab-line2">Campaign assistant</span>
      </span>
      {hasUnread ? (
        <span className="floating-agent-jones-fab-unread" aria-hidden />
      ) : null}
    </button>
  )
}
