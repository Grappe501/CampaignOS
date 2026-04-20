import { Link } from 'react-router-dom'

const actions: { label: string; to: string; hint: string }[] = [
  { label: 'Users & roles', to: '/admin#admin-users', hint: 'RLS-backed profile slice + policy' },
  { label: 'Exceptions', to: '/admin#admin-exceptions', hint: 'Intervention framing' },
  { label: 'Audit & visibility', to: '/admin#admin-activity', hint: 'Auth + build context' },
  { label: 'Config & integrations', to: '/admin#admin-config', hint: 'Origins & roadmap' },
  { label: 'Task oversight', to: '/admin#admin-tasks', hint: 'Mission + supervisor lanes' },
  { label: 'Event governance', to: '/admin#admin-events', hint: 'Approvals & calendar' },
  { label: 'Field readiness', to: '/admin#admin-geography', hint: 'Geography summary' },
  { label: 'Volunteer workspace', to: '/dashboard', hint: 'Field execution' },
  { label: 'Coordination', to: '/coordinator', hint: 'Supervisor desk' },
  { label: 'Power of 5', to: '/power5', hint: 'Relational graph' },
]

export default function AdminQuickActionsBar() {
  return (
    <nav className="admin-desk-quick-actions" aria-label="Admin quick actions">
      <ul className="admin-desk-quick-actions-list">
        {actions.map((a) => (
          <li key={a.to + a.label}>
            <Link to={a.to} className="admin-desk-quick-actions-link">
              <span className="admin-desk-quick-actions-label">{a.label}</span>
              <span className="admin-desk-quick-actions-hint">{a.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
