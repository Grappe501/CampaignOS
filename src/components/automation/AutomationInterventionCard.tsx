import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AutomationActionRow } from '../../lib/automationDomain'

export default function AutomationInterventionCard({
  row,
  children,
}: {
  row: AutomationActionRow
  children?: ReactNode
}) {
  const sev = row.severity
  const chip =
    sev === 'critical'
      ? { bg: 'rgba(220,80,80,0.2)', fg: '#ffb4b4' }
      : sev === 'high'
        ? { bg: 'rgba(255,180,80,0.18)', fg: '#ffd7a8' }
        : { bg: 'rgba(120,160,255,0.15)', fg: '#cfe0ff' }

  return (
    <article
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '0.65rem 0.75rem',
        marginBottom: 8,
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 999,
            background: chip.bg,
            color: chip.fg,
          }}
        >
          {sev}
        </span>
        {row.owner_role_hint ? (
          <span className="subtitle" style={{ fontSize: '0.78rem' }}>
            Owner hint: <strong>{row.owner_role_hint}</strong>
          </span>
        ) : null}
        {row.status === 'awaiting_approval' ? (
          <span className="subtitle" style={{ fontSize: '0.78rem', color: '#ffd7a8' }}>
            Awaiting approval
          </span>
        ) : null}
      </div>
      <h4 style={{ margin: '0.45rem 0 0.25rem', fontSize: '0.95rem' }}>{row.title}</h4>
      <p className="subtitle" style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.35 }}>
        {row.explanation}
      </p>
      <p className="subtitle" style={{ margin: '0.35rem 0 0', fontSize: '0.74rem', opacity: 0.85 }}>
        {row.intervention_kind.replace(/_/g, ' ')} · {row.execution_mode.replace(/_/g, ' ')}
      </p>
      {row.route_path ? (
        <p style={{ margin: '0.5rem 0 0' }}>
          <Link to={row.route_path} className="btn-touch" style={{ fontSize: '0.82rem' }}>
            Open route
          </Link>
        </p>
      ) : null}
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </article>
  )
}
