import { useId, type ReactNode } from 'react'

export type AgentJonesFloatingPanelProps = {
  id: string
  onRequestClose: () => void
  onRequestClear: () => void
  children: ReactNode
}

/**
 * Floating overlay shell: header, scroll slot (children), safe-area padding.
 */
export default function AgentJonesFloatingPanel({
  id,
  onRequestClose,
  onRequestClear,
  children,
}: AgentJonesFloatingPanelProps) {
  const headingId = useId()
  return (
    <div
      id={id}
      className="floating-agent-jones-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <header className="floating-agent-jones-panel-header">
        <div className="floating-agent-jones-panel-brand">
          <span className="floating-agent-jones-panel-mark" aria-hidden>
            J
          </span>
          <div className="floating-agent-jones-panel-brand-text">
            <span className="floating-agent-jones-panel-title" id={headingId}>
              Agent Jones
            </span>
            <span className="floating-agent-jones-panel-tagline">
              Campaign assistant · workspace-grounded
            </span>
          </div>
        </div>
        <div className="floating-agent-jones-panel-actions">
          <button
            type="button"
            className="floating-agent-jones-header-btn"
            onClick={onRequestClear}
            aria-label="Clear Agent Jones conversation"
          >
            Clear
          </button>
          <button
            type="button"
            className="floating-agent-jones-header-btn floating-agent-jones-header-btn--icon"
            onClick={onRequestClose}
            aria-label="Minimize Agent Jones"
          >
            <span aria-hidden>−</span>
          </button>
          <button
            type="button"
            className="floating-agent-jones-close"
            onClick={onRequestClose}
            aria-label="Close Agent Jones"
          >
            <span className="floating-agent-jones-close-glyph" aria-hidden>
              ×
            </span>
          </button>
        </div>
      </header>
      <div className="floating-agent-jones-panel-body">{children}</div>
    </div>
  )
}
