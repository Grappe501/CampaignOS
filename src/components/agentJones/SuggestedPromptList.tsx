import type { AgentJonesPrompt } from '../../lib/agentJonesGuidance'

export default function SuggestedPromptList({
  prompts,
  activeId,
  onSelect,
  disabled = false,
}: {
  prompts: AgentJonesPrompt[]
  activeId: string | null
  onSelect: (prompt: AgentJonesPrompt) => void
  /** When true, buttons are inert (e.g. while a live Agent Jones request is in flight). */
  disabled?: boolean
}) {
  return (
    <div
      className="agent-jones-prompt-grid"
      role="group"
      aria-label="Suggested prompts"
    >
      {prompts.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          className={`btn-touch agent-jones-prompt${
            activeId === p.id ? ' agent-jones-prompt-active' : ''
          }`}
          onClick={() => onSelect(p)}
        >
          <span className="agent-jones-prompt-label">{p.label}</span>
          <span className="agent-jones-prompt-arrow" aria-hidden>
            →
          </span>
        </button>
      ))}
    </div>
  )
}
