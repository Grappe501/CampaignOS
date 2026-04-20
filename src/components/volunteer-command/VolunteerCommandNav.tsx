import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/volunteers/me', label: 'My volunteer hub' },
  { to: '/volunteers/team-lead', label: 'Team lead' },
  { to: '/volunteers/command', label: 'Coordinator' },
] as const

export default function VolunteerCommandNav() {
  const loc = useLocation()
  return (
    <nav className="volunteer-command-nav" aria-label="Volunteer command">
      <ul className="volunteer-command-nav__list">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className={
                loc.pathname === l.to || loc.pathname.startsWith(l.to + '/')
                  ? 'btn-touch is-active'
                  : 'btn-touch btn-touch--ghost'
              }
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
