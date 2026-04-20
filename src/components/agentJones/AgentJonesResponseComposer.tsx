import type { AgentJonesSurface } from '../../lib/agentJonesContextV2'

const PLACEHOLDER: Record<AgentJonesSurface, string> = {
  volunteer_dashboard:
    'Ask about missions, roster, or your next field step (max 600 characters)…',
  intern_desk: 'Ask about pipeline, first contacts, or follow-ups…',
  coordinator_desk: 'Ask about blocked lanes, overdue rows, or intern risk…',
  candidate_desk: 'Ask about KPI health, narrative, or leadership focus…',
  admin_desk: 'Ask about exceptions, desk health, or governance reads…',
}

export type AgentJonesResponseComposerProps = {
  id: string
  surface: AgentJonesSurface
  value: string
  disabled: boolean
  onChange: (v: string) => void
  onSend: () => void
}

export default function AgentJonesResponseComposer({
  id,
  surface,
  value,
  disabled,
  onChange,
  onSend,
}: AgentJonesResponseComposerProps) {
  return (
    <div className="agent-jones-compose">
      <p className="agent-jones-compose-label">Compose</p>
      <p className="agent-jones-compose-hint">
        One message at a time — grounded in the operating strip above. No attachments.
      </p>
      <label className="sr-only" htmlFor={id}>
        Message to Agent Jones
      </label>
      <textarea
        id={id}
        className="agent-jones-draft-input input-stretch"
        rows={3}
        maxLength={600}
        value={value}
        placeholder={PLACEHOLDER[surface]}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn-touch btn-primary agent-jones-send-btn"
        disabled={disabled || !value.trim()}
        onClick={onSend}
      >
        Send
      </button>
    </div>
  )
}
