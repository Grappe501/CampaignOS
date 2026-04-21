import { Link } from 'react-router-dom'
import type { GotvInterventionHint } from '../../lib/gotvInterventions'

export default function GotvInterventionQueue({ hints }: { hints: readonly GotvInterventionHint[] }) {
  if (!hints.length) {
    return (
      <p className="event-coordinator-desk__meta" role="status">
        No automated intervention hints — sites look covered in this snapshot or data is still loading.
      </p>
    )
  }
  return (
    <ul className="event-panel__list" style={{ listStyle: 'none', padding: 0 }}>
      {hints.map((h) => (
        <li
          key={`${h.kind}-${h.title}`}
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '0.6rem 0.75rem',
            marginBottom: 8,
          }}
        >
          <strong>{h.title}</strong>
          <p className="subtitle" style={{ margin: '0.25rem 0', fontSize: '0.82rem' }}>
            {h.explanation}
          </p>
          <Link to={h.route_path} className="btn-touch" style={{ fontSize: '0.8rem' }}>
            Open route
          </Link>
        </li>
      ))}
    </ul>
  )
}
