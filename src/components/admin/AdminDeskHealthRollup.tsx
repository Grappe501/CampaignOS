import { Link } from 'react-router-dom'

export type DeskHealthState = 'healthy' | 'attention' | 'operational'

export type AdminDeskHealthRow = {
  id: string
  name: string
  path: string
  note: string
  state: DeskHealthState
  /** Session-visible or structural line — no invented org totals. */
  pulse: string
}

export default function AdminDeskHealthRollup({ rows }: { rows: AdminDeskHealthRow[] }) {
  return (
    <div className="admin-desk-health-grid">
      {rows.map((d) => (
        <Link
          key={d.id}
          to={d.path}
          className={`admin-desk-health-card admin-desk-health-card--${d.state}`}
        >
          <span className="admin-desk-health-card__name">{d.name}</span>
          <span className={`admin-desk-health-card__badge admin-desk-health-card__badge--${d.state}`}>
            {d.state === 'healthy'
              ? 'Healthy'
              : d.state === 'attention'
                ? 'Needs attention'
                : 'Operational'}
          </span>
          <span className="admin-desk-health-card__note">{d.note}</span>
          <p className="admin-desk-health-card__pulse" role="note">
            {d.pulse}
          </p>
        </Link>
      ))}
    </div>
  )
}
