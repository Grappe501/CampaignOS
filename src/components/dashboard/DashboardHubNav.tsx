import { Link, useLocation } from 'react-router-dom'
import type { CampaignProfile } from '../../hooks/useProfile'

/** Compact way to jump between major shells — central “board” orientation without clutter. */
export default function DashboardHubNav({ profile }: { profile: CampaignProfile | null }) {
  const { pathname } = useLocation()
  const role = String(profile?.primary_role ?? '').toLowerCase()

  const isCoord =
    role.includes('coordinator') ||
    role.includes('manager') ||
    role.includes('campaign')

  const linkClass = (to: string, home?: boolean) =>
    `dashboard-hub-nav__link ${
      (home ? pathname === '/' || pathname === '/dashboard' : pathname === to || pathname.startsWith(`${to}/`))
        ? 'dashboard-hub-nav__link--active'
        : ''
    }`

  return (
    <nav className="dashboard-hub-nav" aria-label="Campaign workspaces">
      <span className="dashboard-hub-nav__label">Go to</span>
      <Link className={linkClass('/dashboard', true)} to="/dashboard">
        Home
      </Link>
      <Link className={linkClass('/events')} to="/events">
        Events
      </Link>
      <Link className={linkClass('/volunteers/me')} to="/volunteers/me">
        Volunteer hub
      </Link>
      {isCoord ? (
        <Link className={linkClass('/coordinator')} to="/coordinator">
          Coordinator
        </Link>
      ) : null}
      <Link className={linkClass('/power5')} to="/power5">
        Power of 5
      </Link>
      <Link className={linkClass('/admin')} to="/admin">
        Admin / boards
      </Link>
    </nav>
  )
}
