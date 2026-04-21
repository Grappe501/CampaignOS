type Attention = 'ok' | 'warn' | 'urgent' | 'info'

const MAP: Record<Attention, { className: string; label: string }> = {
  ok: { className: 'cm-cockpit-sphere--ok', label: 'Healthy' },
  warn: { className: 'cm-cockpit-sphere--warn', label: 'Watch' },
  urgent: { className: 'cm-cockpit-sphere--urgent', label: 'Urgent' },
  info: { className: 'cm-cockpit-sphere--info', label: 'Active' },
}

type Props = {
  attention: Attention
  title: string
  onToggleFullscreen: () => void
  fullscreenActive: boolean
}

/**
 * Signature “bridge” control — expands module workspace (spec: sphere interaction).
 */
export default function CockpitFullscreenSphere({
  attention,
  title,
  onToggleFullscreen,
  fullscreenActive,
}: Props) {
  const m = MAP[attention]
  return (
    <button
      type="button"
      className={`cm-cockpit-sphere ${m.className} ${fullscreenActive ? 'is-active' : ''}`}
      title={`${fullscreenActive ? 'Exit' : 'Command'} fullscreen — ${title}`}
      aria-pressed={fullscreenActive}
      onClick={onToggleFullscreen}
    >
      <span className="cm-cockpit-sphere__core" aria-hidden />
      <span className="visually-hidden">{m.label}</span>
    </button>
  )
}
